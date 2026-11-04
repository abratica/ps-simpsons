# PS Simpsons

Every Simpsons episode, explained: plot, Easter eggs, behind the scenes and reception. A new episode is added each week.

Live at https://abratica.github.io/ps-simpsons/

- `index.json`: this week's episode, what's next, and the episode list
- `episodes/sXXeYY.json`: one researched guide per episode, every item sourced
- `GENERATOR.md`: instructions for the weekly research run

To add your own screenshot for an episode, put the image in `episodes/img/` and set that episode's `"still"` to its path (e.g. `"episodes/img/s01e01.jpg"`).

Episode stills come from TMDB by default. To fill them in, get a key at https://www.themoviedb.org/settings/api and run
`TMDB_API_KEY=yourkey python3 scripts/tmdb_stills.py s01e01` (or `--all`). It writes the still path into the episode's `"tmdbStill"` and its entry in `index.json`. `--index` fills stills for every episode in `index.json`, so the home grid shows pictures even before a page exists. Your own `"still"` screenshot always takes priority. Don't commit the key.
