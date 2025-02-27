import "./styles.css";
import { createRoot } from "react-dom/client";
import App from "./app";
import Poster from "./front-end/pages/poster";
import User from "./front-end/pages/user";

const url = new URL(window.location.href);
console.log({url});
const root = createRoot(document.getElementById("app")!);

// Replace with the routing system of your choice!
if (url.pathname.startsWith("/posters/")) {
    const id = url.pathname.split("/").at(-1);
    root.render(<Poster id={id}/>);
} else if (url.pathname.startsWith("/users/")) {
    const id = url.pathname.split("/").at(-1);
    root.render(<User id={id}/>);
} else {
    root.render(<App />);
}
