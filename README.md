# PromptRush Elite

PromptRush Elite is a browser-based speed word trainer for letter-prompt word games. It helps you practice fast recall by searching a custom dictionary, ranking suggestions, copying words quickly, tracking used words, and saving your own accepted/rejected word memory.

## Features

- **Elite Assist Mode** — ranking tuned for speed-focused practice
- **Fast Word Engine** — substring search with optional punctuation-insensitive matching
- **Top Suggestion** panel — copy the best word, cycle alternatives, and mark word confidence
- **Ranked Results** table with sort modes such as best, longest, rare letters, hyphen-heavy, and easy typing
- **Used Words** tracking with undo and round reset
- **Accepted / Rejected Memory** stored locally in your browser
- **Short Definitions** via the Free Dictionary API with local caching
- **Fast Practice** with random prompts, streaks, timer stats, and retry tools
- **Custom Dictionary** support through `words.txt` or in-app `.txt` upload

## Demo dictionary

This project does **not** include or claim to include any official third-party dictionary.

For public portfolio use, the repository should include only `sample-words.txt` as a tiny demo list. For real practice, provide your own `words.txt` locally or upload a custom `.txt` file in the app.

## Tech stack

- HTML
- CSS
- Vanilla JavaScript
- `localStorage`
- Free Dictionary API for optional definitions

## Run locally

Serve the folder over HTTP so the app can load dictionary files.

```bash
# Node
npx serve .

# or Python 3
python -m http.server 8080
```

Then open the localhost link shown in the terminal.

Opening `index.html` directly from disk may block dictionary loading in some browsers.

## Use your own dictionary

Create a file named:

```text
words.txt
```

Place it next to `index.html`.

The app expects one word per line. Public releases should avoid uploading private or unclear-source word banks. The included `.gitignore` is set up to ignore `words.txt`.

You can also upload a `.txt` dictionary directly inside the app.

## Word format

The default format filter accepts:

- lowercase letters `a-z`
- optional hyphens `-`
- optional apostrophes `'`
- length from 2 to 30 characters

Invalid lines are filtered and counted separately.

## Accepted / rejected memory

Accepted and rejected labels are user-marked only. They are saved in your browser using `localStorage` and are not verified against any official source.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Copy top suggestion |
| **Shift + Enter** | Copy next best suggestion |
| **Tab** | Cycle selection |
| **Esc** | Clear prompt input |
| **Ctrl + Z** | Undo last used word |

## Definitions

- Click **Define** on the top suggestion or a result row.
- Definitions are fetched on demand and cached in `localStorage`.
- The app shows one short definition when available.
- Search and ranking do not depend on definitions.

## Project layout

| File | Role |
|------|------|
| `index.html` | Layout and controls |
| `style.css` | Dark console UI |
| `script.js` | UI, clipboard, definitions, and interaction logic |
| `dictionary.js` | Dictionary loading, validation, and substring index |
| `ranking.js` | Scoring and sort modes |
| `storage.js` | `localStorage` persistence |
| `sample-words.txt` | Tiny public demo dictionary |
| `words.txt` | Optional local dictionary ignored by Git |

## Privacy

The app runs locally in your browser. Used words, settings, accepted/rejected labels, definitions, and practice stats are stored in `localStorage`.

## Disclaimer

PromptRush Elite is a generic speed word-practice tool for personal training, learning, and portfolio demonstration. It is not affiliated with any third-party game or platform and does not include any official proprietary dictionary.

## Future improvements

- Import/export saved settings
- More practice analytics
- Optional offline definitions
- Better mobile layout
- More ranking presets
