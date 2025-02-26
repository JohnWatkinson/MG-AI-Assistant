const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Initialize OpenAI client with retry logic
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

// Optimized vector similarity using Float32Array for better performance
function cosineSimilarity(A, B) {
  const a = new Float32Array(A);
  const b = new Float32Array(B);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  // Use loop unrolling for better performance
  const len = a.length;
  const step = 4;
  let i = 0;
  
  for (; i < len - step; i += step) {
    dotProduct += a[i] * b[i] + a[i + 1] * b[i + 1] + a[i + 2] * b[i + 2] + a[i + 3] * b[i + 3];
    normA += a[i] * a[i] + a[i + 1] * a[i + 1] + a[i + 2] * a[i + 2] + a[i + 3] * a[i + 3];
    normB += b[i] * b[i] + b[i + 1] * b[i + 1] + b[i + 2] * b[i + 2] + b[i + 3] * b[i + 3];
  }
  
  // Handle remaining elements
  for (; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Cache embeddings in memory with LRU-like behavior
class EmbeddingCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  getKey(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  get(text) {
    const key = this.getKey(text);
    const item = this.cache.get(key);
    if (item) {
      // Update access time
      item.lastAccessed = Date.now();
      return item.embedding;
    }
    return null;
  }

  set(text, embedding) {
    const key = this.getKey(text);
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used item
      let oldest = Date.now();
      let oldestKey;
      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccessed < oldest) {
          oldest = v.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      embedding,
      lastAccessed: Date.now()
    });
  }
}

// Initialize embedding cache
const embeddingCache = new EmbeddingCache();

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
    this.lastUpdateTime = {
      pages: 0,
      products: 0,
    };
    this.batchSize = 20; // Number of embeddings to process in parallel
  }

  // Initialize collections
  async init() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    const embeddingsDir = path.join(dataDir, 'embeddings');
    await fs.mkdir(embeddingsDir, { recursive: true });

    // Try to load existing embeddings
    try {
      const pagesData = await fs.readFile(path.join(embeddingsDir, 'pages_embeddings.json'), 'utf8');
      const productsData = await fs.readFile(path.join(embeddingsDir, 'products_embeddings.json'), 'utf8');
      
      const pages = JSON.parse(pagesData);
      const products = JSON.parse(productsData);
      
      this.collections.pages = pages.map(item => ({
        content: `${item.title}\n${item.meta_description || ''}\n${item.content || ''}`,
        metadata: {
          type: 'page',
          url: item.url,
          title: item.title,
          keywords: item.keywords || '',
        }
      }));
      
      this.collections.products = products.map(item => ({
        content: `${item.title}\n${item.description || ''}\nPrice: €${item.price}`,
        metadata: {
          type: 'product',
          url: item.url,
          title: item.title,
          price: item.price,
        }
      }));
      
      this.embeddings.pages = pages.map(item => item.embedding);
      this.embeddings.products = products.map(item => item.embedding);
      
      console.log(`Loaded ${this.collections.pages.length} pages and ${this.collections.products.length} products from embeddings files`);
    } catch (error) {
      console.log('No existing embeddings found or error loading them:', error.message);
      console.log('Will create new embeddings when data is added');
      
      // Try to load from JSON files and generate embeddings
      try {
        const jsonDir = path.join(dataDir, 'json');
        const pagesPath = path.join(jsonDir, 'mg_site_pages_en.json');
        const productsPath = path.join(jsonDir, 'mg_site_products_en.json');
        
        // Check if files exist
        try {
          await fs.access(pagesPath);
          await fs.access(productsPath);
          
          // Load and process JSON files
          const pagesJson = JSON.parse(await fs.readFile(pagesPath, 'utf8'));
          const productsJson = JSON.parse(await fs.readFile(productsPath, 'utf8'));
          
          console.log(`Found JSON files. Processing ${pagesJson.length} pages and ${productsJson.length} products...`);
          
          // Update collections with the data
          await this.updateCollection(pagesJson, 'pages');
          await this.updateCollection(productsJson, 'products');
          
          console.log('Initial embedding generation complete');
        } catch (fileError) {
          console.log('JSON files not found or cannot be accessed:', fileError.message);
        }
      } catch (jsonError) {
        console.log('Error processing JSON files:', jsonError.message);
      }
    }
  }

  // Prepare documents for embedding
  prepareDocuments(data, type) {
    return data.map(item => {
      let content = '';
      let metadata = {};

      if (type === 'pages') {
        content = `${item.title}\n${item.meta_description || ''}\n${item.main_content || item.content || ''}`;
        metadata = {
          type: 'page',
          url: item.url,
          title: item.title,
          keywords: item.keywords || '',
        };
      } else if (type === 'products') {
        content = `${item.title}\n${item.description || ''}\nPrice: €${item.price}`;
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
    console.log(`[${new Date().toISOString()}] Starting collection update for ${type}`);
    const startTime = Date.now();
    
    // Check if update is needed
    const dataHash = crypto.createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    
    if (this.lastUpdateTime[type] && this.lastUpdateTime[type] === dataHash) {
      console.log(`[${new Date().toISOString()}] No changes detected in ${type} data, skipping update`);
      return;
    }

    const documents = this.prepareDocuments(data, type);
    const embeddings = [];
    const batchPromises = [];
    
    // Process documents in batches
    for (let i = 0; i < documents.length; i += this.batchSize) {
      const batch = documents.slice(i, i + this.batchSize);
      const batchContents = batch.map(doc => doc.content);
      
      // Check cache first
      const batchEmbeddings = [];
      const uncachedIndices = [];
      const uncachedContents = [];
      
      batchContents.forEach((content, index) => {
        const cached = embeddingCache.get(content);
        if (cached) {
          batchEmbeddings[index] = cached;
        } else {
          uncachedIndices.push(index);
          uncachedContents.push(content);
        }
      });
      
      if (uncachedContents.length > 0) {
        batchPromises.push(
          openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: uncachedContents,
          }).then(response => {
            response.data.forEach((item, index) => {
              const batchIndex = uncachedIndices[index];
              batchEmbeddings[batchIndex] = item.embedding;
              embeddingCache.set(batchContents[batchIndex], item.embedding);
            });
            return batchEmbeddings;
          })
        );
      } else {
        batchPromises.push(Promise.resolve(batchEmbeddings));
      }
    }

    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults.flat());

    // Update collections
    this.collections[type] = documents;
    this.embeddings[type] = embeddings;
    this.lastUpdateTime[type] = dataHash;

    // Save to disk asynchronously
    const dataDir = path.join(__dirname, '..', 'data');
    const embeddingsDir = path.join(dataDir, 'embeddings');
    await fs.mkdir(embeddingsDir, { recursive: true });
    
    fs.writeFile(
      path.join(embeddingsDir, `${type}_embeddings.json`),
      JSON.stringify({
        documents: documents,
        embeddings: embeddings,
        dataHash: dataHash,
        lastUpdateTime: this.lastUpdateTime[type],
      }, null, 2)
    ).catch(err => console.error(`Error saving ${type} embeddings:`, err));

    console.log(`[${new Date().toISOString()}] Collection update completed for ${type} in ${Date.now() - startTime}ms`);
  }

  // Search across both collections
  // Get status of collections
  getCollectionsStatus() {
    return {
      pages: {
        documents: this.collections.pages.length,
        embeddings: this.embeddings.pages.length,
        lastUpdate: this.lastUpdateTime.pages
      },
      products: {
        documents: this.collections.products.length,
        embeddings: this.embeddings.products.length,
        lastUpdate: this.lastUpdateTime.products
      }
    };
  }

  async search(query, maxResults = 5) {
    console.log(`[${new Date().toISOString()}] Starting search for query: ${query}`);
    const startTime = Date.now();

    // Check cache for query embedding
    let queryEmbedding = embeddingCache.get(query);
    if (!queryEmbedding) {
      const queryResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });
      queryEmbedding = queryResponse.data[0].embedding;
      embeddingCache.set(query, queryEmbedding);
    }

    const results = {
      pages: [],
      products: [],
    };

    // Search in both collections using parallel processing
    await Promise.all(['pages', 'products'].map(async type => {
      // Skip if collection is empty
      if (this.embeddings[type].length === 0) return;

      // Calculate similarities in chunks for better memory usage
      const chunkSize = 100;
      const similarities = [];
      
      for (let i = 0; i < this.embeddings[type].length; i += chunkSize) {
        const chunk = this.embeddings[type].slice(i, i + chunkSize);
        const chunkSimilarities = chunk.map((embedding, index) => {
          const docIndex = i + index;
          const similarity = cosineSimilarity(queryEmbedding, embedding);
          return { similarity, index: docIndex };
        });
        similarities.push(...chunkSimilarities);
      }

      // Use partial sort for better performance with large datasets
      const topK = similarities
        .filter(item => item.similarity > 0.5) // Pre-filter to reduce sorting load
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      // Get documents for top similarities
      results[type] = topK.map(item => this.collections[type][item.index]).filter(Boolean);
    }));

    console.log(`[${new Date().toISOString()}] Search completed in ${Date.now() - startTime}ms`);
    return results;
  }
}

module.exports = new VectorStore();
