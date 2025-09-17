import {
  Agent,
  getAgentByName,
  type AgentContext,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "agents";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const EventSchema = z.object({
  venue: z.string().meta({
    description: "The name of the venue where the event is happening",
  }),
  location: z.string().meta({
    description: "The name of the city where this is happening",
  }),
  date: z.string().meta({
    description:
      "The date and time when this is happening in ISO 9601 format. Determine year based on day of the week and date if year is not provided.",
  }),
  isUpcoming: z.boolean().meta({
    description:
      "Have all concert dates not yet happened, or is this from the past",
  }),
});

const PosterMetadataSchema = z.object({
  // Often there are numerous bands
  bandNames: z.array(z.string()),
  // There can be multiple places on a poster
  events: z.array(EventSchema),
  tourName: z.string().meta({
    description:
      'The name of the tour if it exists, otherwise use the headliner, location, and the year. Example: "Beastie Boys - New York - 1986"',
  }),
  slug: z.string().meta({
    description:
      "A suggested URL safe slug for this event, based on headlining band, location, and the year",
  }),
});

export type PosterMetadata = z.infer<typeof PosterMetadataSchema>;

const PosterMetadataJsonSchema = {
  type: "object",
  properties: {
    bandNames: {
      description: "A list of band names found on the poster",
      items: { type: "string" },
      type: "array",
    },
    events: {
      description: "Details for each event listed on the poster",
      items: {
        additionalProperties: false,
        properties: {
          venue: {
            description:
              "The name of the venue where the event is happening",
            type: "string",
          },
          location: {
            description:
              "The name of the city where this is happening",
            type: "string",
          },
          date: {
            description:
              "The date and time when this is happening in ISO 9601 format. Determine year based on day of the week and date if year is not provided.",
            type: "string",
          },
          isUpcoming: {
            description:
              "Have all concert dates not yet happened, or is this from the past",
            type: "boolean",
          },
        },
        required: ["venue", "location", "date", "isUpcoming"],
        type: "object",
      },
      type: "array",
    },
    tourName: {
      description:
        'The name of the tour if it exists, otherwise use the headliner, location, and the year. Example: "Beastie Boys - New York - 1986"',
      type: "string",
    },
    slug: {
      description:
        "A suggested URL safe slug for this event, based on headlining band, location, and the year",
      type: "string",
    },
  },
  required: ["bandNames", "events", "tourName", "slug"],
  additionalProperties: false,
} as const;

export type SpotifyArtistSummary = {
  name: string;
  uri: string;
  spotify_url: string;
  genres: string[];
  description?: string;
  topTracksUris?: string[];
};

export type PosterState = {
  uploadedImageUrl: string;
  imageUrl?: string;
  posterR2Url?: string;
  listenCount?: number;
  spotifyArtistSummaries?: SpotifyArtistSummary[];
} & PosterMetadata;

export class PosterAgent extends Agent<Env, PosterState> {
  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.sql`CREATE TABLE IF NOT EXISTS listeners (
      spotify_user_id TEXT PRIMARY KEY,
      listen_count INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  }

  async trackListener(spotifyUserId: string) {
    const rows = this
      .sql`SELECT listen_count FROM listeners WHERE spotify_user_id=${spotifyUserId}`;
    if (rows.length === 0) {
      this
        .sql`INSERT INTO listeners (spotify_user_id, listen_count) VALUES (${spotifyUserId}, 0);`;
    } else {
      const currentCount = rows[0].listen_count as number;
      this.sql`UPDATE listeners SET listen_count=${
        currentCount + 1
      } WHERE spotify_user_id=${spotifyUserId}`;
    }
    const [row] = this.sql`SELECT SUM(listen_count) from listeners`;
    this.setState({
      ...(this.state as PosterState),
      listenCount: row.listen_count as number,
    });
  }

  async initialize(url: string) {
    let imageUrl = url;
    if (url.startsWith("r2://uploads/")) {
      const key = url.replace("r2://uploads/", "");
      const fileUpload = await this.env.UPLOADS.get(key);
      if (fileUpload === null) {
        return;
      }
      const contentType = fileUpload.httpMetadata?.contentType;
      const aBuffer = await fileUpload.arrayBuffer();
      const base64String = Buffer.from(aBuffer).toString("base64");
      imageUrl = `data:${contentType};base64,${base64String}`;
    }
    const oai = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });
    const posterTextFormat = zodTextFormat(PosterMetadataSchema, "poster");
    posterTextFormat.schema = PosterMetadataJsonSchema;
    const response = await oai.responses.parse({
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Extract the information from this concert poster. The current date is ${new Date()}.`,
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "auto",
            },
          ],
        },
      ],
      text: {
        format: posterTextFormat,
      },
    });
    const posterMetadata = response.output_parsed;
    const stateOverrides = { uploadedImageUrl: url, ...posterMetadata };
    this.setState({
      ...this.state,
      ...stateOverrides,
    });
  }

  async onStateUpdate(
    state: PosterState | undefined,
    source: Connection | "server"
  ): Promise<void> {
    console.log("Poster state updated");
    const orchestrator = await getAgentByName(this.env.Orchestrator, "main");
    await orchestrator.onPosterChange(this.name);
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
    const summaries = this.state
      ?.spotifyArtistSummaries as SpotifyArtistSummary[];
    return summaries?.flatMap((summary) => summary.topTracksUris as string[]);
  }

  addSpotifyArtistSummary(summary: SpotifyArtistSummary) {
    const summaries = this.state?.spotifyArtistSummaries || [];
    summaries.push(summary);
    this.setState({
      ...(this.state as PosterState),
      spotifyArtistSummaries: summaries,
    });
  }

  getUploadedImageUrl(): string {
    return this.state?.uploadedImageUrl as string;
  }

  getPosterR2Key() {
    return this.state.posterR2Url?.replace("r2://posters/", "");
  }

  setPosterR2Url(r2Url: string) {
    const imageUrl = `${this.env.PUBLIC_POSTERS_HOST}/${r2Url.replace(
      "r2://posters/",
      ""
    )}`;
    this.setState({
      posterR2Url: r2Url,
      imageUrl,
      ...(this.state as PosterState),
    });
  }

  getPublicPosterUrl(): string | undefined {
    // Use the new one if it exists
    if (this.state?.imageUrl) {
      return this.state.imageUrl;
    }
    // Hasn't been transformed yet
    const url = this.state?.uploadedImageUrl;
    if (!url) return;
    let publicUrl = url;
    if (url.startsWith("r2://uploads/")) {
      publicUrl = `${this.env.PUBLIC_UPLOADS_HOST}/${url.replace(
        "r2://uploads/",
        ""
      )}`;
    }
    return publicUrl;
  }
}
