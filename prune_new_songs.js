// Removes songs from new_songs.csv whose search genre cannot be Hindi, Punjabi or English
// (K-pop, classical, Latin, techno and so on from the first, wider pull).
// Run once, after stopping pull_spotify.js:  node prune_new_songs.js
const fs = require("fs");
const { readCsv } = require("./csv_util.js");

const KEEP = new Set(["pop", "rock", "hip-hop", "r-n-b", "dance", "edm", "house", "indie", "alternative", "metal", "punk",
  "country", "folk", "acoustic", "singer-songwriter", "soul", "indian", "bollywood"]);
const HEADER = ["track_name", "artist", "genre", "album_name", "tags", "description", "language", "release_date", "spotify_id", "spotify_url"];
const q = t => '"' + String(t ?? "").replace(/"/g, '""') + '"';

const rows = readCsv("new_songs.csv");
const kept = rows.filter(r => KEEP.has(r.genre) || r.language);   // rows from the new pull already have a language hint
fs.writeFileSync("new_songs_before_prune.csv", fs.readFileSync("new_songs.csv"));
fs.writeFileSync("new_songs.csv", [HEADER.join(",")].concat(kept.map(r => HEADER.map(h => q(r[h])).join(","))).join("\n") + "\n");
console.log(`kept ${kept.length} of ${rows.length} songs (a backup is in new_songs_before_prune.csv)`);
