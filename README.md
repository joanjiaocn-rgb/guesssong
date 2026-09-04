# NoteGuess - guesssong.me

NoteGuess is a static, browser-based `Guess the Song Game` MVP for [guesssong.me](https://guesssong.me/). It uses the Web Audio API to play original arrangements of public-domain melodies, so the game can be tested without commercial music licensing.

## Run locally

From this directory, run `python -m http.server 4173` and open http://localhost:4173.

The game is intentionally backend-free: scores and streaks stay in local storage, and the share button uses the Web Share API or clipboard fallback.

## Cloudflare Pages

The repository includes `wrangler.toml` for the `guesssong` Pages project. After authenticating Wrangler, deploy the static root with `npx wrangler pages deploy . --project-name guesssong`.
