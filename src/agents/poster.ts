import {
  Agent,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "@cloudflare/agents";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";

const EventSchema = z.object({
  venue: z.string({
    description: "The name of the venue where the event is happening",
  }),
  location: z.string({
    description: "The name of the city where this is happening",
  }),
  date: z.string({
    description: "The date and time when this is happening in ISO 9601 format",
  }),
  isUpcoming: z.boolean({
    description:
      "Have all concert dates not yet happened, or is this from the past",
  }),
});

const PosterMetadataSchema = z.object({
  // Often there are numerous bands
  bandNames: z.array(z.string()),
  // There can be multiple places on a poster
  events: z.array(EventSchema),
  tourName: z.string({
    description:
      'The name of the tour if it exists, otherwise use the headliner, location, and the year. Example: "Beastie Boys - New York - 1986"',
  }),
  slug: z.string({
    description:
      "A suggested URL safe slug for this event, based on headlining band, location, and the year",
  }),
});

export type PosterMetadata = z.infer<typeof PosterMetadataSchema>;

export type SpotifyArtistSummary = {
  name: string;
  uri: string;
  spotify_url: string;
  genres: string[];
  description?: string;
  topTracksUris?: string[];
};

export type PosterState = {
  imageUrl: string;
  spotifyArtistSummaries?: SpotifyArtistSummary[];
} & PosterMetadata;

export class PosterAgent extends Agent<Env, PosterState> {
  async initialize(url: string) {
    let imageUrl = url;
    if (url.startsWith("r2://")) {
      const key = url.replace("r2://", "");
      // BAND_AID is the r2 bucket
      const fileUpload = await this.env.BAND_AID.get(key);
      if (fileUpload === null) {
        return;
      }
      const contentType = fileUpload.httpMetadata?.contentType;
      const aBuffer = await fileUpload.arrayBuffer();
      const base64String = Buffer.from(aBuffer).toString("base64");
      imageUrl = `data:${contentType};base64,${base64String}`;
    }
    const oai = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });
    const completion = await oai.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the information from this concert poster. The current date is ${new Date()}`,
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: zodResponseFormat(PosterMetadataSchema, "poster"),
    });
    const posterMetadata = completion.choices[0].message
      .parsed as PosterMetadata;
    const state = { imageUrl: url, ...posterMetadata };
    this.setState(state);
  }

  onStateUpdate(
    state: PosterState | undefined,
    source: Connection | "server"
  ): void {
    console.log("Poster state updated");
  }

  onConnect(
    connection: Connection,
    ctx: ConnectionContext
  ): void | Promise<void> {
    console.log("A client has connected");
  }

  getSlug() {
    return this.state?.slug;
  }

  setSlug(slug: string) {
    const state = this.state as PosterState;
    state.slug = slug;
    this.setState(state);
  }

  getBandNames() {
    return this.state?.bandNames;
  }

  async getTourName() {
    return this.state?.tourName;
  }

  async getTrackUris(): Promise<string[]> {
    const summaries = this.state?.spotifyArtistSummaries as SpotifyArtistSummary[];
    return summaries?.flatMap((summary) => summary.topTracksUris as string[]); 
  }

  addSpotifyArtistSummary(summary: SpotifyArtistSummary) {
    const summaries = this.state?.spotifyArtistSummaries || [];
    summaries.push(summary);
    this.setState({...this.state as PosterState, spotifyArtistSummaries: summaries});
  }

  getPublicPosterUrl(): string | undefined {
    const url = this.state?.imageUrl;
    if (!url) return;
    let publicUrl = url;
    if (url.startsWith("r2://")) {
      publicUrl = `${this.env.PUBLIC_POSTER_HOST}/${url.replace("r2://", "")}`;
    }
    return publicUrl;
  }

  onMessage(connection: Connection, message: WSMessage): void | Promise<void> {}
}
