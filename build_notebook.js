// Builds song_recommender.ipynb (Colab notebook) and song_emotions.csv (the emotion labels).
// Run:  node build_notebook.js "C:\path\to\songs_merged.csv"
const fs = require("fs");
const { songs } = require("./step2_make_tags.js");

// ---------- 1. the emotion labels as a CSV the notebook can load ----------
const labels = {};
for (const f of fs.readdirSync("emotions/out"))
  for (const e of JSON.parse(fs.readFileSync("emotions/out/" + f, "utf8"))) labels[e.i] = e;
const q = t => '"' + String(t).replace(/"/g, '""') + '"';
const csv = ["track_name,artist,emotion_main,emotion_second,label_confidence"];
songs.forEach((s, i) => csv.push([q(s.track_name), q(s.artist), labels[i].p, labels[i].s, labels[i].c].join(",")));
fs.writeFileSync("song_emotions.csv", csv.join("\n") + "\n");

// ---------- 1b. year / lyric theme / occasion labels as a CSV ----------
const ctx = {};
for (const f of fs.readdirSync("context/out"))
  for (const e of JSON.parse(fs.readFileSync("context/out/" + f, "utf8"))) ctx[e.i] = e;
const csv2 = ["track_name,artist,year,year_confidence,lyric_theme,occasions,label_confidence"];
songs.forEach((s, i) => csv2.push([q(s.track_name), q(s.artist), ctx[i].y, ctx[i].yc, ctx[i].theme, q(ctx[i].occ.join(";")), ctx[i].oc].join(",")));
fs.writeFileSync("song_context.csv", csv2.join("\n") + "\n");

// ---------- 2. the notebook ----------
const cells = [];
const md = t => cells.push({ cell_type: "markdown", metadata: {}, source: t.trim().split("\n").map((l, i, a) => l + (i < a.length - 1 ? "\n" : "")) });
const code = t => cells.push({ cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: t.trim().split("\n").map((l, i, a) => l + (i < a.length - 1 ? "\n" : "")) });

md(String.raw`
# Moodio: your first machine learning model

**Goal:** you give the model a song you like, and it recommends 5 similar songs.

**How it works, in one line:** it never listens to the music. It turns each song into a short text description, turns the text into numbers, and recommends the songs whose numbers are closest.

**The steps**
1. Load the data
2. Clean it and write one line of text ("tags") for every song
3. Turn the text into numbers (CountVectorizer)
4. Score how similar two songs are (cosine similarity)
5. Recommend the top 5
6. Add emotion, because two "love" songs can feel completely different
7. Mix tags and emotion
8. Add lyric theme, occasion and release year
9. The final recommender with four weights

**How to use this notebook in Google Colab**
- Run the cells from top to bottom (click a cell, press Shift+Enter).
- When Step 1 asks, upload three files: **songs_merged.csv**, **song_emotions.csv** and **song_context.csv**.
- Every step has a **Try this** box. Change something and run it again. That is how you learn.
`);

md(String.raw`
## Step 0: Tools

- **pandas** holds the data as a table.
- **numpy** does maths on lists of numbers.
- **scikit-learn** has the two ready-made tools we need: CountVectorizer and cosine similarity.
`);
code(String.raw`
import re
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
`);

md(String.raw`
## Step 1: Load the data

Each row is one song. Each column is one fact about it.
`);
code(String.raw`
# Upload the two files (in Colab). If you run this on your own computer, put the files
# next to the notebook and this cell will simply skip the upload.
try:
    from google.colab import files
    files.upload()
except ImportError:
    pass

songs = pd.read_csv("songs_merged.csv")
print(songs.shape)          # (rows, columns)
songs.head()                # the first 5 rows
`);
md(String.raw`
**Look at it.** Columns like ${"`artist`"} hold several names joined by ${"`;`"}. The ${"`tags`"} column holds mood words. We will clean both in Step 2.

> **Try this:** run ${"`songs['genre'].value_counts()`"} in a new cell. Which genres are biggest? Notice that ${"`latin`"} and ${"`latino`"} are really the same thing.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));

md(String.raw`
## Step 2: Clean the data and write one line of text per song

**Clean:** remove rows with missing values and duplicate songs. A model is only as good as its data.

**Describe:** join genre, artists, mood tags, language and album into one line called ${"`tags`"}. Two details matter:
- We remove spaces inside names, so "Arijit Singh" becomes ${"`arijitsingh`"}. Otherwise the computer sees "arijit" and "singh" as two separate words, and any other "Singh" would match.
- We make everything lowercase, so "Pop" and "pop" are the same word.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));
code(String.raw`
# --- clean ---
songs = songs.dropna(subset=["track_name", "artist", "genre"])
songs = songs.drop_duplicates(subset=["track_name", "artist"]).reset_index(drop=True)
print("songs after cleaning:", len(songs))

# --- helpers ---
def one_word(text):
    """'Arijit Singh' -> 'arijitsingh'"""
    return re.sub(r"[^\w]", "", str(text).lower())

def split_list(text):
    """'Pritam;Arijit Singh' -> ['pritam', 'arijitsingh']"""
    return [one_word(part) for part in str(text).split(";") if one_word(part)]

def clean_genre(genre):
    g = one_word(genre)
    return {"latino": "latin"}.get(g, g)   # same genre written two ways -> one

# --- build the tags line ---
def make_tags(row):
    parts = [clean_genre(row["genre"])]
    parts += split_list(row["artist"])
    parts += split_list(row["tags"])
    parts += [one_word(row["language"]), one_word(row["album_name"])]
    return " ".join(p for p in parts if p)

songs["tags_text"] = songs.apply(make_tags, axis=1)
songs[["track_name", "tags_text"]].head()
`);
md(String.raw`
**Look at it.** Compare ${"`Khairiyat`"} and ${"`Tum Se Hi`"}. They share words like ${"`bollywood`"}, ${"`pritam`"}, ${"`love`"}, ${"`romantic`"} and ${"`hindi`"}. Those shared words are exactly what the model will use.

> **Try this:** remove ${"`album_name`"} from ${"`make_tags`"} and run Steps 2 to 5 again. Do the recommendations get better or worse?
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));

md(String.raw`
## Step 3: Turn the text into numbers

A computer cannot compare words. It can compare numbers. **CountVectorizer** makes a list of the most common words (the *vocabulary*, up to 5,000 words) and, for every song, counts how many times each word appears.

Tiny example with 3 songs:

| | bollywood | love | romantic | sad | pop | party | dance |
|---|---|---|---|---|---|---|---|
| A: bollywood love romantic | 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| B: bollywood love sad | 1 | 1 | 0 | 1 | 0 | 0 | 0 |
| C: pop party dance | 0 | 0 | 0 | 0 | 1 | 1 | 1 |

A and B look alike. C looks nothing like them. Each song is now **a row of numbers** (a *vector*).
`);
code(String.raw`
cv = CountVectorizer(max_features=5000)
vectors = cv.fit_transform(songs["tags_text"])      # 2000 songs x vocabulary size
vocab = cv.get_feature_names_out()
print("matrix size:", vectors.shape)

# What does ONE song look like as numbers?
i = songs.index[songs["track_name"] == "Khairiyat"][0]
row = vectors[i].toarray()[0]
print("Khairiyat has", len(row), "numbers. These are not zero:")
for col in np.nonzero(row)[0]:
    print("  ", vocab[col], "=", row[col])
`);
md(String.raw`
> **Try this:** change ${"`max_features=5000`"} to ${"`50`"} and run again. The vocabulary is now tiny. What happens to the recommendations in Step 5?
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));

md(String.raw`
## Step 4: How similar are two songs?

**Cosine similarity** compares two rows of numbers and gives a score from **0** (nothing in common) to **1** (identical). The closer to 1, the more similar.

We compare every song with every other song in one go. The result is a 2000 x 2000 table, where row *i*, column *j* is the score between song *i* and song *j*.
`);
code(String.raw`
text_sim = cosine_similarity(vectors)
print(text_sim.shape)

def find(title):
    return songs.index[songs["track_name"].str.lower() == title.lower()][0]

k = find("Khairiyat")
for other in ["Khairiyat", "Tum Se Hi", "Saibo"]:
    print(f"Khairiyat vs {other}: {text_sim[k, find(other)]:.3f}")
`);
md(String.raw`
**Look at it.** A song always scores **1.0** against itself. That is why Step 5 skips the first result.

> **Try this:** compare Khairiyat with a hip-hop song. Why is the score 0?
`);

md(String.raw`
## Step 5: Recommend

1. Find the row number of the song.
2. Take its scores against all songs.
3. Sort from highest to lowest.
4. Skip the first one (the song itself) and show the next 5.
`);
code(String.raw`
def recommend_tags_only(title, n=5):
    i = find(title)
    order = np.argsort(-text_sim[i])          # highest score first
    order = [j for j in order if j != i][:n]  # skip the song itself
    return songs.loc[order, ["track_name", "artist", "genre"]].assign(score=text_sim[i, order].round(2))

recommend_tags_only("Khairiyat")
`);
md(String.raw`
**This works, but it has a problem.** Khairiyat is a heartbreak song. Woh Din is nostalgic. Raabta is a soft love song. In our file all three have the same tags ("love, romantic"), so the model cannot tell their **feelings** apart. We fix that next.
`);

md(String.raw`
## Step 6: Add emotion

We labelled every song with a **main emotion** and a **second emotion** (heartbreak, sad, nostalgic, mellow, romantic, happy, euphoric, confident, angry, intense, spiritual). The labels are in ${"`song_emotions.csv`"}. An AI wrote them from what it knows of each song, so some are guesses (see the ${"`label_confidence`"} column).

**Emotions are not all-or-nothing.** Sad is close to nostalgic and far from euphoric. So each emotion is a point on a map with two numbers:
- **valence:** how positive it feels (0 = sad, 1 = happy)
- **energy:** how intense it feels (0 = calm, 1 = intense)

Songs whose points are close feel alike, even when the labels differ.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));
code(String.raw`
emotions = pd.read_csv("song_emotions.csv")
songs = songs.merge(emotions, on=["track_name", "artist"], how="left")
print("songs without an emotion label:", songs["emotion_main"].isna().sum())

#            valence, energy
EMOTION_MAP = {
    "heartbreak": (0.10, 0.35), "sad":       (0.15, 0.20), "nostalgic": (0.40, 0.30),
    "mellow":     (0.55, 0.10), "romantic":  (0.75, 0.35), "happy":     (0.85, 0.65),
    "euphoric":   (0.90, 0.95), "confident": (0.70, 0.85), "angry":     (0.10, 0.90),
    "intense":    (0.20, 0.75), "spiritual": (0.65, 0.15),
}

# each song's point = 70% main emotion + 30% second emotion
main = np.array([EMOTION_MAP[e] for e in songs["emotion_main"]])
second = np.array([EMOTION_MAP[e] for e in songs["emotion_second"]])
points = 0.7 * main + 0.3 * second

# 1 = same feeling, 0 = opposite feelings (the longest possible distance is sqrt(2))
emotion_sim = 1 - euclidean_distances(points) / np.sqrt(2)
songs[["track_name", "emotion_main", "emotion_second", "label_confidence"]].head()
`);

md(String.raw`
## Step 7: Mix tags and emotion

Final score = **(1 - w) x tags match + w x emotion match**

${"`w`"} decides how much emotion counts. 0 means tags only (Step 5). 1 means emotion only. We start at 0.5.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));
code(String.raw`
def recommend(title, w=0.5, n=5):
    i = find(title)
    score = (1 - w) * text_sim[i] + w * emotion_sim[i]
    order = [j for j in np.argsort(-score) if j != i][:n]
    out = songs.loc[order, ["track_name", "artist", "genre", "emotion_main", "emotion_second"]].copy()
    out["score"] = score[order].round(2)
    return out

print("Khairiyat feels:", songs.loc[find("Khairiyat"), ["emotion_main", "emotion_second"]].tolist())
print("\n--- tags only (w = 0) ---")
display(recommend("Khairiyat", w=0))
print("--- half emotion (w = 0.5) ---")
display(recommend("Khairiyat", w=0.5))
`);
md(String.raw`
**Look at it.** With ${"`w=0`"} you get soft, romantic songs. With ${"`w=0.5`"} the sad and heartbreak songs move up. That is the emotion factor working.

> **Try this:**
> - Run ${"`recommend('Khairiyat', w=1)`"}. What happens to genre and language? (Hindi songs can sit next to English ones, because the model only sees "feels similar".)
> - Pick your own favourite song and run ${"`recommend('Your Song')`"} at 0, 0.5 and 1.
> - Open ${"`song_emotions.csv`"}, change a label you disagree with, and run the notebook again.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));

md(String.raw`
## Step 8: Lyric theme, occasion and release year

Songs can feel the same and still be different. A party song and a late-night song can both be happy. Three more facts help:
- **Lyric theme:** what the words are about (love, heartbreak, nostalgia, party, ambition, struggle, rebellion, devotion, freedom, reflection).
- **Occasion:** where people play it (party, workout, long drive, romantic date, wedding, chill, focus, festival, sleep, prayer). Songs played together at the same kind of moment belong together.
- **Release year:** a 2019 song fits better next to a 2018 song than a 1975 one.

An AI wrote these labels from what it knows of each song. It did not copy the lyrics, which are copyrighted. Some are guesses (see the ${"`year_confidence`"} and ${"`label_confidence`"} columns). For classical pieces the year is when it was composed.

Each factor becomes a score from 0 to 1, the same as before:
- **theme:** 1 if the same, a partial score for close cousins (love and heartbreak), 0 otherwise
- **occasion:** shared occasions divided by all different occasions between the two songs
- **era:** 1 for the same year, falling to 0 when the songs are 25 or more years apart
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));
code(String.raw`
from sklearn.preprocessing import MultiLabelBinarizer

context = pd.read_csv("song_context.csv")
songs = songs.merge(context, on=["track_name", "artist"], how="left", suffixes=("", "_ctx"))
print("songs without context labels:", songs["lyric_theme"].isna().sum())

# --- theme score ---
RELATED = {("love", "heartbreak"): 0.4, ("heartbreak", "nostalgia"): 0.4, ("nostalgia", "reflection"): 0.5,
           ("reflection", "struggle"): 0.4, ("struggle", "rebellion"): 0.4, ("ambition", "party"): 0.3,
           ("party", "freedom"): 0.4, ("devotion", "reflection"): 0.3}
theme_names = sorted(songs["lyric_theme"].unique())
R = np.eye(len(theme_names))
for (a, b), v in RELATED.items():
    R[theme_names.index(a), theme_names.index(b)] = R[theme_names.index(b), theme_names.index(a)] = v
theme_idx = songs["lyric_theme"].map(theme_names.index).to_numpy()
theme_sim = R[np.ix_(theme_idx, theme_idx)]

# --- occasion score (shared / total different) ---
occasion_lists = songs["occasions"].str.split(";")
O = MultiLabelBinarizer().fit_transform(occasion_lists)
shared = O @ O.T
sizes = O.sum(axis=1)
occasion_sim = shared / (sizes[:, None] + sizes[None, :] - shared)

# --- era score ---
years = songs["year"].to_numpy()
era_sim = np.clip(1 - np.abs(years[:, None] - years[None, :]) / 25, 0, 1)

# theme and occasion count equally
context_sim = 0.5 * theme_sim + 0.5 * occasion_sim

# --- language score: 1 for the same language, 0 otherwise ---
langs = songs["language"].to_numpy()
language_sim = (langs[:, None] == langs[None, :]).astype(float)
songs[["track_name", "year", "lyric_theme", "occasions"]].head()
`);

md(String.raw`
## Step 9: The final recommender, with four factors

Each factor has a **weight**, which is how much it counts. The weights do not need to add up to 100.

Final score = (tags x weight + emotion x weight + context x weight + era x weight + language x weight) / total of the weights

**Artist variety.** Songs by the same artist share many tags, so without a rule one artist can fill the whole list. ${"`one_per_artist=True`"} walks down the ranking and skips any song whose artist is already in your 5. Set it to ${"`False`"} to see the difference.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));
code(String.raw`
def recommend_all(title, tags=35, emotion=25, context=20, era=5, lang=15, n=5, one_per_artist=True):
    i = find(title)
    total = tags + emotion + context + era + lang
    score = (tags * text_sim[i] + emotion * emotion_sim[i] + context * context_sim[i]
             + era * era_sim[i] + lang * language_sim[i]) / total
    order, used = [], set()
    for j in np.argsort(-score):
        if j == i:
            continue
        artists = {a.strip().lower() for a in songs.loc[j, "artist"].split(";")}
        if one_per_artist:
            if artists & used:      # an artist is already in the list: skip this song
                continue
            used |= artists
        order.append(j)
        if len(order) == n:
            break
    out = songs.loc[order, ["track_name", "artist", "year", "emotion_main", "lyric_theme", "occasions"]].copy()
    out["score"] = score[order].round(2)
    return out

me = songs.loc[find("Khairiyat")]
print("Khairiyat:", me["year"], "| feels", me["emotion_main"], "| about", me["lyric_theme"], "| played at", me["occasions"])
display(recommend_all("Khairiyat"))
`);
md(String.raw`
> **Try this:**
> - Make one factor count alone: ${"`recommend_all('Khairiyat', tags=0, emotion=0, context=100, era=0, lang=0)`"}. Which songs show up? Then try ${"`era=100`"} alone.
> - Pick a party song and set ${"`context=100`"}. Do you get songs that would be played together at the same party?
> - Which weights give recommendations you like best? Ask a friend to rate 5 recommendations from two different weight settings. That is how you tune a model.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));

md(String.raw`
## What you built, and how to make it better

You built a **content-based recommender**: it recommends songs that *look similar on paper*. It does not know what people listen to. That is a different kind of model (collaborative filtering), and it needs listening history.

**Upgrades, from easiest to hardest**
1. **TF-IDF instead of counts.** Words like "english" appear in 1,200 songs and tell you little. TF-IDF gives common words less weight. Replace ${"`CountVectorizer`"} with ${"`TfidfVectorizer`"}.
2. **Weight the pieces.** Repeat the artist or genre in the tags to make them count more, or less.
3. **Add a language filter.** Keep Hindi songs for Hindi fans.
4. **Real audio features.** Energy, danceability and valence measured from the audio, instead of AI-written labels. This is where Spotify data helps.
5. **Check your model.** Ask friends to rate 5 recommendations each. Which version do they like most? That is how real teams compare models.
6. **Learn from listening.** Use play counts or likes to recommend what similar listeners enjoy.
`.replace(/\$\{"(`[^`]*`)"\}/g, "$1"));

const nb = {
  cells,
  metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python" } },
  nbformat: 4,
  nbformat_minor: 5,
};
fs.writeFileSync("song_recommender.ipynb", JSON.stringify(nb, null, 1));
console.log("wrote song_recommender.ipynb with", cells.length, "cells and song_emotions.csv with", songs.length, "rows");
