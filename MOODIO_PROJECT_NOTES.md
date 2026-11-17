# Moodio: complete project notes

Written for resume writing and for giving an AI assistant (such as ChatGPT) full context. Everything here is what was actually built or tried, including what did not work. Nothing here is a secret. Do not add API keys to this file.

- **Live app:** https://shrutig7823.github.io/song-recommender/
- **Code:** https://github.com/shrutig7823/song-recommender
- **Date of these notes:** 2026-11-18

---

## 1. One-paragraph summary

Moodio is a **content-based music recommender** that runs entirely in the browser. You pick a song and it returns five songs that "feel the same" from five different artists. Each song is described by text tags, an emotion, a lyric theme, the occasions it is played at, its release year, its language and its popularity. The app scores your song against all 3,292 songs in the library, combines the scores with adjustable weights, and shows the top five. Every result can be played on the page. It started as a beginner machine learning exercise (a movie recommender from a tutorial) and was adapted to songs, step by step.

## 2. The goal, and the plan for V2

**Original goal (learning):** build a first machine learning model in a step-by-step, beginner-friendly way, so the builder understands each step and can extend it into a better product. The starting point was a movie recommender: load the TMDB 5000 dataset, clean it, turn the text of each movie into a vector with `CountVectorizer(max_features=5000)`, compare movies with cosine similarity, and recommend the 5 nearest.

**Pivot:** the same idea for songs instead of movies.

**Goal for the product:** recommendations that match how a song *feels*, not just its artist or genre. Early results showed the problem: two songs with identical tags (for example Khairiyat, a heartbreak song, and Woh Din, a nostalgic song, both tagged "love, romantic") scored as near-identical, and one artist could fill the whole list. So the model was extended with emotion, lyric theme, occasion, year, language, popularity and an artist-variety rule.

**V2 goal (what the builder asked for):**
1. **Understand lyrics.** Read each song's lyrics, work out what the song is about and how it feels, group songs accordingly, and recommend using that.
2. **Real Spotify data.** Pull songs and metadata from Spotify and make it a real product (play music, real release dates, popularity).
3. **Make it live and presentable**, with a Spotify-like interface, and with every song playable.
4. **Independence from the builder's employer.** The app, code, hosting and accounts must all live on personal accounts, so the project survives leaving the company.

**What was done toward the lyrics goal:**
- Lyrics are copyrighted, so the AI does not copy or store them. Each song's *lyric theme* (love, heartbreak, nostalgia, party, ambition, struggle, rebellion, devotion, freedom, reflection) was labelled by an AI model from what it knows of the song, not from lyric text.
- A licensed lyrics API (Musixmatch) was checked. It is now paid (plans start at $49 per month, with only 500 lyric requests a day on the lowest plan), so it was skipped.
- A free community lyrics database (LRCLIB, no key needed) was tried on a **100-song test**. It had lyrics for 82 of the 100 songs (English 41/45, Hindi 29/40, Punjabi 12/15). The lyric text was held only in a temporary folder, read once by an AI model to judge each song's theme and emotion, and then deleted. Nothing was stored, committed or published. Result: the lyric-based theme matched the AI-memory theme **61%** of the time, the main emotion **44%**, and main-or-second emotion **73%**. Neither set of labels is ground truth, so lyrics were not rolled out to all songs.
- **Status:** lyric-based labelling is a V2 research track, not part of the live recommender. The live app uses AI-judged themes.

## 3. The most important honesty points (read before writing a resume)

- **No neural network is used.** The recommender uses count vectors, cosine similarity and hand-set weights. Do not write "neural network", "deep learning" or "trained model".
- **Nothing is trained.** There is no training step, no learned parameters and no measured accuracy. The weights (35, 25, 20, 5, 15, 15) were chosen by hand and can be changed with sliders in the app. No A/B test or user study has been done.
- **An AI model (Claude) was used as a labelling tool.** It produced the emotion, lyric theme, occasion, language and popularity labels for the songs, and estimated release years for the original 2,000 songs. Many labels are guesses and are flagged as such in the data. For the 1,292 songs pulled from Spotify, release years are real Spotify dates.
- **Popularity is an AI estimate** (scale 1 to 5), about 40 percent flagged as guesses. Real play counts were tried (Deezer returned nothing from India, and Last.fm needed an account) and are still a to-do.
- **The Python notebook was never executed** on the builder's laptop, because a Windows security policy blocked pandas. Its code was only checked for syntax. The live app is JavaScript.
- **The original 2,000-song CSV came from outside** (provided to the builder). It is not in the GitHub repo. The song list itself is visible inside the public web page, so check that sharing it is allowed.

## 4. What the app does (features)

- Search any of the 3,292 songs, or press **Surprise me**, or tap a **mood tile** (11 emotions) or a **popularity tile**.
- Shows the chosen song as a banner with its emotion, lyric theme and occasions, then **five recommendations** with a match percentage, mood tags, a popularity badge and a "why this match" breakdown.
- **Tune the mix** (sidebar): sliders for each scoring factor, an artist-variety setting, and a "only recommend songs that are..." popularity setting.
- **Play** buttons on every song, plus a now-playing bar at the bottom.
- A "How Moodio works" section that explains the steps using the chosen song as the example.
- Spotify-inspired, dark-only interface (own logo and name, not Spotify's).

## 5. Data

**Starting file:** `ALL_2000_Songs.csv`, 2,000 songs, no missing values, no duplicates. Columns: `track_name`, `artist` (several names joined by `;`), `genre`, `album_name`, `tags` (mood words like "love; romantic"), `description` (a template sentence, ignored), `language`. Languages: English 1,200, Undetermined 315, Spanish 200, Hindi 200, Instrumental 85. Genres included Bollywood, R&B, hip-hop, pop, dance, rock, metal, classical and more (about 50 in total).

**Added from Spotify:** 1,292 songs released 2011 to 2025, pulled with the Spotify Web API (see section 8). Spotify has no language field, so language was labelled by the AI. The pull was also meant to cover Hindi and Punjabi, but Spotify's daily limit ran out; only about 120 new Hindi and 15 new Punjabi songs were collected.

**Merged library:** 3,292 songs.

**Features per song:**

| Feature | Source |
|---|---|
| Text tags (genre, artists, mood tags, language, album) | CSV, and AI-chosen mood tags for new songs |
| Main emotion and second emotion (11 types) | AI labels |
| Lyric theme (10 types) | AI labels |
| Occasions (party, workout, long drive, romantic date, wedding, chill, focus, festival, sleep, prayer) | AI labels |
| Release year | AI estimate for the original 2,000 (331 flagged as guesses); real Spotify date for the new 1,292 |
| Language | CSV, and AI labels for new songs |
| Popularity (1 to 5) | AI estimate |
| Spotify track ID | Spotify API, for the 1,292 pulled songs |

**The 11 emotions:** heartbreak, sad, nostalgic, mellow, romantic, happy, euphoric, confident, angry, intense, spiritual.

## 6. How the recommendations are calculated

For a chosen song *i*, every other song *j* gets six scores between 0 and 1, which are combined into one:

1. **Tags score**: cosine similarity between the two songs' count vectors. Each song's text is its genre, artists, mood tags, language and album, lowercased, with spaces removed inside names (so "Arijit Singh" becomes one word, `arijitsingh`) and with duplicate genre names merged. The vocabulary is the most common words (up to 5,000), like scikit-learn's `CountVectorizer`.
2. **Emotion score**: each emotion is a point on a 2-axis map of *how positive it feels* and *how intense it feels* (for example sad = 0.15 positive, 0.20 intense; euphoric = 0.90, 0.95). A song's point is 70% of its main emotion plus 30% of its second. The score is `1 - distance / sqrt(2)`, so sad is close to nostalgic and far from euphoric.
3. **Theme and occasion score**: half the lyric-theme match (1 if the same, a partial score such as 0.4 for related themes like love and heartbreak) and half the occasion overlap (shared occasions divided by all different occasions).
4. **Era score**: 1 for the same release year, falling to 0 when the songs are 25 or more years apart.
5. **Language score**: 1 if the language is the same, 0 otherwise.
6. **Popularity score**: the candidate song's popularity, scaled 0 to 1.

**Final score** = (35 x tags + 25 x emotion + 20 x theme-and-occasion + 5 x era + 15 x language + 15 x popularity) / 115. The weights are relative and adjustable in the app.

**Then:** candidates below the chosen popularity setting are removed (default: hits and popular songs only). The ranked list is walked from the top, and a song is skipped if any of its artists already appears, so the five results come from five different artists ("artist variety"). The top five are shown.

**Complexity:** scoring 3,292 songs for one query is a few million operations. It runs instantly in the browser, so no server or database is needed.

## 7. Machine learning: what it is and is not

**Used (classical, not trained):**
- Text feature extraction: bag-of-words count vectors (same idea as `CountVectorizer`).
- Cosine similarity for nearest-neighbour style recommendation (content-based filtering).
- Hand-designed feature fusion: a weighted sum of six similarity scores.
- A 2-D valence-energy style emotion space (valence = how positive, energy = how intense), a standard idea in music emotion research.

**Used as a tool:** a large language model (Claude) to label songs (emotion, theme, occasion, language, popularity, mood tags) and to estimate some release years. Labels came in batches from several parallel AI helpers, each saving to JSON, then validated for allowed values.

**Not used:** neural networks, embeddings, trained models, collaborative filtering (no listening history exists), audio analysis.

**Ideas for V2 and beyond (not built), roughly easiest first:**
1. **Measure quality.** Ask people to rate recommendations, or check precision against held-out playlists.
2. **Learn the weights** from those ratings instead of choosing them by hand (for example by optimising a ranking metric).
3. **TF-IDF** instead of raw counts, so very common words like "english" count less.
4. **Lyric embeddings.** Use a sentence-embedding model on lyric text to find songs with similar meaning, then add that similarity as a feature. This is the natural next step for the "understand lyrics" goal, and would require licensed lyrics access.
5. **Real audio features** (energy, valence, tempo) instead of AI-written emotion labels.
6. **Collaborative filtering** (what listeners with similar histories play) if listening data becomes available.

## 8. Tech stack and services

**App (what runs in the browser)**
- Plain JavaScript, HTML and CSS, in a single `index.html` built from `page_template.html`.
- Google Fonts (Inter and Space Grotesk).
- Hosted on **GitHub Pages**, from a public GitHub repository under a personal account.

**Data pipeline and tooling**
- **Node.js** scripts: tag building, vectorising, similarity, emotion, context scoring, merging, building the page and the notebook, calling the Spotify API.
- **Python** notebook (`song_recommender.ipynb`) using pandas and scikit-learn (`CountVectorizer`, `cosine_similarity`), for learning and Google Colab. Not run locally; syntax-checked only.
- **Git and GitHub** for version control and deployment.
- **Claude** for AI-assisted labelling and as the coding assistant that built the project.

**External services**
| Service | Used for | Notes |
|---|---|---|
| **Spotify Web API** (client credentials login) | Pulling 1,292 songs with real release dates and track IDs | Needs a Premium account for the developer app in 2026. Search returns 10 songs per request. Hit a daily quota, so it must be run again the next day to collect more (especially Hindi and Punjabi). Spotify's own recommendation and audio-feature data are **not** used. |
| **Spotify embedded player** | Playing songs that have a Spotify ID | 30-second previews for free listeners, full songs when signed in to Spotify. |
| **iTunes Search API** (free, no key) | 30-second preview and album art for songs without a Spotify ID | Looked up when Play is pressed. It is rate-limited to roughly 20 requests a minute per user, so it works for normal use but not bulk checks. |
| **LRCLIB** | A 100-song lyrics test only | Free, no key. Lyric text was kept only in a temporary folder and deleted. |

**Tried and dropped**
- **Deezer API** for popularity: returns empty results from India.
- **Musixmatch API**: paid only.
- **Last.fm API** for real popularity: planned, needs a free personal account and key; not completed.

## 9. How it was built (timeline)

1. **Beginner method.** Reproduced the movie recommender steps: load, clean, tags, `CountVectorizer`, cosine similarity, recommend top 5.
2. **Switched to songs** with the 2,000-song CSV. Python's pandas was blocked on the laptop by a Windows application-control policy, so the model was rebuilt in JavaScript (Node), with the same logic, written one step per file with comments: load and clean (Step 2), vectors (Step 3), similarity (Step 4), recommend (Step 5).
3. **First live page** (single HTML file, published privately), then a **Python learning notebook** with a "Try this" box after each step.
4. **Emotion factor** added after noticing songs with identical tags could feel completely different. Eight AI helpers labelled all 2,000 songs; emotions became points on the positive-intense map (Step 6).
5. **Year, lyric theme and occasion** added (Step 7), again by AI labelling. Four sliders on the page.
6. **Artist variety** added after one artist filled the top results.
7. **Independence from the employer:** project moved to a personal folder, then a personal GitHub account with GitHub Pages. The live link moved from a work-account link to a personal one.
8. **Spotify pull** (V2): created a Spotify developer app, wrote a script to pull songs; fixed a bug where it took only 2011 and 2012 songs (it now samples all years in shuffled order); hit the daily quota; pruned then restored off-language genres (the builder asked to keep all genres); labelled the new songs; merged to 3,292 songs.
9. **Playback**: first with Spotify embeds (needs IDs), then, after the builder asked for no redirects to Spotify, in-page playback with iTunes previews for every other song.
10. **Language factor** added after a Punjabi song was matched with a Japanese one.
11. **Lyrics test** with LRCLIB (see section 2).
12. **Renamed to Moodio.**
13. **Spotify-inspired redesign** (sidebar, colored banner, track list, now-playing bar, mood tiles) and a CSS fix for stretched tag pills.
14. **Popularity** added: AI ratings from 1 to 5, a popularity filter that hides lesser-known songs by default, and popularity tiles.

## 10. Everything the builder asked for, in order (requirements log)

1. Build the movie recommender from the video, then **do it for songs instead**.
2. Make the project **step by step and beginner friendly**, with examples, so the builder understands it and can build on it.
3. **Publish it today** and make it live.
4. Use **their CSV** (`ALL_2000_Songs.csv`); ask for column requirements.
5. Add the **emotion** factor (Khairiyat is sad and mellow, Woh Din is nostalgic).
6. Add **release year**, whether songs are played together at a **party**, and group by **lyrics**.
7. **Stop recommending the same artist** repeatedly.
8. **Connect to Spotify**, and Spotify for V2.
9. **Independence from the work email and office**: personal GitHub and Pages.
10. Pull Spotify data: first all genres, then **Hindi, Punjabi and English, 2010 to 2026**, later **keep all genres** after pruning.
11. Use **real lyrics** for context without storing them.
12. **Play music** on the page, with **no redirect to Spotify**, **every song playable**.
13. Make the UI **Spotify-like, deep dark colors**, presentable, not "like a random artifact".
14. Name the app **Moodio**.
15. **Group by popularity** and exclude songs that are not played much (for example lesser-known Himesh Reshammiya songs), using **real popularity data**.
16. Create **this notes file** for a resume and for giving ChatGPT context.

## 11. Known limitations and open items

- Labels (emotion, theme, occasion, popularity, some years) are AI-generated, many are guesses, and no accuracy has been measured.
- Popularity is an estimate; real data needs a Last.fm key or Spotify's popularity field (Spotify removed some fields for new apps in 2026, so this is not guaranteed).
- The original 2,000 songs have no Spotify ID, so they use 30-second iTunes previews. Looking up their Spotify IDs needs another Spotify run after the daily limit resets.
- Some songs may have no available preview. This was measured only on small samples, because the iTunes search is rate-limited, so the exact share of fully playable songs is not known.
- Hindi and Punjabi coverage is thin.
- The notebook has not been run end to end.
- The repository is public, and the page contains the full song list.

## 12. Resume-safe wording

Use phrases like these, and avoid the claims in section 3.

- Built **Moodio**, a browser-based music recommender over a 3,292-song library, using bag-of-words vectors and cosine similarity combined with emotion, lyric-theme, occasion, release-year, language and popularity features in an adjustable weighted score.
- Modelled song emotion as a 2-D positive-intensity space so that similar feelings (sad and nostalgic) score as close, which fixed cases where songs with identical tags felt completely different.
- Added an artist-variety re-ranking rule so recommendations come from different artists.
- Used the Spotify Web API to expand the library with real release dates and track IDs, embedded Spotify and iTunes players so every song can be played in the page, and deployed the app on GitHub Pages.
- Used an LLM as a labelling tool (emotion, theme, occasion, popularity) in parallel batches with schema validation, and tested lyric-based labelling on a 100-song sample (61% theme agreement with LLM labels) while keeping lyrics out of storage.

## 13. A ready-to-paste context prompt for ChatGPT

> I built a project called Moodio, a content-based music recommender. Live at https://shrutig7823.github.io/song-recommender/ and code at https://github.com/shrutig7823/song-recommender. It runs in the browser in plain JavaScript, hosted on GitHub Pages. The library is 3,292 songs (2,000 from a provided CSV plus 1,292 pulled with the Spotify Web API). Recommendations use bag-of-words count vectors and cosine similarity on song text tags, plus an emotion distance on a 2-D positive-intensity map, lyric-theme and occasion overlap, release-year closeness, language match and popularity, mixed with hand-set adjustable weights, then an artist-variety re-ranking so the 5 results come from different artists. There is no neural network and no trained model. The emotion, lyric theme, occasion and popularity labels were generated by an LLM and many are guesses. Songs play via the Spotify embed player (for songs with a Spotify ID) and iTunes 30-second previews (others). A V2 goal is to use real lyrics to improve themes and emotions: a licensed API (Musixmatch) is paid, and a 100-song test with the free LRCLIB database showed 61% agreement on lyric theme with the LLM labels. Please help me write accurate resume bullets and an interview explanation without overstating the ML.

## 14. File map (in the project folder and repo)

| File | Purpose |
|---|---|
| `index.html` | The finished app (data and code in one file) |
| `page_template.html`, `build_web.js` | Template and builder for `index.html` |
| `step2_make_tags.js` to `step7_context.js` | The model, one step per file |
| `build_merged.js`, `csv_util.js`, `prepare_new_batches.js`, `prune_new_songs.js` | Data merging and helpers |
| `pull_spotify.js` | Pulls songs from the Spotify Web API |
| `lyrics_test.js` | The 100-song lyrics test (lyrics are not stored) |
| `fetch_lastfm.js` | Real popularity from Last.fm (needs a personal API key; not run yet) |
| `song_recommender.ipynb` | Step-by-step Python notebook for Google Colab |
| `song_emotions.csv`, `song_context.csv` | Label files per song |
| `emotions/out`, `context/out`, `new/out`, `popularity/out` | Raw AI label files |
| `README.md` | Public readme |
| `MOODIO_PROJECT_NOTES.md` | This file |
