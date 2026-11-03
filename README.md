# PS Simpsons

A weekly episode study guide for the podcast. One episode a week, live by Sunday for Wednesday's recording.

Live at https://abratica.github.io/ps-simpsons/

- `index.json`: this week's episode, what's next, and the episode list
- `episodes/sXXeYY.json`: one researched guide per episode, every item sourced
- `GENERATOR.md`: instructions for the weekly research run

To add your own screenshot for an episode, put the image in `episodes/img/` and set that episode's `"still"` to its path (e.g. `"episodes/img/s01e01.jpg"`).

Episode stills come from TMDB by default. To fill them in, get a key at https://www.themoviedb.org/settings/api and run
`TMDB_API_KEY=yourkey python3 scripts/tmdb_stills.py s01e01` (or `--all`). It writes the still path into the episode's `"tmdbStill"`. Your own `"still"` screenshot always takes priority. Don't commit the key.
