import {
  Agent,
  getAgentByName,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "@cloudflare/agents";
import {
  type AccessToken,
  type Playlist,
  SpotifyApi,
  type UserProfile,
} from "@spotify/web-api-ts-sdk";
import { type AgentContext } from "agents-sdk";
import { arrayBuffer } from "stream/consumers";

export type PlaylistSummary = {
  url: string;
  title: string;
};

export type SpotifyUserState = {
  id: string;
  displayName: string;
  url: string;
  email: string;
  expires: number;
  loggedInAt: number;
  playlists?: PlaylistSummary[];
};

export class SpotifyUserAgent extends Agent<Env, SpotifyUserState> {
  
  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.sql`CREATE TABLE IF NOT EXISTS watched_tracks (
            id INTEGER AUTO INCREMENT PRIMARY KEY,
            uri VARCHAR(255) NOT NULL,
            poster_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
    this.sql`CREATE TABLE IF NOT EXISTS track_listens (
            id INTEGER AUTO INCREMENT PRIMARY KEY,
            uri VARCHAR(255) NOT NULL,
            poster_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
    this.sql`CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER AUTO INCREMENT PRIMARY KEY,
            token_json TEXT NOT NULL,
            refresh_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
    this.sql`CREATE TABLE IF NOT EXISTS recently_played_check_log (
            id INTEGER AUTOx INCREMENT PRIMARY KEY,
            total_recent INTEGER,
            total_matches_found INTEGER,
            total_watched_at_time_of_check INTEGER,
            run_completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
  }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    const payload = JSON.parse(message.toString());
    switch (payload.event) {
      case "tracks.recent":
        const recentTrackUris = await this.getRecentTrackUris(payload.since);
        connection.send(JSON.stringify({ recentTrackUris }));
        break;
      case "playlist.check":
        const runResults = await this.runRecentPlaylistListensCheck();
        const allRuns = this
          .sql`SELECT * FROM recently_played_check_log ORDER BY run_completed_at DESC`;
        connection.send(
          JSON.stringify({
            runResults,
            allRuns,
          })
        );
        break;
      case "delete.user":
        const userAgent = await getAgentByName(
          this.env.SpotifyUserAgent,
          payload.spotifyUserName
        );
        await userAgent.destroy();
        break;

      default:
        console.warn("Unhandled event", payload.event);
        break;
    }
  }

  asExpireMilliseconds(expiresInSeconds: number) {
    // Spotify passes seconds
    const now = Date.now().valueOf();
    return now + (expiresInSeconds * 1000);
  }

  async initialize(profile: UserProfile, tokenResult: AccessToken) {
    const loggedInAt = Date.now().valueOf();
    let expires = tokenResult.expires;
    if (expires === undefined) {
      expires = this.asExpireMilliseconds(tokenResult.expires_in);
    }
    console.log("Setting expires", expires, loggedInAt);
    const state = {
      id: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      url: profile.external_urls.spotify,
      expires,
      loggedInAt,
    };
    this.setState(state);
    this.addToken(tokenResult);
  }

  addToken(token: AccessToken) {
    const loggedInAt = Date.now().valueOf();
    let expires = token.expires;
    if (expires === undefined) {
      expires = this.asExpireMilliseconds(token.expires_in);
    }
    this
      .sql`INSERT INTO tokens (token_json, refresh_token) VALUES (${JSON.stringify(
      token
    )}, ${token.refresh_token});`;
    const state = this.state as SpotifyUserState;
    state.expires = expires;
    state.loggedInAt = loggedInAt
    this.setState(state);
  }

  async getCurrentToken(): Promise<AccessToken> {
    const rows = this
      .sql`SELECT token_json FROM tokens ORDER BY created_at DESC LIMIT 1;`;
    const tokenJSON = rows[0].token_json;
    return JSON.parse(tokenJSON);
  }

  async getCurrentRefreshToken(): Promise<string> {
    const rows = this.sql`SELECT 
      refresh_token from tokens 
    WHERE 
      refresh_token IS NOT NULL 
    ORDER BY created_at DESC LIMIT 1`;
    const refreshToken = rows[0].refresh_token as string;
    return refreshToken;
  }

  async refreshToken(): Promise<AccessToken> {
    console.log("Refreshing token");
    const currentRefreshToken = await this.getCurrentRefreshToken();
    console.log({ currentRefreshToken });
    const creds =
      this.env.SPOTIFY_CLIENT_ID + ":" + this.env.SPOTIFY_CLIENT_SECRET;
    const form = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
      client_id: this.env.SPOTIFY_CLIENT_ID,
    });
    const response = await fetch("https://accounts.spotify.com/api/token", {
      headers: {
        Authorization: `Basic ${btoa(creds)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: form.toString(),
    });
    const updatedTokenResult: AccessToken = await response.json();
    this.addToken(updatedTokenResult);
    return updatedTokenResult;
  }

  async getRecentTrackUris(since: number): Promise<string[]> {
    const sdk = await this.getSdk();
    let cursor: number = since;
    let uris: string[] = [];
    while (cursor) {
      const tracks = await sdk.player.getRecentlyPlayedTracks(50, {
        timestamp: cursor,
        type: "after",
      });
      uris = uris.concat(tracks.items.map((item) => item.track.uri));
      if (tracks.cursors) {
        // Sup with this string?
        cursor = parseInt(tracks.cursors.after);
      } else {
        break;
      }
    }
    return uris;
  }

  async runRecentPlaylistListensCheck(): Promise<string[]> {
    const rows = this
      .sql`SELECT run_completed_at FROM recently_played_check_log ORDER BY run_completed_at DESC LIMIT 1;`;

    let since: number;
    if (rows.length === 0) {
      const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
      console.log("First run going back in time", TEN_DAYS);
      since = Date.now().valueOf() - TEN_DAYS;
    } else {
      since = new Date(rows[0].run_completed_at).valueOf();
      console.log({ since, now: Date.now().valueOf() });
    }
    const recentTrackUris = await this.getRecentTrackUris(since);
    const watchedTrackUris = await this.getWatchedTrackUris();
    // Find gather all added tracks for this entry
    // Add Matches uri,poster_id (multiple posters)
    const matchedUris = recentTrackUris.filter((t) =>
      watchedTrackUris.includes(t)
    );
    const orchestrator = await getAgentByName(this.env.Orchestrator, "main");
    for (const matchedUri of matchedUris) {
      const rows = this
        .sql`SELECT * FROM watched_tracks WHERE uri=${matchedUri};`;
      for (const row of rows) {
        this
          .sql`INSERT INTO track_listens (uri, poster_id) VALUES (${row.uri}, ${row.poster_id});`;
        await orchestrator.onTrackListen(this.name, row.poster_id, matchedUri);
      }
    }
    this.sql`INSERT INTO recently_played_check_log 
        (total_recent, total_matches_found, total_watched_at_time_of_check) VALUES
         (${recentTrackUris.length}, ${matchedUris.length}, ${watchedTrackUris.length});`;
    return matchedUris;
  }
  async getWatchedTrackUris(): Promise<string[]> {
    const rows = this.sql`SELECT uri FROM watched_tracks;`;
    return rows.map((row) => row.uri);
  }

  async getSdk() {
    console.log("Getting authenticated SDK");
    const state = this.state as SpotifyUserState;
    let accessToken: AccessToken;
    console.log({ expires: state.expires, now: Date.now().valueOf() });
    if (state.expires < Date.now().valueOf()) {
      console.log("Refreshing token");
      accessToken = await this.refreshToken();
    } else {
      accessToken = await this.getCurrentToken();
    }
    return SpotifyApi.withAccessToken(this.env.SPOTIFY_CLIENT_ID, accessToken);
  }

  async addBandAidPlaylist(posterId: string): Promise<string> {
    console.log(`Adding poster for ${posterId}`);
    const sdk = await this.getSdk();
    const posterAgent = await getAgentByName(this.env.PosterAgent, posterId);
    const tourName = await posterAgent.getTourName();
    const bandNames = await posterAgent.getBandNames();
    const trackUris = await posterAgent.getTrackUris();
    const state = this.state as SpotifyUserState;
    const userId = state.id as string;
    const playlistTitle = `BandAid / ${tourName}`;
    const playlist = await sdk.playlists.createPlaylist(userId, {
      name: playlistTitle,
      description: `A BandAid playlist featuring songs from ${bandNames?.join(
        ", "
      )}`,
      collaborative: true,
      public: true,
    });
    await sdk.playlists.addItemsToPlaylist(playlist.id, trackUris);
    trackUris.forEach(
      (uri) =>
        this
          .sql`INSERT INTO watched_tracks (uri, poster_id) VALUES (${uri}, ${posterId});`
    );
    const r2Key = await posterAgent.getPosterR2Key();
    const obj = await this.env.POSTERS.get(r2Key);
    if (obj) {
      console.log(`Transforming ${r2Key}`);
      const image = await this.env.IMAGES.input(obj.body)
        .transform({ width: 300 })
        .transform({ height: 300 })
        .transform({fit: "scale-down"})
        .output({ format: "image/jpeg" });
      const reader = image.image().getReader();
      const buffers: Buffer[] = [];

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          // Convert each Uint8Array chunk into a Buffer
          buffers.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }

      // Combine all Buffers into one
      const combinedBuffer = Buffer.concat(buffers);

      // Convert to Base64
      const imageBase64 = combinedBuffer.toString("base64");
      await sdk.playlists.addCustomPlaylistCoverImageFromBase64String(
        playlist.id,
        imageBase64
      );
    }

    if (state.playlists === undefined) {
      state.playlists = [];
    }
    
    state.playlists.push({
      url: playlist.external_urls.spotify,
      title: playlistTitle,
    });
    this.setState(state);
    return playlist.id;
  }
}
