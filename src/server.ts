import { createOpenAI } from "@ai-sdk/openai";
import {
  Agent,
  routeAgentRequest,
  type Connection,
  type ConnectionContext,
} from "@cloudflare/agents";
import { generateText } from "ai";
import type { WSMessage } from "partyserver";

type Env = {
  OPENAI_API_KEY: string;
  MyAgent: DurableObjectNamespace<MyAgent>;
};

export class MyAgent extends Agent<Env> {
  openai = createOpenAI({
    apiKey: this.env.OPENAI_API_KEY,
  });

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  onConnect(
    connection: Connection,
    ctx: ConnectionContext
  ): void | Promise<void> {
    console.log("Connected to agent");
    connection.send("Hello! I'm your AI assistant. How can I help you today?");
  }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    try {
      console.log("Message from client", message);
      const response = await generateText({
        model: this.openai("gpt-4"),
        prompt: message as string,
        maxTokens: 500,
      });

      connection.send(response.text);
    } catch (error) {
      console.error("Error processing message:", error);
      connection.send(
        "I apologize, but I encountered an error processing your message. Please try again."
      );
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
