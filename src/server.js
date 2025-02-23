require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { google } = require("googleapis");
const vectorStore = require('./vectorStore');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3002;

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data', 'chromadb');
fs.mkdir(dataDir, { recursive: true }).catch(console.error);

app.use(express.json());
app.use(cors());

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Drive API client
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.MG_GOOGLE_CREDENTIALS,
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
  ],
});

const drive = google.drive({ version: "v3", auth });

// Initialize vector store on startup
let vectorStoreInitialized = false;
async function initVectorStore() {
  if (!vectorStoreInitialized) {
    await vectorStore.init();
    vectorStoreInitialized = true;
  }
}
initVectorStore().catch(console.error);

// Cache for knowledge base data
let cachedKnowledgeBase = null;
let lastKnowledgeBaseFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Chatbot API endpoint
app.post("/api/chat", async (req, res) => {
  const startTime = Date.now();
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }
    console.log(`[${new Date().toISOString()}] Received user message:`, userMessage);

    // Load knowledge base from cache or fetch if needed
    const now = Date.now();
    if (!cachedKnowledgeBase || (now - lastKnowledgeBaseFetch) > CACHE_TTL) {
      console.log(`[${new Date().toISOString()}] Cache miss - fetching fresh knowledge base data...`);
      try {
        cachedKnowledgeBase = await getKnowledgeBase();
        lastKnowledgeBaseFetch = now;
        console.log(`[${new Date().toISOString()}] Successfully updated knowledge base cache`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching knowledge base:`, error);
        return res.status(500).json({ error: 'Failed to fetch knowledge base data' });
      }
    } else {
      console.log(`[${new Date().toISOString()}] Using cached knowledge base data`);
    }

    // Update vector store if needed
    try {
      if (now - lastKnowledgeBaseFetch <= 1000) { // Only update if we just fetched new data
        console.log(`[${new Date().toISOString()}] Updating vector store...`);
        await vectorStore.updateCollection(cachedKnowledgeBase.pages_en, 'pages');
        await vectorStore.updateCollection(cachedKnowledgeBase.products_en, 'products');
        console.log(`[${new Date().toISOString()}] Vector store updated successfully`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating vector store:`, error);
      return res.status(500).json({ error: 'Failed to update vector store' });
    }
    
    // Search for relevant content
    console.log(`[${new Date().toISOString()}] Searching for relevant content...`);
    let searchResults;
    try {
      searchResults = await vectorStore.search(userMessage, 3);
      console.log(`[${new Date().toISOString()}] Search completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error searching vector store:`, error);
      return res.status(500).json({ error: 'Failed to search for relevant content' });
    }
    
    // Format relevant content for the prompt
    const relevantPages = (searchResults.pages || [])
      .map(doc => `${doc.metadata.title || 'Untitled'}: ${doc.pageContent || ''}`)
      .filter(content => content.trim())
      .join('\n');
    
    const relevantProducts = (searchResults.products || [])
      .map(doc => `${doc.metadata.title || 'Untitled'} (€${doc.metadata.price || 'N/A'}): ${doc.pageContent || ''}`)
      .filter(content => content.trim())
      .join('\n');

    const prompt = `You are Clara, Maison Guida's friendly AI fashion consultant. You help customers discover our sustainable luxury fashion with warmth and expertise, like chatting with a friend who happens to be a fashion expert.

Context about our brand:
Maison Guida is a sustainable luxury fashion brand based in Turin, Italy. We create timeless designs using ethical materials, believing in fair, transparent pricing that reflects the true value of sustainable fashion.

Relevant information for this query:
${relevantPages}
${relevantProducts}

User question: ${userMessage}

Style guide:
Speak naturally as if chatting in our Turin boutique. Avoid bullet points or structured formats like "Product: X, Price: Y". Instead, weave product details, prices (in EUR), and shipping options (France, Germany, Netherlands, Italy, or Torino pickup) into a flowing conversation. Make it feel like a luxury boutique experience.

Example tone:
"Oh, you'll love our dresses! The cocktail dress is a particular favorite - it's beautifully crafted in Italy and priced at €259. Speaking of special pieces, have you seen our tie-dye dress? It's absolutely stunning..."

Keep responses warm, personal, and concise while maintaining professionalism. If unsure about anything, be honest and offer to connect them with our team.`;

    // OpenAI API call
    console.log(`[${new Date().toISOString()}] Calling OpenAI API...`);
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: 300
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('Empty response from OpenAI');
      }

      console.log(`[${new Date().toISOString()}] Received response from OpenAI`);
      const totalTime = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Total request time: ${totalTime}ms`);
      
      res.json({ 
        reply: aiResponse,
        processingTime: totalTime
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error with OpenAI API:`, error);
      res.status(500).json({ 
        error: "Failed to fetch response from OpenAI",
        details: error.message
      });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error:`, error);
    res.status(500).json({ 
      error: "An unexpected error occurred",
      details: error.message
    });
  }
});

// Route to handle requests to the root URL
app.get("/", (req, res) => {
  res.send("Welcome to the MG Chatbot API!");
});

// Example: Fetch data from Google Sheets
async function getKnowledgeBase() {
  const knowledgeBase = {};

  try {
    // Validate environment variables
    if (!process.env.PAGES_JSON_ID) {
      throw new Error("PAGES_JSON_ID environment variable is not set");
    }
    if (!process.env.PRODUCTS_JSON_ID) {
      throw new Error("PRODUCTS_JSON_ID environment variable is not set");
    }

    // File IDs for the JSON files in Google Drive
    const files = [
      {
        id: process.env.PAGES_JSON_ID,
        name: "mg_site_pages_en.json",
        key: "pages_en",
      },
      {
        id: process.env.PRODUCTS_JSON_ID,
        name: "mg_site_products_en.json",
        key: "products_en",
      },
    ];

    // Read each file from Google Drive
    for (const file of files) {
      console.log(`Loading ${file.name} (ID: ${file.id})...`);
      try {
        // First check if we can access the file metadata
        const metaResponse = await drive.files.get({
          fileId: file.id,
          fields: "id, name, mimeType",
        });
        console.log(`File metadata:`, metaResponse.data);

        // Then get the file content
        const response = await drive.files.get(
          {
            fileId: file.id,
            alt: "media",
          },
          { responseType: "json" }
        );

        knowledgeBase[file.key] = response.data;
        console.log(
          `- ${file.name}: Loaded successfully (${
            Array.isArray(response.data)
              ? response.data.length
              : Object.keys(response.data).length
          } entries)`
        );
      } catch (fileError) {
        console.error(`Error loading ${file.name}:`, fileError.message);
        throw new Error(
          `Failed to load ${file.name}. Please check the file ID and permissions.`
        );
      }
    }

    // Validate that we have both required datasets
    if (!knowledgeBase.pages_en || !knowledgeBase.products_en) {
      throw new Error("Missing required knowledge base data");
    }

    return knowledgeBase;
  } catch (error) {
    console.error("Error loading knowledge base:", error.message);
    throw error;
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Chatbot server running on http://localhost:${port}`);
});
