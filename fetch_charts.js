// Saves today's most-played songs from several countries into charts.json, for the "Popular right now" list.
// Apple publishes these charts as a public feed (no key), but browsers cannot read it directly (no CORS),
// so this script fetches them and the page reads the saved file instead.
// Run:  node fetch_charts.js        (a GitHub Action runs this every day and commits charts.json)
const fs = require("fs");

const CHARTS = [["in", "India", 1.0], ["us", "the US", 0.9], ["gb", "the UK", 0.7], ["ae", "the UAE", 0.5], ["au", "Australia", 0.4], ["ca", "Canada", 0.4], ["br", "Brazil", 0.3]];

(async () => {
  const feeds = [];
  for (const [cc, name, w] of CHARTS) {
    try {
      const r = await fetch(`https://rss.applemarketingtools.com/api/v2/${cc}/music/most-played/100/songs.json`);
      if (!r.ok) { console.log(cc, "skipped:", r.status); continue; }
      const j = await r.json();
      feeds.push({ cc, name, w, list: j.feed.results.map(s => [s.name, s.artistName]) });
      console.log(cc, "ok:", j.feed.results.length, "songs");
    } catch (e) { console.log(cc, "skipped:", e.message); }
  }
  if (!feeds.length) { console.error("No charts could be fetched; charts.json was not changed."); process.exit(1); }
  fs.writeFileSync("charts.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), feeds }));
  console.log("Saved charts.json with", feeds.length, "countries.");
})();
