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
  const getRecentTracks = async (e: FormEvent) => {
    e.preventDefault();
    const since = Date.now().valueOf() - (24 * 60 * 60 * 1000);
    const results = await agent.call("getRecentTrackUris", [since]);
    console.log(results);
  }
  async function runRecentPlaylistCheck(e: FormEvent) {
    e.preventDefault();

    const result = await agent.call("runRecentPlaylistListensCheck");
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
      <div className="space-y-8">
        {/* User Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase tracking-wider text-yellow-400 transform -rotate-1 drop-shadow-[3px_3px_0px_#dc2626]">
            🎧 Spotify User: {id}
          </h1>
          <div className="bg-stone-800/50 backdrop-blur-sm border-l-4 border-green-500 p-4 mt-6 inline-block">
            <p className="text-lg text-stone-300">
              <span className="text-green-400 font-bold">{spotifyUser?.displayName}</span> 
              {spotifyUser?.email && (
                <span> is available at <span className="text-yellow-400">{spotifyUser?.email}</span></span>
              )}
            </p>
          </div>
        </div>

        {/* Playlists */}
        {spotifyUser?.playlists && spotifyUser.playlists.length > 0 && (
          <div className="bg-stone-800/50 backdrop-blur-sm border-l-4 border-yellow-400 p-6">
            <h2 className="text-2xl font-black uppercase text-yellow-400 mb-4 tracking-wide border-b-2 border-yellow-400 inline-block pb-1">
              🎵 Your Playlists
            </h2>
            <div className="space-y-2">
              {spotifyUser.playlists.map((playlist, index) => (
                <a 
                  key={index}
                  href={playlist.url}
                  className="block bg-black/40 p-3 border-l-2 border-green-400 hover:border-yellow-400 text-green-400 hover:text-yellow-400 transition-colors duration-300 font-mono"
                >
                  🎶 {playlist.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Admin Section */}
        <div className="bg-red-600/10 border-2 border-red-600 p-6">
          <h2 className="text-2xl font-black uppercase text-red-400 mb-6 tracking-wide border-b-2 border-red-400 inline-block pb-1">
            ⚙️ Admin Controls
          </h2>
          <form className="space-y-4">
            <button 
              onClick={getRecentTracks}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg uppercase tracking-wide px-6 py-3 transform skew-x-1 shadow-[3px_3px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border border-white"
            >
              📊 Get Recent Tracks
            </button>
            <button 
              onClick={runRecentPlaylistCheck}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg uppercase tracking-wide px-6 py-3 transform -skew-x-1 shadow-[3px_3px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border border-white"
            >
              🔄 Run Playlist Checks
            </button>
            <button 
              onClick={removeCurrentUser}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-lg uppercase tracking-wide px-6 py-3 transform skew-x-1 shadow-[3px_3px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border border-white"
            >
              🗑️ Remove User Record for {id}
            </button>
          </form>
        </div>
      </div>
  </Layout>
  );
}
