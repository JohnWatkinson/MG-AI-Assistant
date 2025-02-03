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

## Installation

To install the necessary dependencies, run:

```bash
npm install
```

## Running the Application

To start the development server for the frontend:

```bash
cd chatbot-ui
npm start
```

To run the backend server:

```bash
node src/server.js
```

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
