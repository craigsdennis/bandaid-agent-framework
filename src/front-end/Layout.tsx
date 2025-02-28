export default function Layout({children}) {
    return (
        <>
        <main>
            {children}
        </main>
        <footer>
            <p>Made with 🧡 by Cloudflare</p>
        </footer>
        </>
    )
}