require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { google } = require("googleapis");
const { Client } = require("@notionhq/client");

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Sheets API client
const sheets = google.sheets("v4");

// Initialize Notion API client
const notion = new Client({ auth: process.env.NOTION_TOKEN });

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

// Example: Fetch data from Google Sheets
async function getGoogleSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Get keyFile from .env
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  const spreadsheetId = "1lHrgYbipQqkgrjICHcdD_0PaQMV58P6xC5jUPcrqSMc";
  const range = "Sheet1!A1:I40";

  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId,
    range,
  });

  console.log(res.data.values);
}

// Example: Fetch data from Notion
async function getNotionData() {
  const databaseId = process.env.NOTION_DATABASE_ID; // Get databaseId from .env
  const response = await notion.databases.query({ database_id: databaseId });
  console.log(response.results);
}

getGoogleSheetData();
getNotionData();

// Start the server
app.listen(port, () => {
  console.log(`Chatbot server running on http://localhost:${port}`);
});
