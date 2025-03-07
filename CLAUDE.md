# CLAUDE.md: Agent Framework Project Guidelines

## Build/Run Commands
- `npm start` - Start development server (Vite)
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm run build` - Build the application
- `npm run preview` - Preview the build locally

## Code Style Guidelines
- **TypeScript**: Strict mode with ESNext target
- **Imports**: Group by 1) third-party 2) local; mark type imports with `type`
- **Naming**:
  - PascalCase: Components, Classes, Types (`SpotifyArtist`, `PosterAgent`)
  - camelCase: Variables, functions, methods (`getBandNames`)
  - kebab-case: Component filenames (`spotify-artist.tsx`)
- **Formatting**: 2-space indentation, semicolons, trailing commas
- **Types**: Use explicit typing, Zod for validation
- **Components**: Functional React components with hooks
- **Error Handling**: Use optional chaining, null checks, early returns
- **State**: Agent pattern for main state, React hooks for UI

## Architecture Notes
- Agent-based architecture with Orchestrator managing agent communication
- Front-end uses React with TypeScript
- Deploys to Cloudflare Workers