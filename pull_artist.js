// Adds every song of one artist to the library, using Apple's free iTunes catalogue (no key needed).
// Run:  node pull_artist.js "Karan Aujla" 914892130 "punjabi hip hop"
// It lists the artist's albums and singles, collects every track, drops duplicates and songs already in songs_merged.csv,
// and writes artist_new.json (to be labelled, then appended to songs_merged.csv by add_artist.js).
const fs = require("fs");
const { readCsv } = require("./csv_util.js");
const [name, id, genre = "punjabi pop"] = process.argv.slice(2);
if (!name || !id) { console.error('Usage: node pull_artist.js "Artist Name" <iTunes artist id> [genre]'); process.exit(1); }
const get = async u => { for (let k = 0; k < 4; k++) { const r = await fetch(u); if (r.ok) return r.json(); await new Promise(s => setTimeout(s, 3000 * (k + 1))); } throw new Error("iTunes would not answer: " + u); };
const norm = s => s.toLowerCase().replace(/\(.*?\)|\[.*?\]|- .*$/g, "").replace(/[^a-z0-9ऀ-ॿ਀-੿]+/g, " ").trim();
(async () => {
  const alb = (await get(`https://itunes.apple.com/lookup?id=${id}&entity=album&limit=200&country=IN`)).results.filter(x => x.wrapperType === "collection");
  console.log(alb.length, "albums and singles");
  const tracks = [];
  for (const a of alb) {
    const j = await get(`https://itunes.apple.com/lookup?id=${a.collectionId}&entity=song&country=IN`);
    for (const t of j.results) if (t.wrapperType === "track") tracks.push(t);
    await new Promise(s => setTimeout(s, 3200));            // iTunes allows about 20 requests a minute
  }
  const top = (await get(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=200&country=IN`)).results.filter(x => x.wrapperType === "track");
  tracks.push(...top);
  const have = new Set(readCsv("songs_merged.csv").filter(r => r.artist.toLowerCase().includes(name.toLowerCase())).map(r => norm(r.track_name)));
  const seen = new Set(have), out = [];
  for (const t of tracks) {
    if (!(t.artistName || "").toLowerCase().includes(name.toLowerCase().split(" ")[0])) continue;       // the artist must be named on the track
    if (/instrumental|karaoke|remix|sped up|slowed|lofi|lo-fi|reprise version/i.test(t.trackName)) continue;
    const k = norm(t.trackName); if (!k || seen.has(k)) continue; seen.add(k);
    const artists = t.artistName.split(/\s*(?:&|,| feat\.? | x | and )\s*/i).map(s => s.trim()).filter(Boolean);
    if (!artists.some(a => a.toLowerCase() === name.toLowerCase())) artists.unshift(name);
    out.push({ track_name: t.trackName, artist: artists.join(";"), genre, album_name: (t.collectionName || "").replace(/ - (Single|EP)$/i, ""), release_date: (t.releaseDate || "").slice(0, 10) });
  }
  out.sort((a, b) => b.release_date.localeCompare(a.release_date));
  fs.writeFileSync("artist_new.json", JSON.stringify(out, null, 1));
  console.log(out.length, "new songs saved to artist_new.json (", have.size, "already in the library )");
})();
