// STEP 6: add the EMOTION factor.
// Every emotion is a point on a 2-number map:
//   valence = how positive it feels (0 = sad ... 1 = happy)
//   energy  = how intense it feels   (0 = calm ... 1 = intense)
// Songs whose points are close feel alike, even if their labels differ
// (sad is close to nostalgic, far from euphoric).
// Run:  node step6_emotion.js "C:\path\to\ALL_2000_Songs.csv"

const fs = require("fs");
const { songs, vectors, cosine } = require("./step4_similarity.js");

const MAP = {
  heartbreak: [0.10, 0.35], sad: [0.15, 0.20], nostalgic: [0.40, 0.30], mellow: [0.55, 0.10],
  romantic: [0.75, 0.35], happy: [0.85, 0.65], euphoric: [0.90, 0.95], confident: [0.70, 0.85],
  angry: [0.10, 0.90], intense: [0.20, 0.75], spiritual: [0.65, 0.15],
};

// load the labels written by the helpers
const labels = {};
for (const f of fs.readdirSync("emotions/out")) {
  for (const e of JSON.parse(fs.readFileSync("emotions/out/" + f, "utf8"))) labels[e.i] = e;
}

// each song's point = 70% main emotion + 30% second emotion
const point = songs.map((_, i) => {
  const e = labels[i], p = MAP[e.p], s = MAP[e.s] || p;
  return [0.7 * p[0] + 0.3 * s[0], 0.7 * p[1] + 0.3 * s[1]];
});

// 1 = same feeling, 0 = opposite feelings (longest possible distance is sqrt(2))
function emotionSim(a, b) {
  return 1 - Math.hypot(point[a][0] - point[b][0], point[a][1] - point[b][1]) / Math.SQRT2;
}

// final score = mix of text match and emotion match. w = how much emotion counts.
function recommend(title, w = 0.5, count = 5) {
  const i = songs.findIndex(s => s.track_name.toLowerCase() === title.toLowerCase());
  if (i === -1) return null;
  return songs
    .map((s, j) => ({ song: s, j, text: cosine(vectors[i], vectors[j]), emo: emotionSim(i, j) }))
    .filter(x => x.j !== i)
    .map(x => ({ ...x, score: (1 - w) * x.text + w * x.emo }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

module.exports = { songs, labels, MAP, recommend, emotionSim };

if (require.main === module) {
  const missing = songs.filter((_, i) => !labels[i] || !MAP[labels[i].p]);
  console.log("\nlabelled:", Object.keys(labels).length, "| missing or invalid:", missing.length);
  const guess = Object.values(labels).filter(e => e.c === "guess").length;
  console.log("guesses:", guess);
  const tally = {};
  Object.values(labels).forEach(e => tally[e.p] = (tally[e.p] || 0) + 1);
  console.log("main emotions:", tally);

  for (const name of process.argv[3] ? [process.argv[3]] : ["Khairiyat", "Woh Din"]) {
    const me = songs.findIndex(s => s.track_name === name);
    if (me < 0) continue;
    console.log(`\n${name}: feels ${labels[me].p} / ${labels[me].s}`);
    for (const w of [0, 0.5]) {
      console.log(`  emotion weight ${w}:`);
      recommend(name, w).forEach((r, n) => console.log(
        `    ${n + 1}. ${r.song.track_name} - ${r.song.artist.split(";")[0]} [${labels[r.j].p}/${labels[r.j].s}] score ${r.score.toFixed(2)}`));
    }
  }
}
