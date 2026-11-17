// STEP 7: add release YEAR, lyric THEME and OCCASION (where the song is played).
// Four factors, each scored 0 to 1, then mixed with weights:
//   tags     : same artist / genre / mood words      (Steps 3 and 4)
//   emotion  : feels alike                            (Step 6)
//   context  : same lyric theme + played at the same occasions
//   era      : released around the same time
// Run:  node step7_context.js "C:\path\to\ALL_2000_Songs.csv" ["Song name"]

const fs = require("fs");
const { songs, labels, recommend: _unused, emotionSim } = require("./step6_emotion.js");
const { vectors, cosine } = require("./step4_similarity.js");

// load the year / theme / occasion labels written by the helpers
const ctx = {};
for (const f of fs.readdirSync("context/out"))
  for (const e of JSON.parse(fs.readFileSync("context/out/" + f, "utf8"))) ctx[e.i] = e;

// some themes are close cousins, so they get partial credit
const RELATED = { "love|heartbreak": 0.4, "heartbreak|nostalgia": 0.4, "nostalgia|reflection": 0.5,
  "reflection|struggle": 0.4, "struggle|rebellion": 0.4, "ambition|party": 0.3, "party|freedom": 0.4, "devotion|reflection": 0.3 };
const themeSim = (a, b) => a === b ? 1 : (RELATED[a + "|" + b] || RELATED[b + "|" + a] || 0);

// occasions: overlap between the two lists (Jaccard = shared / total different)
function occasionSim(a, b) {
  const A = new Set(ctx[a].occ), B = new Set(ctx[b].occ);
  const shared = [...A].filter(x => B.has(x)).length;
  return shared / (A.size + B.size - shared);
}
const contextSim = (a, b) => 0.5 * themeSim(ctx[a].theme, ctx[b].theme) + 0.5 * occasionSim(a, b);

// era: 1 if the same year, falling to 0 when 25 or more years apart
const eraSim = (a, b) => Math.max(0, 1 - Math.abs(ctx[a].y - ctx[b].y) / 25);

// weights are "how much it counts", relative to each other (they do not need to add up to 1)
const DEFAULT = { tags: 40, emotion: 30, context: 20, era: 10 };
const artistsOf = j => songs[j].artist.split(";").map(a => a.trim().toLowerCase());

// variety: "mix" = at most 1 song per artist, "strict" = also never the picked song's artists, "off" = no rule
function recommend(title, wt = DEFAULT, variety = "mix", count = 5) {
  const i = songs.findIndex(s => s.track_name.toLowerCase() === title.toLowerCase());
  if (i === -1) return null;
  const total = wt.tags + wt.emotion + wt.context + wt.era;
  const ranked = songs.map((s, j) => {
    const parts = { tags: cosine(vectors[i], vectors[j]), emotion: emotionSim(i, j), context: contextSim(i, j), era: eraSim(i, j) };
    const score = (wt.tags * parts.tags + wt.emotion * parts.emotion + wt.context * parts.context + wt.era * parts.era) / total;
    return { j, song: s, parts, score };
  }).filter(x => x.j !== i).sort((a, b) => b.score - a.score);
  if (variety === "off") return ranked.slice(0, count);
  const used = new Set(variety === "strict" ? artistsOf(i) : []);
  const out = [];
  for (const x of ranked) {
    const a = artistsOf(x.j);
    if (a.some(n => used.has(n))) continue;      // an artist is already in the list: skip
    a.forEach(n => used.add(n));
    out.push(x);
    if (out.length === count) break;
  }
  return out;
}

module.exports = { songs, ctx, recommend, themeSim, occasionSim, eraSim };

if (require.main === module) {
  const bad = songs.filter((_, i) => !ctx[i]).length;
  const yg = Object.values(ctx).filter(e => e.yc === "guess").length;
  const ys = Object.values(ctx).map(e => e.y);
  console.log("\nlabelled:", Object.keys(ctx).length, "| missing:", bad, "| year guesses:", yg, "| years:", Math.min(...ys), "to", Math.max(...ys));
  const themes = {}; Object.values(ctx).forEach(e => themes[e.theme] = (themes[e.theme] || 0) + 1);
  const occs = {}; Object.values(ctx).forEach(e => e.occ.forEach(o => occs[o] = (occs[o] || 0) + 1));
  console.log("themes:", themes); console.log("occasions:", occs);

  const hip = songs.find(s => s.genre.toLowerCase() === "hip-hop").track_name;
  for (const name of process.argv[3] ? [process.argv[3]] : ["Khairiyat", hip]) {
    const me = songs.findIndex(s => s.track_name === name);
    console.log(`\n${name} (${ctx[me].y}) feels ${labels[me].p}, about ${ctx[me].theme}, played at ${ctx[me].occ.join(" + ")}`);
    recommend(name).forEach((r, n) => console.log(
      `  ${n + 1}. ${r.song.track_name} - ${r.song.artist.split(";")[0]} (${ctx[r.j].y}, ${labels[r.j].p}, ${ctx[r.j].theme}, ${ctx[r.j].occ.join("+")}) score ${r.score.toFixed(2)}`));
  }
}
