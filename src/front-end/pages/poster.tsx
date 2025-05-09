import { useAgent } from "agents/react";
import { AgentClient } from "agents/client";
import { useState, type FormEvent } from "react";
import SpotifyArtist from "../components/spotify-artist";
import SpotifyLoggedIn from "../components/spotify-logged-in";
import type { PosterState, SpotifyArtistSummary } from "../../agents/poster";
import Layout from "../Layout";


function summaryFor(poster: PosterState, bandName: string): SpotifyArtistSummary | undefined {
  if (poster.spotifyArtistSummaries === undefined) return undefined;
  return poster.spotifyArtistSummaries.find((p) => p.name === bandName);
}

export default function Poster({ id }: {id: string}) {
  const [poster, setPoster] = useState<PosterState>();
  
  const agent = useAgent({
    agent: "poster-agent",
    name: id,
    onStateUpdate: (state: PosterState) => {
      console.log("State updated", state);
      // Received
      setPoster(state);
    },
  });

  const handlePlaylistRequest = (formData: FormData) => {
    
    const orchestratorClient = new AgentClient({
        host: window.location.host,
        agent: "orchestrator",
        name: "main"
    });
    orchestratorClient.send(JSON.stringify({
        event: "poster.playlist.create",
        posterId: formData.get("poster_id"),
        spotifyUserId: formData.get("spotify_user_id")
    }));
    orchestratorClient.addEventListener("message", (message) => {
        console.log("Orchestrator message", message);
    })
  }

  return (
    <Layout>
      <h1>{poster?.tourName}</h1>
      <img src={poster?.imageUrl} />
      <h2>When</h2>
      {poster?.events.map((event) => (
        <p key={event.date}>{event.venue} - {event.location} - {event.date}</p>
      ))}
      <h2>Who's playing?</h2>
      {poster?.bandNames.map((bandName) => (
        <>
          <h3>{bandName}</h3>
          <SpotifyArtist key={bandName} summary={summaryFor(poster, bandName)} />
        </>
      ))}
      <SpotifyLoggedIn handler={handlePlaylistRequest}>
        <input type="hidden" name="poster_id" value={id} />
        <button type="submit">Add playlist for {poster?.tourName}</button>
      </SpotifyLoggedIn>
    </Layout>
  );
}
