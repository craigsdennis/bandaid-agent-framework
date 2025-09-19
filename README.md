# BandAid - Listen to Concert Posters

[<img src="https://img.youtube.com/vi/yQCWCWTGnDM/0.jpg">](https://youtu.be/yQCWCWTGnDM "Use the Agents SDK to listen to concert posters")

This app is a Work in Progress, like we all are.

I love live music but there are so many bands that come through my town that I don't know about. I find it overwhelming, I'll take photos, and **sometimes** (narrator: he never does) I remember to research them.

I created an app that parses those band poster photos, extracts the bands, researches the bands and venues, and creates a Spotify playlist.

It uses the [Agents SDK](https://agents.cloudflare.com), [Workflows](https://developers.cloudflare.com/workflows), our zero egress fee object store [R2](https://developers.cloudflare.com/r2), [Images](https://developers.cloudflare.com/images) for rescaling and resizing, [Browser Rendering](https://developers.cloudlfare.com/browser-rendering).

## Develop

Copy [.dev.vars.example](./.dev.vars.example) to `.dev.vars`

```bash
npm run dev
```

## Deploy

Upload your secrets 

```bash
npx wrangler secret bulk .dev.vars
```

```bash
npm run deploy
```


