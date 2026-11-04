import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import "bootstrap/dist/css/bootstrap.min.css"
import './App.css'
export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)
  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = { role: "user", content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)
    // Add empty assistant message (will fill progressively)
    setMessages((prev) => [
      ...updatedMessages,
      { role: "assistant", content: "" },
    ])
    try {
      const response = await axios.post(
        "https://quiet-sound-e903chatbot.ibrahemyazannajdawi.workers.dev",
        {
          model: "openrouter/free",
          stream: true,
          messages: [
            {
              role: "system",
              content: `
You are a helpful assistant.
- Do NOT explain your formatting
- Do NOT include separators like --8<--
- Always answer the user's question directly
- Use proper Markdown bullet points (-, *, or numbered lists)
`
            },
            ...updatedMessages,
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          responseType: "text",
        }
      )
      console.log(response.data)
      let fullText = ""
      const lines = response.data.split("\n")
      for (let line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "").trim()
          if (data === "[DONE]") {
            break
          }
          const json = JSON.parse(data)
          const token = json.choices?.[0]?.delta?.content
          if (token) {
            fullText += token
          }

        }
      }
      if (fullText) {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1].content = fullText
          return updated
        })
      }
    } catch (err) {
      console.error("Streaming error:", err)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="container py-4">
      <h3 className="text-center mb-4">💬 AI Chatbot (Streaming)</h3>
      {/* CHAT BOX */}
      <div
        className="border rounded p-3 mb-3 shadow-sm bg-white"
        style={{ height: "400px", overflowY: "auto" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`d-flex mb-3 ${msg.role === "user"
              ? "justify-content-end"
              : "justify-content-start"
              }`}
          >
            <div
              className={`p-3 rounded-3 shadow-sm ${msg.role === "user"
                ? "bg-primary text-white"
                : "bg-light"
                }`}
              style={{ maxWidth: "75%", lineHeight: "1.6" }}
            >
              <ReactMarkdown>
                {msg.content || (msg.role === "assistant" ? "..." : "")}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-muted small">🤖 AI is typing...</div>
        )}
        <div ref={chatEndRef} />
      </div>
      {/* INPUT */}
      <div className="input-group">
        <input
          className="form-control"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="btn btn-success"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>)
}