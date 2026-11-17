# Moodio: find songs by mood and moment

A content-based music recommender in plain JavaScript. Pick a mood, blend two or three moods, or answer three quick questions, and get songs that fit. No account and no listening history needed.

- **Live demo:** https://shrutig7823.github.io/song-recommender/
- **Code:** https://github.com/shrutig7823/song-recommender

## What you can do
- **Blend your moods:** a glowing mood map. Pick up to three moods and see songs that fit all of them.
- **Three quick questions:** a fresh start for new listeners (cold start).
- **Popular right now:** daily country charts, filterable by country and language.
- **Song page:** plain-words reasons why a song was recommended, and similar songs.
- **Play in the app:** 30-second previews for everyone. Signed-in Spotify Premium listeners get whole songs.
- **My list:** save songs, copy or download them, or send them to a Spotify playlist.

## How it works
1. Each song's text (genre, artists, mood tags, language) becomes a bag-of-words vector (up to 5,000 words).
2. Cosine similarity scores how close two songs are.
3. That score is combined with an emotion map (valence and arousal), style, theme and occasion, language, era and popularity. The weights are set by hand, and you can change them in the app.
4. Results are re-ranked so the same artist does not repeat, and strict filters relax step by step so a screen is never empty.

There is **no neural network and no trained model**. An AI model (Claude) was used once to label the songs, in batches with fixed allowed values and checked by scripts. Many labels are estimates, and `overrides.json` holds manual fixes.

## Tech
Plain HTML, CSS and JavaScript in one page, hosted free on GitHub Pages. Node.js scripts build the page and pull data. Spotify Web API (OAuth 2.0 PKCE, Web Playback SDK), iTunes Search API for previews, Apple Music charts through a daily GitHub Action (`.github/workflows/charts.yml`). No backend, database or containers.

## Run it yourself
Needs Node.js 18+.
```
node build_web.js        # builds index.html from page_template.html and the data
python -m http.server 8765
```
Open http://localhost:8765. The song CSVs are not in the repo (they come from the Spotify API); the built `index.html` already contains the data.

## Limits
- Mood, popularity and style labels are AI estimates and have not been checked with listeners.
- Whole-song playback needs Spotify Premium, and the app is in Spotify's development mode, so only added users can sign in.
- Fewer Punjabi songs, qawwalis and ghazals than Hindi and English.
- Built with an AI coding assistant (Claude Code) under my direction.
