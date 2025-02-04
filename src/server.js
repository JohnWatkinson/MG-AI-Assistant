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
let auth;
if (process.env.NODE_ENV === "production") {
  // Use base64 encoded credentials in production
  auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        "base64"
      ).toString("utf-8")
    ),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
} else {
  // Use local file path in development
  auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const sheets = google.sheets({ version: "v4", auth });

// Initialize Notion API client
console.log(
  "NOTION_API_TOKEN:",
  Buffer.from(process.env.NOTION_API_TOKEN, "base64").toString("utf-8")
);
let notionApiToken;
if (process.env.NODE_ENV === "production") {
  notionApiToken = Buffer.from(process.env.NOTION_API_TOKEN, "base64").toString(
    "utf-8"
  );
} else {
  notionApiToken = process.env.NOTION_API_TOKEN;
}
const notion = new Client({ auth: notionApiToken });

// Environment-based decoding for NOTION_DATABASE_ID
let notionDatabaseId;
if (process.env.NODE_ENV === "production") {
  notionDatabaseId = Buffer.from(
    process.env.NOTION_DATABASE_ID,
    "base64"
  ).toString("utf-8");
} else {
  notionDatabaseId = process.env.NOTION_DATABASE_ID;
}

console.log("NOTION_API_TOKEN:", process.env.NOTION_API_TOKEN);
console.log("NOTION_DATABASE_ID:", process.env.NOTION_DATABASE_ID);
console.log(
  "GOOGLE_APPLICATION_CREDENTIALS:",
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

// Chatbot API endpoint
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("Received user message:", userMessage); // Log user message

    // Fetch data from Notion and Google Sheets
    const notionData = await getNotionData(); // Assume this function returns the data
    const googleSheetsData = await getGoogleSheetData(); // Assume this function returns the data

    const knowledgeBase = `
### Notion Data:
${JSON.stringify(notionData, null, 2)}

### Google Sheets Data:
${JSON.stringify(googleSheetsData, null, 2)}
`;

    const prompt = `
You are Maison Guida's AI assistant, specializing in answering questions about the brand.

### Context:
Maison Guida is a sustainable luxury fashion brand based in Turin, Italy. It creates timeless designs using ethical materials and does not do sales or discounts.

### Knowledge Base:
${knowledgeBase}  

### User Query:
${userMessage}

### Instructions:
- Use a professional yet friendly tone.
- If a question is outside your knowledge, say: 
  "I'm sorry, but I don't have that information right now."
- Keep responses clear and relevant.

Respond in a concise and informative manner.
`;

    // OpenAI API call
    console.log("Calling OpenAI API..."); // Indicate OpenAI API call
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Or "gpt-3.5-turbo"
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7, // Adjust for more/less creative responses
    });

    console.log(
      "Received response from OpenAI:",
      response.choices[0].message.content
    ); // Log OpenAI response
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    res.status(500).json({ error: "Failed to fetch response from OpenAI" });
  }
});

// Route to handle requests to the root URL
app.get("/", (req, res) => {
  res.send("Welcome to the MG Chatbot API!");
});

// Example: Fetch data from Google Sheets
async function getGoogleSheetData() {
  const client = await auth.getClient();
  const spreadsheetId = "1lHrgYbipQqkgrjICHcdD_0PaQMV58P6xC5jUPcrqSMc";
  const range = "Sheet1!A1:I40";

  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId,
    range,
  });

  return res.data.values;
}

// Example: Fetch data from Notion
async function getNotionData() {
  const response = await notion.databases.query({
    database_id: notionDatabaseId,
  });
  return response.results;
}

// Start the server
app.listen(port, () => {
  console.log(`Chatbot server running on http://localhost:${port}`);
});
