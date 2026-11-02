# PS Simpsons: weekly study-guide generator

Instructions for the run that researches and publishes each week's episode guide.
All paths are relative to the root of the `abratica/ps-simpsons` repo (live at https://abratica.github.io/ps-simpsons/).
The app (`index.html`, `js/`, `css/`, `sw.js`) only displays the JSON files. Do not change the app during a weekly run.

The podcast records on **Wednesday**. The guide should be live by **Sunday morning** of that week.

## What to produce

1. `episodes/sXXeYY.json` for the episode named in `index.json` → `upNext` (zero-padded, e.g. `s01e02`).
2. Update `index.json`:
   - `current` → `{ "id": "<that episode>", "recording": "<the coming Wednesday, YYYY-MM-DD, America/New_York>" }`
   - `upNext` → the following episode's id (add the next season's block to `seasons` when crossing into it, with every episode's id, number and title, `ready: false`).
   - Set `ready: true` on the episode you just wrote.
3. Validate both files (`python3 -m json.tool <file>`), commit `Episode sXXeYY: <title>` and push to `main`.

`episodes/s01e01.json` is the reference example for every field.

## Episode file shape

Top level: `id`, `season`, `episode`, `prodCode`, `title`, `airDate` (YYYY-MM-DD), `writer`, `director`, `runtime`, `still` (always `null`; Andrew adds his own screenshot later), `sections`, `sources`.

`sources` is a map of short keys to `{ "title", "url" }`. Every item cites one or more keys in `src`.

Sections, in this order, with these exact ids and titles:

| id | title | style | what goes in it |
|---|---|---|---|
| `plot` | Plot Refresher | `steps` | 8–12 beats in story order, each one or two sentences. A refresher for people who watched it, not a teaser. |
| `eggs` | Easter Eggs / In-Jokes | `items` | Sight gags, background signs and text, freeze-frame jokes, references and parodies, callbacks, foreshadowing, notable animation goofs. In episode order where known. Each has `tag` (Sight gag, Reference, In-joke, Running gag, Setup, Callback, Goof), `time` (`"~MM:SS"` only if a source gives it, else `null`) and `confirmed`. This is the most important section: aim for 15+ items. |
| `moment` | The Moment | `items` | What was happening when it aired: TV landscape, ratings, news, pop culture the jokes are aimed at. A `"Worth discussing"` item may connect dots, but must say it is our own connection, not a sourced claim. |
| `writers` | Writers' Room | `items` | Who wrote and directed it and their background, how the story came about, rewrites, cut ideas, censors, production stories. |
| `commentary` | Commentary Notes | `items` | Who is on the DVD commentary (Wikisimpsons "DVD features" page) and stories from it as reported by other sources. Keep the section `note` saying the commentary isn't online. |
| `firsts` | Firsts & Guest Voices | `items` | Character debuts, firsts, guest stars and who they voiced, early-version differences, later payoffs/callbacks to this episode. |
| `reception` | Reception & Legacy | `items` | Ratings if not already in The Moment, awards, critics, rankings, later influence. |

Copy `note` text for `eggs` and `commentary` from the reference file.

## Sources, in the order to check them

Use WebSearch to find each page (search results' URLs fetch cleanly), then WebFetch it with a prompt asking for every specific detail copied faithfully.

1. **The Simpsons Archive (SNPP) capsule**: `https://simpsonsarchive.com/episodes/<PRODCODE>.txt`. Best source for freeze-frame gags, "didja notice" items, references and goofs.
2. **Wikipedia** episode article. Production, plot, reception, ratings, awards. Footnotes often cite the DVD commentary.
3. **Wikisimpsons** (`simpsonswiki.com/wiki/<PRODCODE>`) plus its subpages: `/References`, `/Appearances`, `/DVD_features`, `/Music`.
4. **Fandom Simpsons Wiki** (`simpsons.fandom.com`) episode page, for trivia the other wiki lacks.
5. **Retrospectives, oral histories, interviews**: search `"<title>" Simpsons` plus words like *oral history*, *behind the scenes*, *writer interview*, *anniversary*. Good outlets: The A.V. Club, The Ringer, Vanity Fair, Vulture, Cracked, Mental Floss, /Film, Den of Geek, IGN.
6. **TV Tropes** recap page (`tvtropes.org/pmwiki/pmwiki.php/Recap/TheSimpsonsS<S>E<E>...`): secondary source for references and setups.
7. **MovieMistakes** (`moviemistakes.com/tv3501/season<N>`): goofs, often with timestamps.
8. **News and history from the air date**: what was in the news that month, and the TV landscape (Wikipedia's season page, EBSCO Research Starters, ADST, newspaper retrospectives).
9. **Reddit r/TheSimpsons, IMDb trivia, Frinkiac**: use if they can be reached. As of the first run, IMDb and Frinkiac refuse automated fetches and Reddit threads didn't surface in search, so skip them without retrying if blocked.

If a site is blocked or a page is missing, move to the next source. Never route around a block with another tool or a mirror.

## Accuracy rules

- **Only state what a source you actually read says.** Every item has at least one `src`.
- `confirmed: true` only when two independent sources agree, or one authoritative source does (Wikipedia citing the DVD commentary or an interview, or a named person's own account in a published interview). An item backed only by one fan source (SNPP, a wiki, TV Tropes, MovieMistakes, Reddit) gets `confirmed: false`, which shows an "Unconfirmed" flag.
- Claims that are one person's account (e.g. a writer describing how they were treated) say so in the text.
- When sources disagree on a number or date, use the better-sourced one and don't present the other as fact.
- No guesses: no timestamps, sign text or character names unless a source gives them.

## Writing rules

- Everything in your own words. No passages copied from sources; a short quoted phrase at most, and rarely.
- Never reproduce song lyrics, even a line. Refer to the song by title.
- Plain, conversational, specific. Written for three friends prepping a podcast, not for a wiki.
- No images. `still` stays `null`.
