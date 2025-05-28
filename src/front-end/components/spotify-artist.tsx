import type { SpotifyArtistSummary } from "../../agents/poster";

export default function SpotifyArtist({ summary }: {summary?: SpotifyArtistSummary}) {
    if (summary === undefined) {
        return (
            <div className="text-center text-stone-500 text-2xl p-4">
                🤷‍♂️ <span className="text-lg ml-2">Searching for band info...</span>
            </div>
        )
    }
    return (
        <div className="bg-black/60 border border-stone-600 p-4 rounded-none transform hover:scale-[1.02] transition-all duration-300">
            <div className="mb-3">
                <a 
                    href={summary.spotify_url}
                    className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-bold text-lg underline decoration-2 underline-offset-4 hover:decoration-green-400 transition-colors duration-300"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🎵 {summary.name} on Spotify
                </a>
            </div>
            <div className="text-stone-300 text-sm leading-relaxed bg-stone-900/50 p-3 border-l-4 border-green-400 italic">
                {summary.description}
            </div>
        </div>
    )
}