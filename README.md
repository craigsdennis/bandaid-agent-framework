# 🧠 Cloudflare AI Agents Starter

A starter template for building AI-powered agents using Cloudflare's Agent platform. This project demonstrates how to create an interactive AI agent that can maintain state and process requests using Cloudflare's distributed infrastructure.

## Features

- 🤖 Stateful AI agent communication
- ⚡️ Powered by Cloudflare Agents for serverless execution
- 🧠 Integration with OpenAI's GPT models
- ⚛️ React-based frontend with ready-to-use agent hooks
- 🔄 Seamless client-agent interaction

## Prerequisites

- Cloudflare account
- (optional) OpenAI API key

## Getting Started

1. Create a new Cloudflare project with this template:

```bash
npm create cloudflare@latest -- --template threepointone/agents-starter
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a `.dev.vars` file in your project root (based on `.dev.vars.example`). In this example, we're using an OpenAI API key.

```env
OPENAI_API_KEY=your_openai_api_key
```

4. Start the development server:

```bash
npm start
```

5. Deploy to Cloudflare:

```bash
npm run deploy
```

## Project Structure

```
├── src/
│   ├── styles.css     # CSS
│   ├── app.tsx        # Main React application
│   ├── client.tsx     # Client-side entry point
│   └── server.ts      # Agent implementation and server logic
├── .dev.vars          # Development environment variables
└── wrangler.jsonc     # Cloudflare Workers configuration
```

## How It Works

### Agent Implementation (server.ts)

The project uses Cloudflare's Agent platform to create a stateful AI agent that can:

- Process incoming requests
- Generate responses using OpenAI's models
- Maintain state between requests
- Handle multiple concurrent interactions

### Frontend (app.tsx)

The React frontend utilizes the `@cloudflare/agents/react` package to:

- Connect to your agent instance
- Send requests to the agent
- Handle responses
- Manage application state

## Deployment

To deploy your agent to Cloudflare:

1. Ensure you're logged in to Cloudflare:

```bash
npx wrangler login
```

2. Deploy your agent:

```bash
npm run deploy
```

## Learn More

- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [What are Durable Objects?](https://developers.cloudflare.com/durable-objects/what-are-durable-objects/)

## License

MIT
