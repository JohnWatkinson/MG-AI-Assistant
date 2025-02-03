import React, { useState } from "react";
import axios from "axios";

const API_URL = "https://mg-ai-assistant-production.up.railway.app"; // Replace with your backend URL

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);

    try {
      const response = await axios.post(`${API_URL}/chat`, { message: input });
      const botMessage = { role: "assistant", content: response.data.reply };

      setMessages([...messages, userMessage, botMessage]);
      setInput("");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
      <h2>Chatbot</h2>
      <div
        style={{
          border: "1px solid #ddd",
          padding: "10px",
          minHeight: "300px",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              margin: "5px 0",
              textAlign: msg.role === "user" ? "right" : "left",
            }}
          >
            <strong>{msg.role === "user" ? "You" : "Bot"}:</strong>{" "}
            {msg.content}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;
