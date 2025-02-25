import {
  Agent,
  getAgentByName,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "@cloudflare/agents";
import type { PosterState } from "./poster";

export type PosterSummary = {
  id: string;
  slug: string;
  imageUrl: string;
};

export type OrchestratorState = {
  posters: PosterSummary[];
};

export class Orchestrator extends Agent<Env, OrchestratorState> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql`CREATE TABLE IF NOT EXISTS poster_submissions (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            slug TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
    this.sql`CREATE TABLE IF NOT EXISTS poster_playlists (
            id TEXT PRIMARY KEY,
            playlist_id TEXT NOT NULL,
            poster_id TEXT NOT NULL,
            spotify_user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
  }

  onStateUpdate(
    state: OrchestratorState | undefined,
    source: Connection | "server"
  ): void {
    console.log("Orchestrator state updated");
    this.broadcast("State updated (using broadcast)");
  }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    console.log(message);
    const payload = JSON.parse(message.toString());
    switch (payload.event) {
      case "state.debug":
        const results = this
          .sql`SELECT count(*) as total FROM poster_submissions;`;
        connection.send(
          JSON.stringify({
            event: "state.debug.response",
            posterCount: results[0].total,
            state: this.state,
          })
        );
        break;
      case "delete.posters.all":
        const rows = this.sql<{
          id: string;
        }>`SELECT id from poster_submissions;`;
        console.log(`There are ${rows.length} posters to delete`);
        for (const row of rows) {
          console.log(`Getting ${row.id}`);
          const posterAgent = await getAgentByName(
            this.env.PosterAgent,
            row.id
          );
          console.log(`Deleting ${await posterAgent.getSlug()}`);
          await posterAgent.destroy();
        }
        this.sql`DELETE FROM poster_submissions;`;
        this.setState({ ...this.state, posters: [] });
        connection.send(
          JSON.stringify({
            event: "delete.posters",
            success: true,
          })
        );
        break;
      case "poster.playlist.create":
        const playlistId = await this.createPlaylistForSpotifyUser(payload.posterId, payload.spotifyUserId);
        connection.send(JSON.stringify({
          event: "poster.playlist.created",
          playlistId
        }))
        break;
      default:
        connection.send(
          JSON.stringify({
            event: "unhandled",
            eventName: payload.event,
          })
        );
    }
  }

  onConnect(
    connection: Connection,
    ctx: ConnectionContext
  ): void | Promise<void> {
    connection.send("Hey there, I'm the orchestrator");
  }

  async getPosterIdFromSlug(slug: string): Promise<string> {
    const id = this
      .sql<string>`SELECT id FROM poster_submissions WHERE slug=${slug} LIMIT 1;`;
    return id[0];
  }

  getSpotifyUserAgent(userId: string) {
    const id = this.env.SpotifyUserAgent.idFromName(userId);
    return this.env.SpotifyUserAgent.get(id);
  }

  async createPlaylistForSpotifyUser(posterId: string, spotifyUserId: string) {
    const spotifyUserAgent = await getAgentByName(
      this.env.SpotifyUserAgent,
      spotifyUserId
    );
    const playlistId = await spotifyUserAgent.addBandAidPlaylist(posterId);
    this
      .sql`INSERT INTO poster_playlists (playlist_id, poster_id, spotify_user_id) VALUES (${playlistId}, ${posterId}, ${spotifyUserId})`;
    // TODO: Should we update state?
    return playlistId;
  }

  async submitPoster(url: string) {
    // INSERT submission
    const id = crypto.randomUUID();
    const posterAgent = await getAgentByName(this.env.PosterAgent, id);
    this
      .sql<string>`INSERT INTO poster_submissions (id, url) VALUES (${id}, ${url})`;
    await posterAgent.initialize(url);
    // Update poster record to the generated slug
    const slug = (await posterAgent.getSlug()) as string;
    this.sql`UPDATE poster_submissions SET slug=${slug} WHERE id=${id}`;
    const state = this.state || { posters: [] };
    state.posters.push({
      id,
      slug,
      imageUrl: (await posterAgent.getPublicPosterUrl()) as string,
    });
    this.setState(state);
    console.log("Kicking off Researcher");
    await this.env.SPOTIFY_RESEARCHER.create({
      params: {
        posterAgentName: id.toString(),
      },
    });
    return true;
  }
}
