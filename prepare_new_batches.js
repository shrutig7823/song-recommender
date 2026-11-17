// Splits new_songs.csv (from pull_spotify.js) into batches for labelling.
// Each new song gets the index 2000 + its row number, so it lines up after the original 2,000 songs.
// Run:  node prepare_new_batches.js
const fs = require("fs");
const { readCsv } = require("./csv_util.js");

const rows = readCsv("new_songs.csv");
const START = Number(process.argv[2] || 2000);
fs.mkdirSync("new/in", { recursive: true });
fs.mkdirSync("new/out", { recursive: true });

const items = rows.map((r, k) => ({
  i: START + k,
  title: r.track_name,
  artists: r.artist.split(";").slice(0, 3).join(", "),
  genre: r.genre,
  album: r.album_name,
  released: r.release_date,
}));
const SIZE = 190;
const n = Math.ceil(items.length / SIZE);
for (let b = 0; b < n; b++) fs.writeFileSync(`new/in/batch_${b + 1}.json`, JSON.stringify(items.slice(b * SIZE, (b + 1) * SIZE)));
console.log("songs:", items.length, "| batches:", n, "| indexes", START, "to", START + items.length - 1);
