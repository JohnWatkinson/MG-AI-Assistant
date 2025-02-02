# MaisonGuida AI Assistant

This is a chatbot for the [MaisonGuida](https://maisonguida.com) website.

🚀 Which Model Should You Use?
Since your chatbot handles FAQs + product data from Google Sheets + AI responses, the best setup is:

✅ Primary AI Model: GPT-4o (OpenAI) for generating responses
✅ Search System: OpenAI Embeddings or FAISS for retrieving FAQ/product info
✅ Data Storage: Google Sheets (Products) + Notion (FAQs)

This way, the chatbot searches for relevant info first before sending a user’s query to GPT, saving API costs & improving accuracy. 🚀

Github
Railway

Test Your Chat API
node src/server.js
curl -X POST http://localhost:3001/chat -H "Content-Type: application/json" -d '{"message": "Hello!"}'
