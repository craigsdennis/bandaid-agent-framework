import { useAgent } from "agents-sdk/react";
import type { SpotifyUserState } from "../../agents/spotify-user";

export default function User({ id }) {
  const agent = useAgent({
    agent: "spotify-user",
    name: id
  })
  return <h1>User {id} </h1>;
}
