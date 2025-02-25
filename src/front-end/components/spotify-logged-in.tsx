function getCookieValue(name: string): string | undefined {
  // Using a simple RegExp to capture the cookie value by name
  const match = document.cookie.match(
    new RegExp("(^|;)\\s*" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : undefined;
}

export default function SpotifyLoggedIn({handler, children}) {
  const spotifyUserId = getCookieValue("spotifyUserId");
  console.log({cookie: document.cookie});
  console.log({spotifyUserId});

  if (spotifyUserId) {
    return (
      <form action={handler}>
        <p className="logged-in-as">🎧 {spotifyUserId}</p>
        <input type="hidden" name="spotify_user_id" value={spotifyUserId} />
        {children}
      </form>
    )
  } else {
    return <div><a href="/spotify/login">Login to Spotify?</a></div>;
  }
}
