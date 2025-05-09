import { getAgentByName } from "agents";

import { Orchestrator } from "./agents/orchestrator";
import { PosterAgent } from "./agents/poster";
import { SpotifyUserAgent } from "./agents/spotify-user";
import { SpotifyResearcher } from "./workflows/spotify-researcher";
import { ImageNormalizer } from "./workflows/image-normalizer";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { agentsMiddleware } from "hono-agents";

import type { AccessToken, UserProfile } from "@spotify/web-api-ts-sdk";

export { Orchestrator, PosterAgent, SpotifyUserAgent, SpotifyResearcher, ImageNormalizer };

const app = new Hono<{ Bindings: Env }>();
app.use("*", agentsMiddleware());
app.get("/spotify/login", async (c) => {
  const state = crypto.randomUUID();
  const scope =
    "playlist-read-collaborative playlist-modify-public user-read-recently-played playlist-modify-private ugc-image-upload";
  const url = new URL(c.req.url);
  url.pathname = "/spotify/callback";

  const qs = new URLSearchParams({
    response_type: "code",
    client_id: c.env.SPOTIFY_CLIENT_ID,
    redirect_uri: url.toString(),
    state,
    scope,
  });
  return c.redirect(`https://accounts.spotify.com/authorize?${qs.toString()}`);
});

app.get("/spotify/callback", async (c) => {
  const { code, state } = c.req.query();
  // TODO: State good?
  const creds = c.env.SPOTIFY_CLIENT_ID + ":" + c.env.SPOTIFY_CLIENT_SECRET;
  const url = new URL(c.req.url);
  url.search = "";
  console.log("redirect_uri", url.toString());
  const form = new URLSearchParams({
    code,
    redirect_uri: url.toString(),
    grant_type: "authorization_code",
  });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    headers: {
      Authorization: `Basic ${btoa(creds)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body: form.toString(),
  });
  const tokenResult: AccessToken = await response.json();
  console.log(tokenResult);
  // Grab the userid (use the SDK?)
  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${tokenResult.access_token}`,
    },
  });
  const profile: UserProfile = await profileResponse.json();
  const spotifyUserAgent = await getAgentByName(
    c.env.SpotifyUserAgent,
    profile.id
  );
  // Always overwrites existing profile
  await spotifyUserAgent.initialize(profile, tokenResult);
  setCookie(c, "spotifyUserId", profile.id);
  // Safe to send to client, still need private key
  setCookie(c, "spotifyAccessToken", tokenResult.access_token);
  return c.redirect("/");
});

app.get("/spotify/remove/:userId", async (c) => {
  const { userId } = c.req.param();
  const agent = await getAgentByName(c.env.SpotifyUserAgent, userId);
  await agent.destroy();
  deleteCookie(c, "spotifyUserId");
  deleteCookie(c, "spotifyAccessToken");
  return c.redirect("/");
});

app.notFound((c) => {
  // We have a single page app
  return c.env.ASSETS.fetch(c.req.raw);
});
type QueueMessage = {
  action: string;
  object: {
    key: string;
  };
};

export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<{ action: string; object: { key: string } }>,
    env: Env
  ) {
    for (const msg of batch.messages) {
      const payload = msg.body;
      const key: string = payload.object.key as string;
      switch (payload.action) {
        case "PutObject":
          console.log("Adding Poster for key", key);
          //const orchestrator = await getAgentByName(env.Orchestrator, "main") as DurableObjectStub;
          const orchestratorId = env.Orchestrator.idFromName("main");
          const orchestrator = env.Orchestrator.get(orchestratorId);
          await orchestrator.submitPoster(`r2://uploads/${key}`);
        default:
          console.log(`Unhandled action ${payload.action}`, payload);
          break;
      }
      msg.ack();
    }
  },
} satisfies ExportedHandler<Env, QueueMessage>;
