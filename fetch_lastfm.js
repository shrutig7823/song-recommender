// Real popularity data: how many people listen to each song, from Last.fm (free API key, personal account).
// For every song it saves "listeners" (different people who played it) and "playcount" (total plays) to lastfm.json.
// Safe to stop and run again: it skips songs already done.
//
// Set your key in YOUR terminal first (never paste it into chat or a file):
//   PowerShell:  $env:LASTFM_API_KEY="your key"
// Then run:
//   node fetch_lastfm.js songs_merged.csv
const fs = require("fs");
const { readCsv } = require("./csv_util.js");

const KEY = process.env.LASTFM_API_KEY;
if (!KEY) { console.error("Set LASTFM_API_KEY in this terminal first (see the top of this file)."); process.exit(1); }

const rows = readCsv(process.argv[2] || "songs_merged.csv");
const OUT = "lastfm.json";
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cleanTitle = t => t.replace(/\(.*?\)|\[.*?\]|- from .*|- remaster.*|- live.*|\bfeat\..*/gi, "").replace(/\s+/g, " ").trim();

async function info(artist, track) {
  const url = "https://ws.audioscrobbler.com/2.0/?method=track.getInfo&format=json&autocorrect=1&api_key=" + KEY +
    "&artist=" + encodeURIComponent(artist) + "&track=" + encodeURIComponent(track);
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url);
    if (r.status === 429) { await sleep(5000); continue; }
    const j = await r.json().catch(() => null);
    if (!j) return null;
    if (j.error === 29) { await sleep(8000); continue; }            // rate limit
    if (j.error === 10 || j.error === 26) { console.error("Last.fm rejected the API key. Check it and try again."); process.exit(1); }
    if (j.error) return null;                                       // 6 = track not found
    return { listeners: Number(j.track.listeners || 0), playcount: Number(j.track.playcount || 0) };
  }
  return null;
}

(async () => {
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    if (done[i] !== undefined) continue;
    const artist = rows[i].artist.split(";")[0].trim();
    let res = null;
    try { res = await info(artist, cleanTitle(rows[i].track_name)) || await info(artist, rows[i].track_name); } catch (e) { res = null; }
    done[i] = res;                       // null = not found
    n++;
    if (n % 100 === 0) { fs.writeFileSync(OUT, JSON.stringify(done)); console.log(`${Object.keys(done).length} of ${rows.length} looked up`); }
    await sleep(220);                    // about 4 requests a second, within Last.fm's limits
  }
  fs.writeFileSync(OUT, JSON.stringify(done));
  const found = Object.values(done).filter(Boolean).length;
  console.log(`Done. ${found} of ${rows.length} songs found on Last.fm.`);
})();
