# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run start` (runs Vite dev server)
- **Deploy to Cloudflare**: `npm run deploy` (builds and deploys with Wrangler)

## Architecture Overview

This is a Cloudflare Workers-based application that processes concert poster uploads and creates Spotify playlists for the artists found on them. It uses:

- **Cloudflare Durable Objects** for persistent agent state
- **Cloudflare Workflows** for async processing
- **Cloudflare R2** for file storage
- **React frontend** served as SPA

### Core Components

**Agents (Durable Objects)**:
- `Orchestrator` - Main coordinator, manages poster submissions and tracks state
- `PosterAgent` - Extracts bands/dates from poster images, researches artists
- `SpotifyUserAgent` - Handles OAuth, creates playlists, tracks listening activity

**Workflows**:
- `SpotifyResearcher` - Gathers Spotify info for discovered artists
- `ImageNormalizer` - Processes uploaded poster images

**Key Flow**:
1. User uploads poster → R2 storage → Queue message triggers Orchestrator
2. Orchestrator creates PosterAgent, kicks off Image Normalizer + Spotify Researcher workflows
3. PosterAgent extracts bands, SpotifyResearcher finds tracks
4. Users can create playlists via SpotifyUserAgent

### Technology Stack

- **Runtime**: Cloudflare Workers with Node.js compatibility
- **Framework**: Hono for HTTP routing
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Database**: SQLite (Durable Objects storage)
- **AI Integration**: Uses `agents` and `hono-agents` packages for agent orchestration

### Configuration Files

- `wrangler.jsonc` - Cloudflare Workers configuration with bindings for R2, AI, queues, and Durable Objects
- `vite.config.ts` - Vite build configuration with Cloudflare plugin
- Project uses TypeScript with strict mode enabled