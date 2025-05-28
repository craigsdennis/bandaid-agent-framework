function getCookieValue(name: string): string | undefined {
  // Using a simple RegExp to capture the cookie value by name
  const match = document.cookie.match(
    new RegExp("(^|;)\\s*" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : undefined;
}

export default function SpotifyLoggedIn({handler, children}: {handler: any, children: React.ReactNode}) {
  const spotifyUserId = getCookieValue("spotifyUserId");
  console.log({cookie: document.cookie});
  console.log({spotifyUserId});

  if (spotifyUserId) {
    return (
      <form action={handler} className="space-y-4">
        <div className="bg-green-600/20 border border-green-500 p-3 rounded-none">
          <p className="text-green-400 font-bold text-lg tracking-wide">
            🎧 Logged in as: <span className="text-white">{spotifyUserId}</span>
          </p>
        </div>
        <input type="hidden" name="spotify_user_id" value={spotifyUserId} />
        {children}
      </form>
    )
  } else {
    return (
      <div className="bg-red-600/20 border-2 border-red-500 p-6 text-center transform rotate-1">
        <p className="text-stone-300 mb-4 text-lg">Connect your Spotify to create playlists!</p>
        <a 
          href="/spotify/login"
          className="inline-block bg-green-600 hover:bg-green-500 text-white font-black text-xl uppercase tracking-wide px-6 py-3 transform -skew-x-2 shadow-[3px_3px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border-2 border-white"
        >
          🎵 Login to Spotify
        </a>
      </div>
    );
  }
}
