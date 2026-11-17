// STEP 2: turn every song into ONE line of text called "tags".
// Run:  node step2_make_tags.js "C:\path\to\ALL_2000_Songs.csv"

const fs = require("fs");

// ---------- Step 1 again: load the CSV ----------
// (A tiny CSV reader. In Python this whole function is just pd.read_csv.)
function readCsv(path) {
  const text = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] || "").trim()])));
}

// ---------- Step 2a: clean ----------
let songs = readCsv(process.argv[2]);
console.log("Songs loaded:", songs.length);

// drop rows with missing title / artist / genre
songs = songs.filter(s => s.track_name && s.artist && s.genre);

// drop duplicates (same title + same artist)
const seen = new Set();
songs = songs.filter(s => {
  const key = (s.track_name + "|" + s.artist).toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
console.log("Songs after cleaning:", songs.length);

// ---------- Step 2b: helper functions ----------
// "Arijit Singh" -> "arijitsingh"  (lowercase, remove spaces and symbols)
const oneWord = text => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// "Pritam;Arijit Singh" -> ["pritam", "arijitsingh"]
const splitList = text => text.split(";").map(oneWord).filter(Boolean);

// Same genre written two ways -> one name
const GENRE_FIX = { latino: "latin", rnb: "rb" };   // same genre written two ways -> one name
const cleanGenre = g => { const w = oneWord(g); return GENRE_FIX[w] || w; };

// ---------- Step 2c: build the tags line ----------
for (const s of songs) {
  s.tags_text = [
    cleanGenre(s.genre),          // bollywood
    ...splitList(s.artist),       // pritam arijitsingh
    ...splitList(s.tags),         // love romantic
    oneWord(s.language),          // hindi
    oneWord(s.album_name),        // chhichhore
  ].join(" ");
}

// ---------- Show the result (only when this file is run directly) ----------
if (require.main === module) {
  console.log("\nExamples:");
  for (const name of ["Khairiyat", "Tum Se Hi", "Saibo"]) {
    const s = songs.find(x => x.track_name === name);
    if (s) console.log(`  ${s.track_name}  ->  ${s.tags_text}`);
  }
}

module.exports = { readCsv, songs };
