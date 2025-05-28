function getCookieValue(name: string): string | undefined {
  const match = document.cookie.match(
    new RegExp("(^|;)\\s*" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : undefined;
}

export default function Layout({children}: {children: React.ReactNode}) {
    const spotifyUserId = getCookieValue("spotifyUserId");
    
    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 font-mono bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-stone-900 to-zinc-900">
            {/* Torn paper texture overlay */}
            <div className="fixed inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23a8a29e%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
            
            <header className="bg-black/80 backdrop-blur-sm border-b-4 border-red-600 sticky top-0 z-50 shadow-2xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex flex-col transform -rotate-1">
                        <span className="text-4xl font-black tracking-widest text-white drop-shadow-[3px_3px_0px_#dc2626] hover:drop-shadow-[5px_5px_0px_#dc2626] transition-all duration-300">
                            Band<span className="text-yellow-400">Aid</span>
                        </span>
                        <div className="text-sm tracking-[0.2em] text-stone-300 -mt-1 ml-1 font-bold uppercase">
                            Discover Your Next Show
                        </div>
                    </div>
                    <nav>
                        <ul className="flex gap-8 list-none">
                            <li>
                                <a href="/" className="text-xl font-bold tracking-wider uppercase text-stone-300 hover:text-yellow-400 transition-colors duration-300 relative group px-3 py-2">
                                    Home
                                    <span className="absolute bottom-0 left-0 w-0 h-1 bg-red-600 group-hover:w-full transition-all duration-300"></span>
                                </a>
                            </li>
                            <li>
                                <a href="/posters" className="text-xl font-bold tracking-wider uppercase text-stone-300 hover:text-yellow-400 transition-colors duration-300 relative group px-3 py-2">
                                    Posters
                                    <span className="absolute bottom-0 left-0 w-0 h-1 bg-red-600 group-hover:w-full transition-all duration-300"></span>
                                </a>
                            </li>
                            <li>
                                {spotifyUserId ? (
                                    <a href={`/users/${spotifyUserId}`} className="text-xl font-bold tracking-wider uppercase text-stone-300 hover:text-yellow-400 transition-colors duration-300 relative group px-3 py-2">
                                        Your Spotify
                                        <span className="absolute bottom-0 left-0 w-0 h-1 bg-red-600 group-hover:w-full transition-all duration-300"></span>
                                    </a>
                                ) : (
                                    <a href="/spotify/login" className="text-xl font-bold tracking-wider uppercase text-stone-300 hover:text-yellow-400 transition-colors duration-300 relative group px-3 py-2">
                                        Login
                                        <span className="absolute bottom-0 left-0 w-0 h-1 bg-red-600 group-hover:w-full transition-all duration-300"></span>
                                    </a>
                                )}
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>
            
            <main className="relative max-w-6xl mx-auto px-6 py-8">
                {children}
            </main>
            
            <footer className="relative mt-16 bg-black/60 backdrop-blur-sm">
                {/* Torn edge effect */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20height%3D%2230%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M0%2030%20Q%2025%200%2050%2015%20Q%2075%2030%20100%205%20Q%20125%20-10%20150%2015%20Q%20175%2040%20200%205%20Q%20225%20-10%20250%2015%20Q%20275%2040%20300%205%20Q%20325%20-10%20350%2015%20Q%20375%2040%20400%205%20Q%20425%20-10%20450%2015%20Q%20475%2040%20500%205%20Q%20525%20-10%20550%2015%20Q%20575%2040%20600%205%20Q%20625%20-10%20650%2015%20Q%20675%2040%20700%205%20Q%20725%20-10%20750%2015%20Q%20775%2040%20800%205%20L%20800%2030%20Z%22%20fill%3D%22%23000000%22/%3E%3C/svg%3E')] bg-repeat-x -top-4"></div>
                
                <div className="text-center py-8 px-6">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-black tracking-wide text-stone-300">
                            Made with <span className="text-yellow-400 animate-pulse inline-block">♪ ♫ ♪</span> by Cloudflare
                        </p>
                        <p className="text-sm tracking-[0.15em] text-stone-500 uppercase font-bold">
                            Where the music meets the wall
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}