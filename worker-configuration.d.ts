// Generated by Wrangler by running `wrangler types`

interface Env {
	OPENAI_API_KEY: string;
	SPOTIFY_CLIENT_ID: string;
	SPOTIFY_CLIENT_SECRET: string;
	SPOTIFY_MAIN_USER_ID: string;
	PUBLIC_POSTER_HOST: string;
	Orchestrator: DurableObjectNamespace<import("./src/server").Orchestrator>;
	PosterAgent: DurableObjectNamespace<import("./src/server").PosterAgent>;
	SpotifyUserAgent: DurableObjectNamespace<import("./src/server").SpotifyUserAgent>;
	BAND_AID: R2Bucket;
	BROWSER: Fetcher;
	SPOTIFY_RESEARCHER: Workflow;
}
