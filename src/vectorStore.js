const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs').promises;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple vector similarity function
function cosineSimilarity(A, B) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class VectorStore {
  constructor() {
    this.collections = {
      pages: [],
      products: [],
    };
    this.embeddings = {
      pages: [],
      products: [],
    };
  }

  // Initialize collections
  async init() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Try to load existing embeddings
    try {
      const pagesData = await fs.readFile(path.join(dataDir, 'pages_embeddings.json'), 'utf8');
      const productsData = await fs.readFile(path.join(dataDir, 'products_embeddings.json'), 'utf8');
      
      const pages = JSON.parse(pagesData);
      const products = JSON.parse(productsData);
      
      this.collections.pages = pages.documents;
      this.collections.products = products.documents;
      this.embeddings.pages = pages.embeddings;
      this.embeddings.products = products.embeddings;
    } catch (error) {
      console.log('No existing embeddings found, will create new ones when data is added');
    }
  }

  // Prepare documents for embedding
  prepareDocuments(data, type) {
    return data.map(item => {
      let content = '';
      let metadata = {};

      if (type === 'pages') {
        content = `${item.title}\n${item.meta_description}\n${item.content}`;
        metadata = {
          type: 'page',
          url: item.url,
          title: item.title,
          keywords: item.keywords,
        };
      } else if (type === 'products') {
        content = `${item.title}\n${item.description}\nPrice: €${item.price}`;
        metadata = {
          type: 'product',
          url: item.url,
          title: item.title,
          price: item.price,
        };
      }

      return {
        content,
        metadata,
      };
    });
  }

  // Update the vector store with new data
  async updateCollection(data, type) {
    const documents = this.prepareDocuments(data, type);
    
    // Get embeddings for all documents
    const embeddings = [];
    for (const doc of documents) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: doc.content,
      });
      embeddings.push(response.data[0].embedding);
    }

    // Update collections and embeddings
    this.collections[type] = documents;
    this.embeddings[type] = embeddings;

    // Save to disk
    const dataDir = path.join(__dirname, '..', 'data');
    await fs.writeFile(
      path.join(dataDir, `${type}_embeddings.json`),
      JSON.stringify({
        documents: documents,
        embeddings: embeddings,
      }, null, 2)
    );
  }

  // Search across both collections
  async search(query, maxResults = 5) {
    // Get query embedding
    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    const queryEmbedding = queryResponse.data[0].embedding;

    const results = {
      pages: [],
      products: [],
    };

    // Search in both collections
    for (const type of ['pages', 'products']) {
      // Calculate similarities
      const similarities = this.embeddings[type].map((embedding, index) => ({
        similarity: cosineSimilarity(queryEmbedding, embedding),
        document: this.collections[type][index],
      }));

      // Sort by similarity and take top results
      similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults)
        .forEach(item => {
          if (item.similarity > 0.7) { // Only include relevant results
            results[type].push(item.document);
          }
        });
    }

    return results;
  }
}

module.exports = new VectorStore();
