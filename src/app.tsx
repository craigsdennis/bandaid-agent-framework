import { useAgent } from "@cloudflare/agents/react";
import { useState } from "react";

interface Message {
  text: string;
  isUser: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const agent = useAgent({
    agent: "my-agent",
    onMessage: (message) => {
      setMessages((prev) => [
        ...prev,
        { text: message.data as string, isUser: false },
      ]);
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setInput("");
    setIsLoading(true);
    agent.send(userMessage);
  };

  return (
    <div className="min-h-screen">
      <div className="chat-container">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${
              message.isUser ? "user-message" : "agent-message"
            }`}
          >
            {message.text}
          </div>
        ))}
        {isLoading && <div className="message agent-message">Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
            disabled={isLoading}
          />
          <button type="submit" className="send-button" disabled={isLoading}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
