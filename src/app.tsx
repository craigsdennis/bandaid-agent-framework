import { useAgent } from "@cloudflare/agents/react";
import { useState } from "react";

// interface Message {
//   text: string;
//   isUser: boolean;
// }

interface Poster {
  imageUrl: string;
  slug: string;
}

export default function App() {
  const [result, setResult] = useState<string>("");
  const [posters, setPosters] = useState<Poster[]>([]);

  const agent = useAgent({
    agent: "orchestrator",
    name: "main",
    onOpen(event) {
      console.log("Agent opening");
    },
    onMessage: (message) => {
      console.log("Message received");
      setResult(message.data);
    },
    onStateUpdate: (state: { posters: Poster[] }, source) => {
      console.log("State updated");
      setPosters(state.posters);
    },
  });

  const debugOrchestratorState = (e: React.FormEvent) => {
    e.preventDefault();
    agent.send("state.debug");
  };
  const deleteAllPosters = (e: React.FormEvent) => {
    e.preventDefault();
    agent.send("delete.posters");
  };

  return (
    <div>
      <h1>Look at the console, nerd 🤓</h1>
      {posters.map((poster) => (
        <div key={poster.slug}>
          <img src={poster.imageUrl} />
        </div>
      ))}
      <div>
        Latest message: <code>{result}</code>
      </div>
      <form>
        <button onClick={debugOrchestratorState}>
          Debug Orchestrator State
        </button>
        <button onClick={deleteAllPosters}>Delete All Posters</button>
      </form>
    </div>
  );
}
