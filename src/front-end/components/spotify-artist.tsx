import { type SpotifyArtistSummary } from "../pages/poster";

export default function SpotifyArtist({ summary }) {
    if (summary === undefined) {
        return (
            <p>...</p>
        )
    }
    return (
        <div className="artist-summary">
            <p><a href={summary.spotify_url}>{summary.name} on Spotify</a></p>
            <div>{summary.description}</div>
        </div>
    )
}