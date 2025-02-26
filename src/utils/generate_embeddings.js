/**
 * Utility script to generate embeddings from JSON data files
 * 
 * This script reads the JSON data files from the data/json directory,
 * generates embeddings using OpenAI's API, and saves them to the 
 * data/embeddings directory.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Directories
const JSON_DIR = path.join(__dirname, '../../data/json');
const EMBEDDINGS_DIR = path.join(__dirname, '../../data/embeddings');

// Ensure directories exist
if (!fs.existsSync(EMBEDDINGS_DIR)) {
  fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
}

/**
 * Generate embeddings for a text using OpenAI's API
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<Array<number>>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Process pages data and generate embeddings
 */
async function processPages() {
  try {
    const pagesPath = path.join(JSON_DIR, 'mg_site_pages_en.json');
    if (!fs.existsSync(pagesPath)) {
      console.error(`File not found: ${pagesPath}`);
      return;
    }

    const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));
    const pagesWithEmbeddings = [];

    console.log(`Processing ${pages.length} pages...`);
    
    for (const page of pages) {
      const textToEmbed = `${page.title} ${page.meta_description || ''} ${page.main_content || ''}`;
      console.log(`Generating embedding for: ${page.title}`);
      
      const embedding = await generateEmbedding(textToEmbed);
      
      pagesWithEmbeddings.push({
        ...page,
        embedding
      });
    }

    const outputPath = path.join(EMBEDDINGS_DIR, 'pages_embeddings.json');
    fs.writeFileSync(outputPath, JSON.stringify(pagesWithEmbeddings, null, 2));
    console.log(`Pages embeddings saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error processing pages:', error);
  }
}

/**
 * Process products data and generate embeddings
 */
async function processProducts() {
  try {
    const productsPath = path.join(JSON_DIR, 'mg_site_products_en.json');
    if (!fs.existsSync(productsPath)) {
      console.error(`File not found: ${productsPath}`);
      return;
    }

    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const productsWithEmbeddings = [];

    console.log(`Processing ${products.length} products...`);
    
    for (const product of products) {
      const textToEmbed = `${product.title} ${product.description || ''}`;
      console.log(`Generating embedding for: ${product.title}`);
      
      const embedding = await generateEmbedding(textToEmbed);
      
      productsWithEmbeddings.push({
        ...product,
        embedding
      });
    }

    const outputPath = path.join(EMBEDDINGS_DIR, 'products_embeddings.json');
    fs.writeFileSync(outputPath, JSON.stringify(productsWithEmbeddings, null, 2));
    console.log(`Products embeddings saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error processing products:', error);
  }
}

/**
 * Main function to run the embedding generation process
 */
async function main() {
  console.log('Starting embedding generation process...');
  
  // Create embeddings directory if it doesn't exist
  if (!fs.existsSync(EMBEDDINGS_DIR)) {
    fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
  }
  
  await processPages();
  await processProducts();
  
  console.log('Embedding generation process completed!');
}

// Run the main function
main().catch(error => {
  console.error('Error in main process:', error);
  process.exit(1);
});
