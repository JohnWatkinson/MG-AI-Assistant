import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import "./App.css";

const API_URL = process.env.NODE_ENV === "production"
  ? "https://mg-ai-assistant-production.up.railway.app"
  : "http://localhost:3002";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi, how can I help you? 👋\n\nCiao, come posso aiutarti? 🇮🇹\n\nHola, ¿cómo puedo ayudarte? 🇪🇸\n\nBonjour, comment puis-je vous aider? 🇫🇷\n\nHallo, wie kann ich Ihnen helfen? 🇩🇪'
  }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, { message: input });
      const botMessage = { role: "assistant", content: response.data.reply };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="chat-icon" onClick={() => setIsOpen(true)}>
        <IoChatbubbleEllipsesOutline size={24} />
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>Maison Guida AI Assistant</h2>
        <button className="close-button" onClick={() => setIsOpen(false)}>
          <IoMdClose size={24} />
        </button>
      </div>

      <div className="messages-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role === "user" ? "user" : "assistant"}`}
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
        {isTyping && (
          <div className="message assistant typing">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows="1"
        />
        <button 
          className="send-button" 
          onClick={sendMessage}
          disabled={!input.trim() || isTyping}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
