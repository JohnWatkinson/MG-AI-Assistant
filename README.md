# MaisonGuida AI Assistant

This is a chatbot for the [MaisonGuida](https://maisonguida.com) website.

## Project Overview

The MaisonGuida AI Assistant is an intelligent chatbot that provides accurate information about products and brand details. Built with Node.js (backend) and React (frontend), it uses semantic search with embeddings to efficiently retrieve relevant information before generating responses.

## Key Components

- **AI Models:**
  - GPT-3.5-turbo for generating natural responses
  - text-embedding-ada-002 for semantic search capabilities
- **Vector Search System:** Custom implementation using OpenAI embeddings with cosine similarity
- **Data Sources:** JSON files stored in Google Drive for easy updates:
  - Product catalog with details and pricing
  - Website pages with brand information and policies

This architecture enables the chatbot to:
1. Convert all content into embeddings for efficient semantic search
2. Find the most relevant information for each query
3. Generate accurate, context-aware responses
4. Scale efficiently with growing content

## Technical Architecture

### Backend (`/src`)

- **Server (`server.js`):**
  - Express server handling chat requests
  - Integration with OpenAI API
  - Google Drive API for data fetching

- **Vector Store (`vectorStore.js`):**
  - Manages document embeddings
  - Implements semantic search using cosine similarity
  - Caches embeddings to disk for efficiency

### Frontend (`/chatbot-ui`)

- **React Components:**
  - `App.js`: Main chat interface
  - `index.js`: Application entry point

## Environment Configuration

Configure the following in your `.env` file:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key

# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Google Drive JSON Files
PAGES_JSON_ID=your_pages_json_file_id
PRODUCTS_JSON_ID=your_products_json_file_id

# Environment
NODE_ENV=development  # or production
```

## Setup and Installation

### Prerequisites

1. Node.js and npm installed
2. Google Cloud project with Drive API enabled
3. OpenAI API key
4. Google Drive JSON files for content

### Installation

```bash
# Install dependencies
npm install

# Create necessary directories
mkdir -p data/chromadb
```

### Google Drive Setup

1. Create a service account in Google Cloud Console
2. Download the credentials JSON file
3. Share your content JSON files with the service account email
4. Update `.env` with the file IDs

## Running the Application

### Development

1. Start the backend:
   ```bash
   cd Code
   node src/server.js
   ```
   Server runs at `http://localhost:3001`

2. Start the frontend:
   ```bash
   cd chatbot-ui
   npm start
   ```

### Production

- Backend: Deployed on Railway
- Frontend: Deployed on Vercel

## Testing

### API Testing

Test locally:
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What products do you sell?"}'
```

Test production:
```bash
curl -X POST https://mg-ai-assistant-production.up.railway.app/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What products do you sell?"}'
```

## How It Works

1. **Data Loading:**
   - Fetches pages and products data from Google Drive JSON files
   - Converts content into embeddings using OpenAI's API
   - Caches embeddings locally for efficiency

2. **Query Processing:**
   - Converts user query into embeddings
   - Performs semantic search using cosine similarity
   - Retrieves most relevant content

3. **Response Generation:**
   - Uses GPT-3.5-turbo with relevant context
   - Provides accurate, context-aware responses
   - Includes product details, prices, and URLs

## Deployment

### Railway (Backend)

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy the application

### Vercel (Frontend)

1. Import from Git repository
2. Configure environment variables
3. Deploy the frontend

Ensure all environment variables are properly set in both Railway and Vercel dashboards.
https://mg-ai-assistant.vercel.app
