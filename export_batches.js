// Splits the songs into small files so several helpers can label emotions in parallel.
// Run:  node export_batches.js "C:\path\to\ALL_2000_Songs.csv"
const fs = require("fs");
const { songs } = require("./step2_make_tags.js");

fs.mkdirSync("emotions/in", { recursive: true });
fs.mkdirSync("emotions/out", { recursive: true });

const rows = songs.map((s, i) => ({
  i,
  title: s.track_name,
  artists: s.artist.split(";").slice(0, 3).join(", "),
  genre: s.genre,
  album: s.album_name,
  language: s.language,
}));

const SIZE = 250;
for (let b = 0; b * SIZE < rows.length; b++) {
  fs.writeFileSync(`emotions/in/batch_${b + 1}.json`, JSON.stringify(rows.slice(b * SIZE, (b + 1) * SIZE)));
}
console.log("batches:", Math.ceil(rows.length / SIZE));
