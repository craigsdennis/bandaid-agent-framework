export default function Layout({children}) {
    return (
        <>
        <header>
            <div className="logo">
                <span className="logo-text">Band<span className="logo-highlight">Aid</span></span>
                <div className="logo-tagline">Discover Your Next Show</div>
            </div>
            <nav>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/posters">Posters</a></li>
                    <li><a href="/user">My Profile</a></li>
                </ul>
            </nav>
        </header>
        <main>
            {children}
        </main>
        <footer>
            <div className="footer-content">
                <p>Made with <span className="heart">♪ ♫ ♪</span> by Cloudflare</p>
                <p className="footer-tagline">Where the music meets the wall</p>
            </div>
        </footer>
        </>
    )
}