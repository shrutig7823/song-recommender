# Song Recommender

Pick a song you like and get 5 similar songs. A beginner-friendly machine learning project: it turns each song into numbers and recommends the songs whose numbers are closest. It does not listen to audio.

**Open `index.html` in a browser** to use it. No installs, no internet needed (fonts fall back to system fonts offline).

## How it works

1. **Load** the song list (`ALL_2000_Songs.csv`, 2,000 songs).
2. **Clean and describe.** Remove empty and duplicate rows. Join genre, artists, mood tags, language and album into one lowercase line per song, with spaces removed inside names (`Arijit Singh` becomes `arijitsingh`).
3. **Turn text into numbers.** Count how often each word appears per song (the same idea as scikit-learn's `CountVectorizer`).
4. **Compare songs** with cosine similarity: 0 means nothing in common, 1 means identical.
5. **Recommend.** Score the chosen song against all songs, skip itself, keep the top 5.
6. **Emotion.** Every song has a main and a second emotion. Each emotion is a point on a map (how positive it feels, how intense it feels), so "sad" is close to "nostalgic" and far from "euphoric".
7. **Mix.** Combine tags and emotion with weights.
8. **Theme, occasion, year.** Lyric theme (what the words are about), where the song is played (party, workout, long drive...), and release year.
9. **Final score** = each factor's match x its weight, added up, divided by the total weight. The page has one slider per factor.

## Files

| File | What it is |
|---|---|
| `index.html` | The finished app (one file, data included). Same as `song-recommender.html`. |
| `song_recommender.ipynb` | Step-by-step learning notebook in Python. Open it in Google Colab. |
| `song_emotions.csv` | Emotion labels per song (main, second, confidence). |
| `song_context.csv` | Year, lyric theme and occasions per song. |
| `step2_make_tags.js` ... `step7_context.js` | The model, one step per file, with comments. Run with Node. |
| `page_template.html` + `build_web.js` | Build `index.html` from the template and the data. |
| `build_notebook.js` | Rebuilds the notebook and the two label CSVs. |
| `export_batches.js` | Splits songs into batches for labelling. |
| `pull_spotify.js` | Pulls songs released 2011-2025 from the Spotify Web API into `new_songs.csv`. |
| `emotions/out/`, `context/out/` | The raw label files the build scripts read. |

`ALL_2000_Songs.csv` (the source song list) is not included in this repo. Put it in the project folder yourself if you are allowed to share it.

## Run it

Needs Node 18 or newer.

```bash
node step5_recommend.js ALL_2000_Songs.csv "Khairiyat"
node step7_context.js ALL_2000_Songs.csv "Khairiyat"
node build_web.js ALL_2000_Songs.csv
```

The last command rebuilds `index.html`.

**Notebook:** upload `song_recommender.ipynb` to https://colab.research.google.com, run the cells from the top, and upload `ALL_2000_Songs.csv`, `song_emotions.csv` and `song_context.csv` when Step 1 asks.

## Put it online with GitHub Pages (free, personal account)

1. Create a GitHub account with a **personal** email.
2. Create a new repository named `song-recommender` (public).
3. Click **Add file > Upload files**, drag in everything in this folder, and commit. Do not upload `ALL_2000_Songs.csv` unless you may share it.
4. Open **Settings > Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
5. After a minute your page is at `https://YOUR-USERNAME.github.io/song-recommender/`.

The public page contains the song list and labels, because they are built into `index.html`. Only publish it if that is fine for your data.

## Add more songs from Spotify

`pull_spotify.js` needs a Spotify **Premium** account and a free developer app (https://developer.spotify.com/dashboard). Use a personal account. Set the keys in your own terminal, never in a file:

```bash
$env:SPOTIFY_CLIENT_ID="..."
$env:SPOTIFY_CLIENT_SECRET="..."
node pull_spotify.js ALL_2000_Songs.csv 1500
```

Spotify limited the API for new apps in 2026 (Premium required, search returns 10 songs per request), so check https://developer.spotify.com/documentation/web-api if it stops working. New songs then need emotion, theme, occasion and language labels like the existing ones.

## Know the limits

- **Emotion, theme, occasion and year labels were written by an AI** from what it knows of each song, not by listening and not by copying lyrics. Some are guesses (see the `*_confidence` columns), and years are the weakest. For classical pieces the year is when the piece was composed.
- It recommends songs that **look similar on paper**. It does not know what people listen to.

## Ideas to improve it

1. TF-IDF instead of raw counts, so very common words like `english` count for less.
2. Weight artist, genre and mood differently.
3. A language filter.
4. Real audio features (energy, valence) instead of AI-written emotion labels.
5. Ask friends to rate recommendations from different weight settings and keep the best.
6. Learn from listening history (a different kind of model).
