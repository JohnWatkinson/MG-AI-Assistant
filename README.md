# MaisonGuida AI Assistant

This is a chatbot for the [MaisonGuida](https://www.maisonguida.com) website.

## Project Overview

The MaisonGuida AI Assistant is an intelligent chatbot that provides accurate information about products, brand details, and shop information. Built with Node.js (backend) and React (frontend), it uses semantic search with embeddings to efficiently retrieve relevant information before generating responses.

## Key Components

- **AI Models:**
  - GPT-3.5-turbo for generating natural responses
  - text-embedding-ada-002 for semantic search capabilities
- **Vector Search System:** Custom implementation using OpenAI embeddings with cosine similarity
- **Data Sources:** Local JSON files with markdown formatting:
  - `mg_site_pages_en.json`: Brand information, policies, shop hours, and contact details
  - `mg_site_products_en.json`: Product catalog with details and pricing

This architecture enables the chatbot to:

1. Convert all content into embeddings for efficient semantic search
2. Find the most relevant information for each query using vector similarity
3. Generate accurate, context-aware responses based on markdown-formatted content
4. Scale efficiently with growing content while maintaining fast response times

## Technical Architecture

### Backend (`/src`)

- **Server (`server.js`):**

  - Express server handling chat requests
  - Integration with OpenAI API
  - Vector store for efficient semantic search

- **Vector Store (`vectorStore.js`):**
  - Manages document embeddings
  - Implements semantic search using cosine similarity
  - Caches embeddings to disk for efficiency

### Frontend (`/chatbot-ui`)

- **React Components:**
  - `App.js`: Main chat interface
  - `index.js`: Application entry point
  - `widget.js`: Embeddable widget entry point

### Embedding Options

The chatbot can be embedded in two ways:

1. **Direct React Integration**
   - Import and use the React components directly
   - Best for React-based websites

2. **Widget Script (Recommended)**
   - Add a simple script tag to any website
   - Handles all initialization and styling
   - Prevents event propagation issues
   - Responsive design with mobile optimization

```html
<!-- MG AI Assistant Chatbot -->
<script type="text/javascript">
  (function(d, t) {
    var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
    v.onload = function() {
      if (window.MGChatWidget && typeof window.MGChatWidget.load === 'function') {
        window.MGChatWidget.load({});
      }
    };
    v.src = "https://mg-ai-assistant.vercel.app/widget.js";
    v.type = "text/javascript";
    s.parentNode.insertBefore(v, s);
  })(document, 'script');
</script>
```

#### Mobile Optimization

The widget is optimized for mobile devices with:
- Responsive sizing (85% viewport width, 75% viewport height)
- Adjusted positioning to avoid overlapping with cookie notices
- Touch-friendly interface
- Proper event handling on mobile browsers

## Data Structure

The chatbot uses a simple data structure:

```
/data
  /json              # Source JSON files
    mg_site_pages_en.json   # Website pages, policies, and shop information
    mg_site_products_en.json # Product catalog
  /embeddings        # Generated embeddings
    pages_embeddings.json    # Vector embeddings for pages
    products_embeddings.json # Vector embeddings for products
```

### JSON Files Format

#### Pages (mg_site_pages_en.json)

```json
[
  {
    "title": "About Us",
    "url": "https://www.maisonguida.com/about-us",
    "meta_description": "Learn about our sustainable fashion brand",
    "meta_keywords": "sustainable, luxury, fashion",
    "main_content": "## About Us\n\nMaison Guida is a sustainable luxury fashion brand..."
  },
  {
    "title": "Additional Information | Maison Guida",
    "url": "https://www.maisonguida.com/shop-hours",
    "meta_description": "Visit our shop in Turin - Atelier Guida Design",
    "meta_keywords": "shop hours, store location",
    "main_content": "## Shop Information\n\n### Opening Hours\n- Monday: Closed\n- Tuesday: 16:00-20:00..."
  }
]
```

#### Products (mg_site_products_en.json)

```json
[
  {
    "title": "Silk Dress",
    "url": "https://www.maisonguida.com/products/silk-dress",
    "description": "Elegant silk dress made with sustainable materials",
    "price": 259
  }
]
```

Note: The content in the JSON files should use markdown formatting for better structure and readability.

## Setup and Running

1. Install dependencies:

```bash
npm install
```

2. Set up the directory structure:

```bash
node src/utils/setup_directories.js
```

3. Configure environment variables:

```bash
node src/utils/update_env.js
```

4. Generate embeddings from JSON data:

```bash
node src/utils/generate_embeddings.js
```

5. Start the server:

```bash
npm start
```

## Environment Variables

The following environment variables are required by the application:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key    # OpenAI API key for GPT and embeddings

# Optional
NODE_ENV=development                   # 'development' or 'production'
PORT=3002                             # Backend server port
```

You can set these in a `.env` file at the root of the project. The `update_env.js` utility script can help you set up your environment.

**Note:** After changing the JSON source files, you must regenerate embeddings using:
```bash
node src/utils/generate_embeddings.js
```

## Quick Start

To start the MaisonGuida AI Assistant:

```bash
# Start both backend and frontend with default settings
./run_chatbot.py

# Start only the backend
./run_chatbot.py --backend-only

# Start only the frontend
./run_chatbot.py --frontend-only

# Use custom ports
./run_chatbot.py --port-backend=3005 --port-frontend=3006

# Enable debug logging
./run_chatbot.py --debug
```

The runner script automatically:

- Loads environment variables from the .env file
- Sets up the correct Google credentials
- Starts both services in the correct order
- Provides clean logging output
- Handles graceful shutdown of all processes

## Deployment

### Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Configure environment variables:

```env
# Required Variables
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
PORT=3000
```

4. Deploy the project

### API Endpoints

- `POST /api/chat`: Main chat endpoint

```json
{
  "message": "What products do you sell?"
}
```

- `GET /status`: Health check and system status

```json
{
  "status": "healthy",
  "vectorStore": "initialized",
  "collections": {
    "pages": { "documents": 27, "embeddings": 27 },
    "products": { "documents": 40, "embeddings": 40 }
  }
}
```

- `GET /health`: Basic health check endpoint

## Setup and Installation

### Prerequisites

1. Node.js and npm installed
2. OpenAI API key
3. Local JSON files for content

### Installation

```bash
# Install dependencies
npm install

# Create necessary directories
mkdir -p data/chromadb
```

## Running the Application

### Development

1. Start the backend:

```bash
cd Code
node src/server.js
```

Server runs at `http://localhost:3002`

2. Start the frontend:

```bash
cd chatbot-ui
npm start
```

### Production

- Backend: Deployed on Railway
- Frontend: Deployed on Vercel

## Testing

To quickly test if the backend is working correctly without starting the frontend:

```bash
# Start the backend only
./run_chatbot.py --backend-only

# In another terminal, run the test script
./test_chatbot.py

# Test with a custom message
./test_chatbot.py --message "Do you have any sustainable clothing?"

# Test with a custom port (if you changed the backend port)
./test_chatbot.py --port 3005
```

The test script will send a request to the backend API and display the response, allowing you to verify that:

1. The backend server is running correctly
2. The OpenAI API connection is working
3. The vector store is properly initialized
4. The chatbot can generate responses

## Troubleshooting

### Python Virtual Environment Issues

If you're experiencing issues with Python using the wrong interpreter (e.g., pyenv instead of your virtual environment):

```bash
# Fix Python virtual environment
source ./fix_venv.sh
```

This script will:

1. Check if the virtual environment exists and create it if needed
2. Deactivate any current virtual environment
3. Activate the correct project virtual environment
4. Ensure the virtual environment's bin directory is first in your PATH
5. Install required Python packages

After running this script, your Python interpreter should point to the project's virtual environment.

If you're still having issues with pyenv, you may need to temporarily disable it for this project:

```bash
# Temporarily use system Python instead of pyenv
pyenv local system
```

### Data and Embeddings Issues

If the chatbot is not responding correctly or missing information:

1. **Content Not Found**
   - Check that your JSON files are properly formatted with markdown content
   - Ensure URLs in the JSON files are unique (no duplicates)
   - Verify that `main_content` field is present and properly formatted
   - Regenerate embeddings after any changes to JSON files

2. **Updating Content**
   - Edit JSON files in the `data/json` directory
   - Use markdown formatting for content structure
   - Run `node src/utils/generate_embeddings.js` after changes
   - Restart the server to load new embeddings

3. **Embedding Generation Issues**
   - Check OpenAI API key is set correctly
   - Ensure JSON files are valid and properly formatted
   - Look for error messages in the console during generation
   - Try removing and regenerating all embeddings if issues persist

### Common Issues

#### Services Won't Start

If you're having trouble starting the services:

1. Check if Node.js is installed and in your PATH:

```bash
node --version
```

2. Check if npm is installed:

```bash
npm --version
```

3. Make sure all dependencies are installed:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd chatbot-ui && npm install
```

4. Try starting each service manually:

```bash
# Start backend
node src/server.js

# Start frontend (in a separate terminal)
cd chatbot-ui && npm start
```

## How It Works

1. **Data Processing:**

- Loads pages and products data from local JSON files
- Converts content into embeddings using OpenAI's API
- Stores embeddings locally for efficiency

2. **Query Processing:**

- Converts user query into embeddings
- Performs semantic search using cosine similarity
- Retrieves most relevant content

3. **Response Generation:**

- Uses GPT-3.5-turbo with relevant context
- Provides accurate, context-aware responses
- Includes product details, prices, and URLs

## Deployment

### Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Configure environment variables:

```env
# Required Variables
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
PORT=3000
```

4. Deploy the project

https://mg-ai-assistant.vercel.app
