import { Agent, type Connection, type ConnectionContext, type WSMessage } from "@cloudflare/agents";

export class SpotifyUserAgent extends Agent<Env> {

    onStart(): void | Promise<void> {
        this.sql`CREATE TABLE IF NOT EXISTS playlisted_tracks (
        );`
    }
    
    onConnect(connection: Connection, ctx: ConnectionContext): void | Promise<void> {
        console.log("A client has connected");
    }

    onMessage(connection: Connection, message: WSMessage): void | Promise<void> {
        
    }
}
