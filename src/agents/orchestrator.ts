import {
  Agent,
  getAgentByName,
  type AgentNamespace,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "agents-sdk";
import type { PosterAgent } from "./poster";

export type PosterSummary = {
  id: string;
  slug: string;
  imageUrl: string;
};

export type OrchestratorState = {
  posters: PosterSummary[];
};

export class Orchestrator extends Agent<Env, OrchestratorState> {
  private _cachedPosterStubsByName: Map<string, DurableObjectStub<PosterAgent>>;
  initialState = {
    posters: []
  }

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
      // On reload this will be empty
      this._cachedPosterStubsByName = new Map();
  }

  async getExistingPosterByName(name: string): Promise<DurableObjectStub<PosterAgent>> {
    if (this._cachedPosterStubsByName.has(name)) {
      return this._cachedPosterStubsByName.get(name) as DurableObjectStub<PosterAgent>;
    }
    const poster = await getAgentByName(this.env.PosterAgent, name);
    // Add to local temporary cache
    this._cachedPosterStubsByName.set(name, poster);
    return poster;
  }

  async onPosterChange(name: string) {
    const posterSummaries = this.state?.posters as PosterSummary[];
    const posterSummary = posterSummaries?.find(p => p.id === name);
    if (posterSummary) {                                                                                      
      const poster = await getAgentByName(this.env.PosterAgent, name);
      posterSummary.imageUrl = await poster.getPublicPosterUrl() as string;
    }
    this.setState({...this.state as OrchestratorState, posters: posterSummaries});
  }

  async onTrackListen(spotifyUserName: string, posterAgentName: string, trackUri: string) {
    console.log({spotifyUserName, posterAgentName, trackUri});
    const poster = await this.getExistingPosterByName(posterAgentName);
    await poster.trackListener(spotifyUserName);
  }


  // onStateUpdate(
  //   state: OrchestratorState | undefined,
  //   source: Connection | "server"
  // ): void {
  //   console.log("Orchestrator state updated");
  //   this.broadcast("State updated (using broadcast)");
  // }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    console.log({message});
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
      case "add.poster":
        console.log(`Submitting ${payload.url}`);
        await this.submitPoster(payload.url); 
        break;
      case "delete.posters.all":
        const rows = this.sql<{
          id: string;
        }>`SELECT id from poster_submissions;`;
        console.log(`There are ${rows.length} posters to delete`);
        for (const row of rows) {
          console.log(`Getting ${row.id}`);
          const posterAgent = await this.getExistingPosterByName(row.id);
          console.log(`Destroying poster ${row.id}`);
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
      case "delete.user":
        const userAgent = await getAgentByName(this.env.SpotifyUserAgent, payload.spotifyUserName);
        await userAgent.destroy();
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
    connection.send(JSON.stringify({message: "Hey there, I'm the orchestrator"}));
  }

  async getPosterIdFromSlug(slug: string): Promise<string> {
    const id = this
      .sql<string>`SELECT id FROM poster_submissions WHERE slug=${slug} LIMIT 1;`;
    return id[0];
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
    const state = this.state as OrchestratorState;
    // TODO: How to update this? temporary refresh?
    state.posters.push({
      id,
      slug,
      imageUrl: (await posterAgent.getPublicPosterUrl()) as string,
    });
    this.setState(state);
    console.log("Kicking off Image Normalizer");
    await this.env.IMAGE_NORMALIZER.create({params: {
      posterAgentName: id.toString(),
    }});
    console.log("Kicking off Researcher");
    await this.env.SPOTIFY_RESEARCHER.create({
      params: {
        posterAgentName: id.toString(),
      },
    });
    return true;
  }
}
