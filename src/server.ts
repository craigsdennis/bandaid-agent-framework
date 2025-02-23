import { createOpenAI } from "@ai-sdk/openai";
import {
  Agent,
  routeAgentRequest,
  type Connection,
  type ConnectionContext,
} from "@cloudflare/agents";
import { generateText } from "ai";
import type { WSMessage } from "partyserver";

import { Orchestrator } from "./agents/orchestrator";
import { PosterAgent } from "./agents/poster";
import { SpotifyUserAgent } from "./agents/spotify-user";
import { SpotifyResearcher } from "./workflows/spotify-researcher";

export {Orchestrator, PosterAgent, SpotifyUserAgent, SpotifyResearcher};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
  async queue(batch: MessageBatch<{ action: string; object: { key: string } }>, env: Env) {
		for (const msg of batch.messages) {
			const payload = msg.body;
			const key: string = payload.object.key as string;
			switch (payload.action) {
				case 'PutObject':
					console.log('Adding Poster for key', key);
					const orchestratorId = env.Orchestrator.idFromName("main");
					const orchestrator = env.Orchestrator.get(orchestratorId);
					await orchestrator.submitPoster(`r2://${key}`);
				default:
					console.log(`Unhandled action ${payload.action}`, payload);
					break;
			}
			msg.ack();
		}
	},

} satisfies ExportedHandler<Env>;
