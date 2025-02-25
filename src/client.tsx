import "./styles.css";
import { createRoot } from "react-dom/client";
import App from "./app";
import Poster from "./front-end/pages/poster";

const url = new URL(window.location.href);
console.log({url});
const root = createRoot(document.getElementById("app")!);

// Replace with the routing system of your choice!
if (url.pathname.startsWith("/posters")) {
    const id = url.pathname.split("/").at(-1);
    root.render(<Poster id={id}/>);
} else {
    root.render(<App />);
}
