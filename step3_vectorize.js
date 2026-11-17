// STEP 3: turn each song's tags line into a list of numbers (a "vector").
// This is what CountVectorizer(max_features=5000) does in Python.
// Run:  node step3_vectorize.js "C:\path\to\ALL_2000_Songs.csv"

const { songs } = require("./step2_make_tags.js");

const MAX_FEATURES = 5000;

// 3a. Split every tags line into words
const wordsOf = song => song.tags_text.split(" ").filter(Boolean);

// 3b. Count how often each word appears across ALL songs
const totals = {};
for (const s of songs) for (const w of wordsOf(s)) totals[w] = (totals[w] || 0) + 1;

// 3c. Keep only the 5000 most common words. This is our "vocabulary".
const vocabulary = Object.keys(totals)
  .sort((a, b) => totals[b] - totals[a] || a.localeCompare(b))
  .slice(0, MAX_FEATURES);
const position = new Map(vocabulary.map((w, i) => [w, i])); // word -> column number

// 3d. For each song, count how many times each vocabulary word appears.
//     Result: one row of numbers per song.
const vectors = songs.map(s => {
  const row = new Float32Array(vocabulary.length); // starts as all zeros
  for (const w of wordsOf(s)) {
    if (position.has(w)) row[position.get(w)] += 1;
  }
  return row;
});

module.exports = { songs, vocabulary, vectors };

// ---------- Show the result (only when run directly) ----------
if (require.main === module) {
  console.log("Unique words in all tags:", Object.keys(totals).length);
  console.log("Words kept (the vocabulary):", vocabulary.length);
  console.log("\nTop 15 most common words:");
  vocabulary.slice(0, 15).forEach(w => console.log(`  ${w.padEnd(14)} ${totals[w]} songs`));

  console.log("\nMatrix size:", vectors.length, "songs x", vocabulary.length, "numbers");

  const i = songs.findIndex(s => s.track_name === "Khairiyat");
  console.log(`\n"${songs[i].track_name}" tags: ${songs[i].tags_text}`);
  console.log(`Its vector has ${vectors[i].length} numbers. Only these are not zero:`);
  vectors[i].forEach((n, col) => { if (n > 0) console.log(`  column ${String(col).padStart(4)}  (${vocabulary[col]}) = ${n}`); });
}
