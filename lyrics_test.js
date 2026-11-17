// LRCLIB lyrics TEST on 100 songs. The lyric text is only used to judge each song's theme and emotion.
// It goes into a temporary folder (tmp_lyrics/), is read once by a labelling helper, and is then deleted.
// Nothing from tmp_lyrics/ is committed (see .gitignore), published, or copied into the app.
//
// Step 1:  node lyrics_test.js fetch songs_merged.csv     -> tmp_lyrics/songs.json (+ lyrics_test_existing.json: our current labels)
// Step 2:  a helper reads tmp_lyrics/songs.json and writes lyrics_test_out.json (labels only)
// Step 3:  node lyrics_test.js compare                    -> prints how often the lyric-based labels agree with ours
// Step 4:  node lyrics_test.js clean                      -> deletes tmp_lyrics/
const fs = require("fs");
const { readCsv } = require("./csv_util.js");

const mode = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function load() {
  const rows = readCsv(process.argv[3] || "songs_merged.csv");
  const emo = {}, ctx = {};
  for (const f of fs.readdirSync("emotions/out")) for (const e of JSON.parse(fs.readFileSync("emotions/out/" + f, "utf8"))) emo[e.i] = e;
  for (const f of fs.readdirSync("context/out")) for (const e of JSON.parse(fs.readFileSync("context/out/" + f, "utf8"))) ctx[e.i] = e;
  return { rows, emo, ctx };
}

// a fixed random order, so the same 100 songs are picked each time
function shuffle(a, seed = 7) {
  for (let i = a.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) % 2147483648; const k = seed % (i + 1); [a[i], a[k]] = [a[k], a[i]]; }
  return a;
}

async function lookup(title, artist) {
  const clean = t => t.replace(/\(.*?\)|\[.*?\]|- from .*|- remaster.*|\bfeat\..*/gi, "").trim();
  const url = "https://lrclib.net/api/search?track_name=" + encodeURIComponent(clean(title)) + "&artist_name=" + encodeURIComponent(artist.split(";")[0].trim());
  const r = await fetch(url, { headers: { "User-Agent": "song-recommender-lyrics-test (learning project)" } });
  if (!r.ok) return { status: r.status };
  const list = await r.json();
  const hit = list.find(x => x.plainLyrics && !x.instrumental);
  return hit ? { status: 200, text: hit.plainLyrics } : { status: 404 };
}

(async () => {
  if (mode === "fetch") {
    const { rows, emo, ctx } = load();
    const pool = { Hindi: [], Punjabi: [], English: [] };
    rows.forEach((r, i) => { if (pool[r.language] && i >= 0) pool[r.language].push(i); });
    const pick = [...shuffle(pool.English).slice(0, 45), ...shuffle(pool.Hindi).slice(0, 40), ...shuffle(pool.Punjabi).slice(0, 15)];
    fs.mkdirSync("tmp_lyrics", { recursive: true });
    const out = [], existing = [];
    let found = 0;
    for (const i of pick) {
      const r = rows[i];
      let res = { status: 0 };
      try { res = await lookup(r.track_name, r.artist); } catch (e) { res = { status: -1 }; }
      if (res.status === 200) found++;
      // only the first ~1,200 characters are kept: enough to judge the theme, not a full copy
      out.push({ i, title: r.track_name, artists: r.artist.split(";").slice(0, 2).join(", "), language: r.language, found: res.status === 200, lyrics: res.status === 200 ? res.text.slice(0, 1200) : "" });
      existing.push({ i, language: r.language, theme: ctx[i].theme, p: emo[i].p, s: emo[i].s, c: emo[i].c, oc: ctx[i].oc });
      await sleep(350);
    }
    fs.writeFileSync("tmp_lyrics/songs.json", JSON.stringify(out));
    fs.writeFileSync("lyrics_test_existing.json", JSON.stringify(existing));
    const byLang = {};
    out.forEach(o => { byLang[o.language] = byLang[o.language] || { total: 0, found: 0 }; byLang[o.language].total++; if (o.found) byLang[o.language].found++; });
    console.log(`songs asked: ${out.length} | lyrics found: ${found}`);
    console.log("by language:", byLang);
  } else if (mode === "compare") {
    const existing = JSON.parse(fs.readFileSync("lyrics_test_existing.json", "utf8"));
    const got = JSON.parse(fs.readFileSync("lyrics_test_out.json", "utf8"));
    const ex = Object.fromEntries(existing.map(e => [e.i, e]));
    let n = 0, sameTheme = 0, sameEmo = 0, sameEmoEither = 0;
    const diffs = [];
    for (const g of got) {
      const e = ex[g.i]; if (!e) continue; n++;
      if (g.theme === e.theme) sameTheme++;
      if (g.p === e.p) sameEmo++;
      if (g.p === e.p || g.p === e.s || g.s === e.p) sameEmoEither++;
      else diffs.push({ i: g.i, ours: e.theme + "/" + e.p + (e.c === "guess" ? " (guess)" : ""), lyrics: g.theme + "/" + g.p });
    }
    const pct = x => Math.round(100 * x / n) + "%";
    console.log(`compared ${n} songs with lyrics`);
    console.log(`same theme: ${sameTheme} (${pct(sameTheme)}) | same main emotion: ${sameEmo} (${pct(sameEmo)}) | emotion matches on main or second: ${sameEmoEither} (${pct(sameEmoEither)})`);
    const guessAgree = existing.filter(e => e.c === "guess").length;
    console.log("of the 100 asked, our labels were guesses for:", guessAgree);
    console.log("biggest differences (our label vs lyric-based):", diffs.slice(0, 12));
  } else if (mode === "clean") {
    fs.rmSync("tmp_lyrics", { recursive: true, force: true });
    console.log("deleted tmp_lyrics/");
  } else console.log("usage: fetch | compare | clean");
})();
