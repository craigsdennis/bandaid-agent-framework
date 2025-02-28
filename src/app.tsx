import { useAgent } from "agents-sdk/react";
import { useState } from "react";
import type { OrchestratorState, PosterSummary } from "./agents/orchestrator";
import Layout from "./front-end/Layout";

export default function App() {
  const [result, setResult] = useState<string>("");
  const [posters, setPosters] = useState<PosterSummary[]>([]);

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
    onStateUpdate: (state: OrchestratorState, source) => {
      console.log("State updated");
      setPosters(state.posters);
    },
  });

  const debugOrchestratorState = (e: React.FormEvent) => {
    e.preventDefault();
    agent.send(JSON.stringify({event: "state.debug"}));
  };
  const deleteAllPosters = (e: React.FormEvent) => {
    e.preventDefault();
    agent.send(JSON.stringify({event: "delete.posters.all"}));
  };

  return (
    <Layout>
      <h1>BandAid</h1>
      <p>Don't forget to check out the console, nerd 🤓</p>
      {posters.map((poster) => (
        <div key={poster.slug}>
          <a href={`/posters/${poster.id}`}>
          <img src={poster.imageUrl} />
          </a>
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
    </Layout>
  );
}
