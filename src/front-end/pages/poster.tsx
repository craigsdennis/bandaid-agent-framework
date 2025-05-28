import { useAgent } from "agents/react";
import { AgentClient } from "agents/client";
import { useState, type FormEvent } from "react";
import SpotifyArtist from "../components/spotify-artist";
import SpotifyLoggedIn from "../components/spotify-logged-in";
import type { PosterState, SpotifyArtistSummary } from "../../agents/poster";
import Layout from "../Layout";

function summaryFor(
  poster: PosterState,
  bandName: string
): SpotifyArtistSummary | undefined {
  if (poster.spotifyArtistSummaries === undefined) return undefined;
  return poster.spotifyArtistSummaries.find((p) => p.name === bandName);
}

export default function Poster({ id }: { id: string }) {
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

  const handlePlaylistRequest = async (formData: FormData) => {
    const orchestratorClient = new AgentClient({
      host: window.location.host,
      agent: "orchestrator",
      name: "main",
    });
    await orchestratorClient.call("createPlaylistForSpotifyUser", [
      formData.get("poster_id"),
      formData.get("spotify_user_id"),
    ]);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Tour Title */}
        <h1 className="text-5xl font-black uppercase tracking-wider text-center text-yellow-400 transform -rotate-1 drop-shadow-[4px_4px_0px_#dc2626] hover:drop-shadow-[6px_6px_0px_#dc2626] transition-all duration-300">
          {poster?.tourName}
        </h1>
        
        {/* Poster Image */}
        <div className="flex justify-center">
          <img 
            src={poster?.imageUrl} 
            className="max-w-md border-8 border-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] transform rotate-1 hover:-rotate-1 hover:scale-105 transition-all duration-300"
            alt={poster?.tourName}
          />
        </div>
        
        {/* Event Details */}
        <div className="bg-stone-800/50 backdrop-blur-sm border-l-4 border-red-600 p-6 transform -skew-x-1">
          <h2 className="text-3xl font-black uppercase text-red-500 mb-4 tracking-wide border-b-2 border-red-600 inline-block pb-1">
            🎪 When & Where
          </h2>
          <div className="space-y-2">
            {poster?.events.map((event) => (
              <p key={event.date} className="text-lg text-stone-300 font-mono bg-black/30 p-3 border-l-2 border-yellow-400">
                📍 <span className="text-yellow-400 font-bold">{event.venue}</span> - {event.location} - <span className="text-red-400">{event.date}</span>
              </p>
            ))}
          </div>
        </div>
        
        {/* Artists */}
        <div className="bg-stone-800/50 backdrop-blur-sm border-l-4 border-yellow-400 p-6 transform skew-x-1">
          <h2 className="text-3xl font-black uppercase text-yellow-400 mb-6 tracking-wide border-b-2 border-yellow-400 inline-block pb-1">
            🎸 Who's Playing?
          </h2>
          <div className="space-y-6">
            {poster?.bandNames.map((bandName) => (
              <div key={bandName} className="bg-black/40 p-4 border-2 border-stone-700 hover:border-red-500 transition-colors duration-300">
                <h3 className="text-2xl font-bold text-red-400 mb-3 tracking-wider uppercase">
                  {bandName}
                </h3>
                <SpotifyArtist
                  summary={summaryFor(poster, bandName)}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Playlist Creation */}
        <div className="bg-gradient-to-r from-red-600/20 to-yellow-400/20 border-2 border-red-600 p-6 text-center transform -rotate-1">
          <SpotifyLoggedIn handler={handlePlaylistRequest}>
            <input type="hidden" name="poster_id" value={id} />
            <button 
              type="submit" 
              className="bg-red-600 hover:bg-yellow-400 hover:text-black text-white font-black text-xl uppercase tracking-wide px-8 py-4 transform skew-x-2 shadow-[4px_4px_0px_rgba(0,0,0,0.7)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border-2 border-white"
            >
              🎵 Create Playlist for {poster?.tourName}
            </button>
          </SpotifyLoggedIn>
        </div>
      </div>
    </Layout>
  );
}
