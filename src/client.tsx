import "./styles.css";
import { createRoot } from "react-dom/client";
import App from "./app";
import Poster from "./front-end/pages/poster";

const url = new URL(window.location.href);
console.log({url});
const root = createRoot(document.getElementById("app")!);

// Replace with the routing system of your choice!
if (url.pathname.startsWith("/posters")) {
    root.render(<Poster/>);
} else {
    root.render(<App />);
}
