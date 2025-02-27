import { Agent, getAgentByName, type Connection, type ConnectionContext, type WSMessage } from "@cloudflare/agents";
import {type AccessToken, type Playlist, SpotifyApi, type UserProfile } from '@spotify/web-api-ts-sdk';
import { match } from "assert";
import { log } from "console";

export type SpotifyUserState = {
    expires: number,
    loggedInAt: number,
    playlistUrls?: string[]
} & UserProfile;

export class SpotifyUserAgent extends Agent<Env, SpotifyUserState> {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sql`CREATE TABLE IF NOT EXISTS playlists (
            id VARCHAR(255) PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
        this.sql`CREATE TABLE IF NOT EXISTS watched_tracks (
            id INTEGER AUTO INCREMENT PRIMARY KEY,
            uri VARCHAR(255) NOT NULL,
            poster_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`

        this.sql`CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER AUTO INCREMENT PRIMARY KEY,
            token_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
        this.sql`CREATE TABLE IF NOT EXISTS recently_played_check_log (
            id INTEGER AUTO INCREMENT PRIMARY KEY,
            total_recent INTEGER,
            total_matches_found INTEGER,
            total_watched_at_time_of_check INTEGER,
            run_completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
    }
    
    onConnect(connection: Connection, ctx: ConnectionContext): void | Promise<void> {
        console.log("A client has connected");
    }

    onMessage(connection: Connection, message: WSMessage): void | Promise<void> {
        // TODO: Answer questions about the user Tool call wise?
    }

    async initialize(profile: UserProfile, tokenResult: AccessToken) {
        const loggedInAt = Date.now().valueOf();
        let expires = tokenResult.expires;
        if (expires === undefined) {
            expires = loggedInAt + tokenResult.expires_in;
        }
        const state = {
            ...profile, 
            expires,
            loggedInAt
        };
        this.setState(state);
        this.addToken(tokenResult);
	}
    
    addToken(token: AccessToken) {
        const loggedInAt = Date.now().valueOf();
        let expires = token.expires;
        if (expires === undefined) {
            expires = loggedInAt + token.expires_in;
        }
        this.sql`INSERT INTO tokens (token_json) VALUES (${JSON.stringify(token)})`;
        const state = this.state as SpotifyUserState;
        state.expires = expires;
        state.loggedInAt = loggedInAt 
        this.setState(state);
    }

    async getCurrentToken(): Promise<AccessToken> {
        const rows = this.sql`SELECT token_json FROM tokens ORDER BY created_at DESC LIMIT 1;`;
        const tokenJSON = rows[0].token_json;
        return JSON.parse(tokenJSON);
    }

    async refreshToken(): Promise<AccessToken> {
		console.log('Refreshing token');
        const currentToken = await this.getCurrentToken();
		const creds = this.env.SPOTIFY_CLIENT_ID + ':' + this.env.SPOTIFY_CLIENT_SECRET;
		const form = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: currentToken.refresh_token,
			client_id: this.env.SPOTIFY_CLIENT_ID,
		});
		const response = await fetch('https://accounts.spotify.com/api/token', {
			headers: {
				Authorization: `Basic ${btoa(creds)}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			method: 'POST',
			body: form.toString(),
		});
		const updatedTokenResult: AccessToken = await response.json();
		this.addToken(updatedTokenResult);
		return updatedTokenResult;
	}

    async getRecentTrackUris(since: number): Promise<string[]> {
		const sdk = await this.getSdk();
		let cursor: number = since;
		let now = Date.now().valueOf();
		console.log({now});
		let uris: string[] = [];
		while (cursor) {
			const tracks = await sdk.player.getRecentlyPlayedTracks(50, {
				timestamp: cursor,
				type: 'after',
			});
			uris = uris.concat(tracks.items.map((item) => item.track.uri));
			console.log({cursors: tracks.cursors, cursor});
			if (tracks.cursors) {
                // Sup with this string?
				cursor = parseInt(tracks.cursors.after);
			} else {
                break;
            }
		}
		return uris;
	}

    async checkForRecentPlaylistListens(): Promise<string[]> {
		const rows = this.sql`SELECT run_completed_at FROM listen_checks ORDER BY run_completed_at DESC LIMIT 1;`;

		let since: number;
		if (rows.length === 0) {
			const TEN_DAYS = 10 * 24 * 60 * 60 * 100;
			console.log('First run going back in time', TEN_DAYS);
			since = Date.now().valueOf() - TEN_DAYS;
		} else {
			since = rows[0].run_completed_at as number;
		}
		const recentTrackUris = await this.getRecentTrackUris(since);
		const watchedTrackUris = await this.getWatchedTrackUris();
		// Find gather all added tracks for this entry
		// Add Matches uri,poster_id (multiple posters)
		const matchedUris = recentTrackUris.filter((t) => watchedTrackUris.includes(t));
		// TODO: Loop the matches and notify the poster
		// ???: Time is important right?
		// TODO: Add userId + time to Poster.listens?
		//this.setConfig('lastCheckForListens', Date.now().valueOf().toString());
        // TODO: Notify
        this.sql`INSERT INTO recently_played_check_log VALUES 
        (total_recent, total_matches_found, total_watched_at_time_of_check) 
        VALUES (${recentTrackUris.length}, ${matchedUris.length}, ${watchedTrackUris.length});`

		return matchedUris;
	}
    async getWatchedTrackUris(): Promise<string[]> {
        const rows = this.sql`SELECT uri FROM watched_tracks;`
        return rows.map(row => row.uri);
    }

    async getSdk() {
        console.log("Getting authenticated SDK");
        const state = this.state as SpotifyUserState;
        let accessToken: AccessToken;
        if (state.expires > Date.now().valueOf()) {
            accessToken = await this.refreshToken();
        } else {
            accessToken = await this.getCurrentToken();
        }
        return SpotifyApi.withAccessToken(this.env.SPOTIFY_CLIENT_ID, accessToken);
    }

    async addBandAidPlaylist(posterId: string): Promise<string> {
        console.log(`Adding poster for ${posterId}`);
        const sdk = await this.getSdk();
        console.log({sdk});
        const posterAgent = await getAgentByName(this.env.PosterAgent, posterId);
        console.log({posterAgent})
        const tourName = await posterAgent.getTourName();
        const bandNames = await posterAgent.getBandNames()
        const trackUris = await posterAgent.getTrackUris();    
        console.log({tourName, bandNames, trackUris});
        const state = this.state as SpotifyUserState;
        const userId = state.id as string;
        const playlist = await sdk.playlists.createPlaylist(userId, {
            name: `BandAid / ${tourName}`,
            description: `A BandAid playlist featuring songs from ${bandNames?.join(", ")}`,
			collaborative: true,
			public: true,
		});
        await sdk.playlists.addItemsToPlaylist(playlist.id, trackUris);
        trackUris.forEach((uri) => this.sql`INSERT INTO watched_tracks (uri, poster_id) VALUES (${uri}, ${posterId});`);
        state.playlistUrls = state.playlistUrls || [];
        state.playlistUrls.push(playlist.external_urls.spotify);
        this.setState(state);
        return playlist.id;
    }

}
