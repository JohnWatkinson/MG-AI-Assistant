# MaisonGuida AI Assistant

This is a chatbot for the [MaisonGuida](https://maisonguida.com) website.

## Project Overview

The MaisonGuida AI Assistant is a chatbot that integrates FAQs, product data from Google Sheets, and AI responses to provide users with accurate and efficient information. The project is built using a combination of Node.js for the backend and React for the frontend, hosted on Railway.

## Key Components

- **Primary AI Model:** GPT-4o (OpenAI) for generating responses.
- **Search System:** OpenAI Embeddings or FAISS for retrieving FAQ/product info.
- **Data Storage:** Google Sheets (Products) + Notion (FAQs).

This setup allows the chatbot to search for relevant information before querying GPT, optimizing API costs and improving response accuracy.

## Frontend

The frontend is built using React and is located in the `chatbot-ui` directory. Key files include:

- `App.js`: Main React component handling the chat interface.
- `index.js`: Entry point for the React application.

## Backend

The backend server is built with Node.js and Express, located in the `src` directory. It handles API requests and integrates with external services.

## Environment Configuration

The application uses environment variables to manage different configurations for local and production environments. Ensure the following variables are set in your `.env` file:

- `OPENAI_API_KEY`: Your OpenAI API key.
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your Google credentials JSON file.
- `NOTION_API_TOKEN`: Your Notion API token.
- `NOTION_DATABASE_ID`: Your Notion database ID.

## Installation

To install the necessary dependencies, run:

```bash
npm install
```

## Running the Application

To start both the backend and frontend servers:

### Starting the Backend

1. Open a terminal and navigate to the `Code` directory where your `server.js` file is located.
2. Run the command:
   ```bash
   node src/server.js
   ```
   This starts the backend server, accessible at `http://localhost:3001`.

### Starting the Frontend

1. Open a new terminal window or tab.
2. Navigate to the `chatbot-ui` directory.
3. Ensure `NODE_ENV` is set to `development` for local testing:
   ```bash
   export NODE_ENV=development
   ```
4. Run the command:
   ```bash
   npm start
   ```
   This starts the frontend server and opens the application in your default web browser.

### Switching Environments

The application dynamically selects the API URL based on the `NODE_ENV` environment variable:

- Set `NODE_ENV=development` for local testing.
- Set `NODE_ENV=production` for production deployment on Railway.

## Testing the Chat API

You can test the chat API using the following curl command:

```bash
curl -X POST http://localhost:3001/chat -H "Content-Type: application/json" -d '{"message": "Hello!"}'
```

Alternatively, you can also test the chat API on the deployed application:

```bash
curl -X POST https://mg-ai-assistant-production.up.railway.app/chat -H "Content-Type: application/json" -d '{"message": "Hello!"}'
```

## Deployment

The application is deployed using Railway. Ensure your environment variables are set correctly in the `.env` file.

## Deployment Status

The frontend application has been successfully deployed on Vercel. You can access the live version of the chatbot using the URL provided by Vercel. Ensure that all necessary environment variables are correctly configured in the Vercel dashboard to maintain functionality.

For any updates or changes, redeploy using the Vercel CLI as needed.
https://mg-ai-assistant.vercel.app
