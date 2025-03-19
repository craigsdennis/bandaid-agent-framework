import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";
import puppeteer from "@cloudflare/puppeteer";
import type { SpotifyArtistSummary } from "../agents/poster";
import { getAgentByName } from "agents";

export type ResearcherParams = {
  posterAgentName: string;
};

export class SpotifyResearcher extends WorkflowEntrypoint<
  Env,
  ResearcherParams
> {
  async run(
    event: Readonly<WorkflowEvent<ResearcherParams>>,
    step: WorkflowStep
  ): Promise<string> {
    const browser = await puppeteer.launch(this.env.BROWSER);
    const posterAgent = await getAgentByName(this.env.PosterAgent, event.payload.posterAgentName);
    const spotifyApi = SpotifyApi.withClientCredentials(
      this.env.SPOTIFY_CLIENT_ID,
      this.env.SPOTIFY_CLIENT_SECRET
    );
    const bandNames = (await posterAgent.getBandNames()) || [];
    for (const bandName of bandNames) {
      const spotifyArtist = await step.do("Find Spotify Artist", async () => {
        // posterAgent.addStatusUpdate(`Searching Spotify for Artist: ${bandName}`);
        const results = await spotifyApi.search(bandName, ["artist"]);
        // TODO: Handle not found
        return results.artists.items.at(0);
      });
      if (spotifyArtist) {
        let summary = await step.do(
          `Create initial artist Summary for ${spotifyArtist.name}`,
          async () => {
            const summary: SpotifyArtistSummary = {
              genres: spotifyArtist.genres,
              name: spotifyArtist.name,
              uri: spotifyArtist.uri,
              spotify_url: spotifyArtist.external_urls.spotify,
            };
            return summary;
          }
        );
        // TODO: https://developer.spotify.com/documentation/web-api/reference/get-an-artists-top-tracks
        summary = await step.do(
          `Add top 3 tracks for ${summary.name}`,
          async () => {
            const results = await spotifyApi.artists.topTracks(
              spotifyArtist.id,
              "US"
            );
            summary.topTracksUris = results.tracks
              .slice(0, 3)
              .map((t) => t.uri);
            return summary;
          }
        );
        if (summary.spotify_url) {
          const fullDescription = await step.do(
            `Gather description from Spotify Web Page for ${summary.name}`,
            async () => {
              const page = await browser.newPage();
              await page.goto(summary.spotify_url);
              await page.waitForNetworkIdle();
              // Dynamic class names find the last text after <h2>About</h2>
              const handles = await page.$$("h2");
              let description;
              for (const handle of handles) {
                const headingText = await handle.evaluate((el) => el.innerText);
                if (headingText !== "About") {
                  console.log(`Skipping heading: ${headingText}`);
                  continue;
                }
                description = await handle.evaluate((el) => {
                  //@ts-ignore
                  const els = el.parentElement.querySelectorAll(
                    `[data-encore-id="text"]`
                  );
                  //@ts-ignore
                  return Array.from(els).at(-1).innerText;
                });
                break;
              }
              await page.close();
              return description;
            }
          );
          if (fullDescription) {
            summary = await step.do(
              `Summarize description for ${summary.name}`,
              async () => {
                const result: AiTextGenerationOutput = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                  messages: [
                    {
                      role: "system",
                      content: `You summarize musical artist descriptions for live performance recommendations.
                            
                            The user will provide you with a detailed description of an Artist.

                            Your job is to summarize to 3 sentences that describe the artists' live performance, and general style and influences if available in longer description.

                            Return only the summarization.
                            `,
                    },
                    { role: "user", content: fullDescription },
                  ],
                });
                //@ts-ignore why?
                const summarizedDescription: string = result.response;

                summary.description = summarizedDescription;
                return summary;
              }
            );
          }
        }
        const result = await step.do(
          `Add ${summary.name} to poster state`,
          async () => {
            await posterAgent.addSpotifyArtistSummary(summary);
          }
        );
      }
    }
    // if (trackUris.length > 0) {
    // 	const playlistUrl = await step.do("Creating Playlist from found tracks", async () => {
    // 		// NOTE: This is using the default main user because at this point who is the user?
    // 		await poster.addStatusUpdate(`Creating new playlist for ${this.env.SPOTIFY_MAIN_USER_ID}`);
    // 		const id = this.env.SPOTIFY_USER.idFromName(this.env.SPOTIFY_MAIN_USER_ID);
    // 		const spotifyUser = this.env.SPOTIFY_USER.get(id);
    // 		const playlist = await spotifyUser.createPlaylistFromPosterId(posterIdString, trackUris);
    // 		return playlist.href;

    // 	});
    // 	return playlistUrl;
    // }
    return "nope";
  }
}
