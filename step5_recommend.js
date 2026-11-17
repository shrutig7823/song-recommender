// STEP 5: the recommend() function. Give it a song, get 5 similar songs.
// Run:  node step5_recommend.js "C:\path\to\ALL_2000_Songs.csv" ["Song name"]

const { songs, vectors, cosine } = require("./step4_similarity.js");

function recommend(title, count = 5) {
  // 1. find the row number of the song
  const i = songs.findIndex(s => s.track_name.toLowerCase() === title.toLowerCase());
  if (i === -1) return null;

  // 2. score it against EVERY song
  const scores = songs.map((s, j) => ({ song: s, score: cosine(vectors[i], vectors[j]), j }));

  // 3. sort highest to lowest, skip itself (always score 1), keep the top 5
  return scores
    .filter(x => x.j !== i)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

module.exports = { recommend };

if (require.main === module) {
  const hip = songs.find(s => s.genre.toLowerCase() === "hip-hop").track_name;
  const rock = songs.find(s => s.genre.toLowerCase() === "rock").track_name;
  const wanted = process.argv[3] ? [process.argv[3]] : ["Khairiyat", hip, rock];
  for (const name of wanted) {
    const list = recommend(name);
    if (!list) { console.log(`\nSong not found: ${name}`); continue; }
    const me = songs.find(s => s.track_name === name);
    console.log(`\nBecause you like "${name}" (${me.artist} | ${me.genre}):`);
    list.forEach((r, n) => console.log(
      `  ${n + 1}. ${r.song.track_name} - ${r.song.artist.split(";")[0]} | ${r.song.genre} | score ${r.score.toFixed(2)}`));
  }
}
