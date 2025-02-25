# Orchestrator

(singleton?)

- [x] spawns poster agents from url
- [x] returns all posters
- [x] creates playlist for poster specific Spotify User
- [ ] periodically checks in with Spotify User
- [ ] emails about upcoming shows
- [ ] buys tickets for show

# Workflow - Spotify Researcher

- [x] gathers spotify information about known artists
- [x] adds tracks to poster for sampling

# PosterAgent

- [x] extracts bands/dates
- [x] researches bands, gathers links
- [ ] researches venue (if known)

# SpotifyUserAgent

(handles token refreshing / oauth2)
- [x] creates playlist from Poster tracks
- [x] creates playlist from Poster tracks
- [x] tracks listens to playlisted tracks
- [ ] produces listening vibe?
