require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chatbot API endpoint
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // OpenAI API call
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Change this if needed
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    res.status(500).json({ error: "Failed to fetch response from OpenAI" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Chatbot server running on http://localhost:${port}`);
});
