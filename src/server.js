require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const vectorStore = require('./vectorStore');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3002;

// Configure logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Log startup information
log('=== Server Starting ===');
log(`Node Environment: ${process.env.NODE_ENV}`);
log(`Port: ${port}`);
log(`Current Directory: ${process.cwd()}`);

// Ensure data directories exist
const jsonDir = path.join(__dirname, '..', 'data', 'json');
const embeddingsDir = path.join(__dirname, '..', 'data', 'embeddings');

Promise.all([
  fs.mkdir(jsonDir, { recursive: true }),
  fs.mkdir(embeddingsDir, { recursive: true })
])
  .then(() => log(`Created/verified data directories`))
  .catch(err => log(`Error creating data directories: ${err.message}`));

app.use(express.json());
app.use(cors());

log('Middleware configured');

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Async initialization that won't block server startup
log('Scheduling vector store initialization...');

setTimeout(async () => {
  try {
    log('Initializing vector store...');
    await vectorStore.init();
    log('Vector store initialized');
    
    // Load knowledge base data
    const knowledgeBase = await getKnowledgeBase();
    
    // Update vector store with knowledge base data
    if (knowledgeBase.pages_en) {
      await vectorStore.updateCollection(knowledgeBase.pages_en, 'pages');
    }
    if (knowledgeBase.products_en) {
      await vectorStore.updateCollection(knowledgeBase.products_en, 'products');
    }
    
    log('Knowledge base loaded and vector store updated');
  } catch (error) {
    log(`Error during initialization: ${error.message}`);
  }
}, 1000);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    log(`Received chat request: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Search for relevant context
    const searchResults = await vectorStore.search(message, 5);
    
    // Format context for the prompt
    const pagesContext = searchResults.pages.map(result => {
      return `Page: ${result.metadata.title}\nURL: ${result.metadata.url}\nContent: ${result.content}`;
    });
    
    const productsContext = searchResults.products.map(result => {
      return `Product: ${result.metadata.title}\nURL: ${result.metadata.url}\nPrice: €${result.metadata.price}\nDescription: ${result.content}`;
    });
    
    const context = [...pagesContext, ...productsContext];

    // Create system prompt
    const systemPrompt = `You are an AI assistant for Maison Guida, a luxury fashion brand based in Italy. 
You help customers with information about our products, brand, services, and contact details.

Use the following information to answer the user's question:
${context}

For contact information queries:
- Always check for and share both phone and WhatsApp numbers if available
- Clearly label each contact method (e.g. "WhatsApp:", "Phone:", "Email:")
- If a specific contact method is asked for but not found, suggest alternative contact methods

If the information provided doesn't contain the answer, respond based on these guidelines:

- Maison Guida is a luxury fashion brand founded in Italy
- We specialize in handcrafted, sustainable luxury clothing
- Our products are made with high-quality materials and traditional craftsmanship
- We offer worldwide shipping
- For specific product inquiries not covered in the context, suggest browsing our website or contacting our customer service

Example response style:
"I'd love to tell you about our dresses! The cocktail dress is a particular favorite - it's beautifully crafted in Italy and priced at €259. Each piece embodies our commitment to sustainable luxury fashion..."

Keep responses warm, personal, and concise while maintaining professionalism. If unsure about anything, be honest and offer to connect them with our team.`;

    // OpenAI API call
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const reply = completion.choices[0].message.content;
    log(`Generated response: "${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}"`);
    
    res.json({
      reply,
      sources: searchResults.pages.concat(searchResults.products).map(result => ({
        title: result.metadata.title,
        url: result.metadata.url,
        type: result.metadata.type,
      })),
    });
  } catch (error) {
    log(`Error in chat endpoint: ${error.message}`);
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

// Status endpoint
app.get("/api/status", async (req, res) => {
  try {
    const status = await vectorStore.getCollectionsStatus();
    res.json(status);
  } catch (error) {
    log(`Error in status endpoint: ${error.message}`);
    res.status(500).json({ error: "An error occurred while checking status" });
  }
});

// Get knowledge base from local JSON files
async function getKnowledgeBase() {
  const knowledgeBase = {};

  try {
    const jsonDir = path.join(__dirname, '..', 'data', 'json');
    
    // Check if directory exists
    try {
      await fs.access(jsonDir);
    } catch (err) {
      log(`Creating JSON directory: ${jsonDir}`);
      await fs.mkdir(jsonDir, { recursive: true });
    }
    
    // Define the files to load
    const files = [
      { name: "mg_site_pages_en.json", key: "pages_en" },
      { name: "mg_site_products_en.json", key: "products_en" },
    ];
    
    // Read each file from the json directory
    for (const file of files) {
      const filePath = path.join(jsonDir, file.name);
      
      try {
        // Check if file exists
        await fs.access(filePath);
        
        // Read and parse the file
        const data = await fs.readFile(filePath, 'utf8');
        knowledgeBase[file.key] = JSON.parse(data);
        
        log(`Loaded ${file.name} successfully (${
          Array.isArray(knowledgeBase[file.key])
            ? knowledgeBase[file.key].length
            : Object.keys(knowledgeBase[file.key]).length
        } entries)`);
      } catch (fileError) {
        log(`Warning: ${file.name} not found or invalid. Using empty array.`);
        knowledgeBase[file.key] = [];
      }
    }
    
    return knowledgeBase;
  } catch (error) {
    log(`Error loading knowledge base: ${error.message}`);
    // Return empty knowledge base rather than failing
    return { pages_en: [], products_en: [] };
  }
}

// Basic error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
  log(`Server listening on port ${port}`);
  log(`API available at: http://localhost:${port}/api/chat`);
  log(`Health check: http://localhost:${port}/health`);
});
