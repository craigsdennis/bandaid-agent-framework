import "./styles.css";
import { createRoot } from "react-dom/client";
import App from "./app";
import Poster from "./front-end/pages/poster";
import User from "./front-end/pages/user";

const url = new URL(window.location.href);
const root = createRoot(document.getElementById("app")!);

// Replace with the routing system of your choice!
const id = url.pathname.split("/").at(-1) as string;
if (url.pathname.startsWith("/posters/")) {
    root.render(<Poster id={id}/>);
} else if (url.pathname.startsWith("/users/")) {
    root.render(<User id={id}/>);
} else {
    root.render(<App />);
}
