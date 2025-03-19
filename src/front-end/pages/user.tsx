import { useAgent } from "agents/react";
import type { SpotifyUserState } from "../../agents/spotify-user";
import { useState, type FormEvent } from "react";
import Layout from "../Layout";

export default function User({ id }: {id: string}) {
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUserState>({});
  
  const agent = useAgent({
    agent: "spotify-user-agent",
    name: id,
    onStateUpdate: (state: SpotifyUserState, source) => {
      console.log({state});
      setSpotifyUser(state);
    },
    onMessage: (message) => {
        console.log({message});
        try {
          const payload = JSON.parse(message.data);
          console.log({payload});
        } catch(err) {
          // Not JSON
        }
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

  async function removeCurrentUser(e: FormEvent) {
    e.preventDefault();

    agent.send(JSON.stringify({
      event: "delete.user",
      spotifyUserId: id
    }))
  }
  
  
  return (
  <Layout>
      <h1>User {id} </h1>
      <p>{spotifyUser?.displayName} is available at {spotifyUser?.email}</p>
      {spotifyUser?.playlists?.map(playlist => {
        <a href={playlist.url}>{playlist.title}</a>
      })}

      <h2>Admin</h2>
      <form>
        <button onClick={getRecentTracks}>Get Recent Tracks</button>
        <button onClick={runRecentPlaylistCheck}>Run Playlist Checks</button>
        <button onClick={removeCurrentUser}>Remove SpotifyUserAgent record for {id}</button>

      </form>
  </Layout>
  );
}
