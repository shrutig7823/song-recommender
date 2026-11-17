// STEP 4: score how similar two songs are (cosine similarity).
// Score is 0 (nothing in common) to 1 (identical).
// Run:  node step4_similarity.js "C:\path\to\ALL_2000_Songs.csv"

const { songs, vectors } = require("./step3_vectorize.js");

// cosine = (a . b) / (|a| x |b|)
//   a . b  : multiply the two rows number by number, then add up
//   |a|    : the "length" of a row = square root of the sum of squares
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = { songs, vectors, cosine };

if (require.main === module) {
  const find = name => songs.findIndex(s => s.track_name === name);
  const k = find("Khairiyat");
  const hip = songs.findIndex(s => s.genre.toLowerCase() === "hip-hop");

  console.log("\nSimilarity to Khairiyat:");
  for (const [label, i] of [
    ["Khairiyat itself", k],
    ["Tum Se Hi", find("Tum Se Hi")],
    ["Saibo", find("Saibo")],
    [`${songs[hip].track_name} (hip-hop)`, hip],
  ]) {
    console.log(`  ${label.padEnd(36)} ${cosine(vectors[k], vectors[i]).toFixed(3)}`);
  }
}
