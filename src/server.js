require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { google } = require("googleapis");
const vectorStore = require('./vectorStore');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3001;

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
let auth;
if (process.env.NODE_ENV === "production") {
  auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        "base64"
      ).toString("utf-8")
    ),
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ],
  });
} else {
  auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ],
  });
}

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

// Chatbot API endpoint
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("Received user message:", userMessage);

    // Load knowledge base and update vector store if needed
    const knowledgeBaseData = await getKnowledgeBase();
    
    // Update vector store with latest data
    await vectorStore.updateCollection(knowledgeBaseData.pages_en, 'pages');
    await vectorStore.updateCollection(knowledgeBaseData.products_en, 'products');
    
    // Search for relevant content
    console.log('Searching for relevant content...');
    const searchResults = await vectorStore.search(userMessage, 3);
    
    // Format relevant content for the prompt
    const relevantPages = searchResults.pages
      .map(doc => `Page: ${doc.metadata.title}
URL: ${doc.metadata.url}
${doc.pageContent}`)
      .join('\n\n');
    
    const relevantProducts = searchResults.products
      .map(doc => `Product: ${doc.metadata.title}
URL: ${doc.metadata.url}
Price: €${doc.metadata.price}
${doc.pageContent}`)
      .join('\n\n');

    const prompt = `
You are Maison Guida's AI assistant, specializing in answering questions about the brand.

### Context:
Maison Guida is a sustainable luxury fashion brand based in Turin, Italy. It creates timeless designs using ethical materials and does not do sales or discounts.

### Relevant Pages:
${relevantPages}

### Relevant Products:
${relevantProducts}

### User Query:
${userMessage}

### Instructions:
- Use a professional yet friendly tone
- When answering about products:
  * Include the exact price in EUR
  * Provide the product URL
  * Emphasize sustainable and ethical aspects
  * Mention shipping (France, Germany, Netherlands, Italy, or Torino Store pickup)
- When answering about the brand:
  * Use information from the website pages
  * Focus on our sustainable and ethical commitments
- If information is not in the relevant content, say:
  "I'm sorry, but I don't have that information right now."
- Keep responses clear, relevant, and concise

Respond in a concise and informative manner.
`;

    // OpenAI API call
    console.log("Calling OpenAI API..."); // Indicate OpenAI API call
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using GPT-3.5 due to token limits
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7, // Adjust for more/less creative responses
    });

    console.log(
      "Received response from OpenAI:",
      response.choices[0].message.content
    ); // Log OpenAI response
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    res.status(500).json({ error: "Failed to fetch response from OpenAI" });
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
