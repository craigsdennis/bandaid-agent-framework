import { useAgent } from "@cloudflare/agents/react";
import { useState } from "react";
import SpotifyArtist from "../components/spotify-artist";
import SpotifyLoggedIn from "../components/spotify-logged-in";

export interface SpotifyArtistSummary {
  name: string;
  description: string;
  spotify_url: string;
  genres: string[];
}

interface EventSchema {
    venue: string;
    location: string;
    date: string;
}

interface PosterState {
  tourName: string;
  bandNames: string[];
  events: EventSchema[];
  imageUrl: string;
  spotifyArtistSummaries: SpotifyArtistSummary[];
}

function summaryFor(poster: PosterState, bandName: string) {
  if (poster.spotifyArtistSummaries === undefined) return;
  return poster.spotifyArtistSummaries.find((p) => p.name === bandName);
}

export default function Poster({ id }) {
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

  return (
    <div>
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
      <SpotifyLoggedIn>
        <p>Add a playlist?</p>
      </SpotifyLoggedIn>
    </div>
  );
}
