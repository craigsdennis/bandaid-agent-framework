import { Agent, type Connection, type ConnectionContext, type WSMessage } from "@cloudflare/agents";
import type { PosterState } from "./poster";

export type PosterSummary = {
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
  }

  onStateUpdate(state: OrchestratorState | undefined, source: Connection | "server"): void {
      console.log("Orchestrator state updated");
      this.broadcast("State updated (using broadcast)");
  }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
      console.log(message);
      if (message === "state.debug") {
        const results = this.sql`SELECT count(*) as total FROM poster_submissions;`
        connection.send(JSON.stringify({
            event: "state.debug.response",
            posterCount: results[0].total,
            state: this.state
        }));
      }
      if (message === "delete.posters") {
        const rows = this.sql<{id: string}>`SELECT id from poster_submissions;`;
        console.log(`There are ${rows.length} posters to delete`);
        for (const row of rows) {
            console.log(`Getting ${row.id}`);
            const id = this.env.PosterAgent.idFromString(row.id);
            const posterAgent = this.env.PosterAgent.get(id);
            console.log(`Deleting ${await posterAgent.getSlug()}`);
            await posterAgent.destroy();
        }
        this.sql`DELETE FROM poster_submissions;`
        this.setState({...this.state, posters: []});
        connection.send(JSON.stringify({
            event: "delete.posters",
            success: true
        }));
      }
  }

  onConnect(connection: Connection, ctx: ConnectionContext): void | Promise<void> {
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
    const spotifyUserAgent = this.getSpotifyUserAgent(spotifyUserId);
    // TODO: Port this logic
    // Use the Posters tracks for each band in the state
  }

  async submitPoster(url: string) {
    // INSERT submission
    const id = this.env.PosterAgent.newUniqueId();
    this
      .sql<string>`INSERT INTO poster_submissions (id, url) VALUES (${id.toString()}, ${url})`;
    const posterAgent = this.env.PosterAgent.get(id);
    await posterAgent.initialize(url);
    // Update poster record to the generated slug
    const slug = await posterAgent.getSlug() as string;
    this.sql`UPDATE poster_submissions SET slug=${
      slug
    } WHERE id=${id.toString()}`;
    const state = this.state || { posters: [] };
    state.posters.push({
      slug,
      imageUrl: (await posterAgent.getPublicPosterUrl()) as string,
    });
    this.setState(state);
    console.log("Kicking off Researcher");
    await this.env.SPOTIFY_RESEARCHER.create({
      params: {
        posterIdString: id.toString(),
      },
    });
    return true;
  }
}
