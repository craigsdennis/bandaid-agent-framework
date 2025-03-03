import { useAgent } from "agents-sdk/react";
import type { SpotifyUserState } from "../../agents/spotify-user";
import type { FormEvent } from "react";
import Layout from "../Layout";

export default function User({ id }) {
  const agent = useAgent({
    agent: "spotify-user-agent",
    name: id,
    onStateUpdate: (state: SpotifyUserState) => {
        console.log({state});
    },
    onMessage: (message) => {
        console.log({message});
        const payload = JSON.parse(message.data);
        console.log({payload})
    }

  });
  const getRecentTracks = (e: FormEvent) => {
    e.preventDefault();
    const since = Date.now().valueOf() - (24 * 60 * 60 * 1000);
    agent.send(JSON.stringify({
        event: "tracks.recent",
        since
    }))
  }
  async function runRecentPlaylistCheck(e: FormEvent) {
    e.preventDefault();

    agent.send(JSON.stringify({
      event: "playlist.check"
    }))
  }
  
  return (
  <Layout>
      <h1>User {id} </h1>;
      <form>
        <button onClick={getRecentTracks}>Get Recent Tracks</button>
        <button onClick={runRecentPlaylistCheck}>Run Playlist Checks</button>

      </form>
  </Layout>
  );
}
