# Japanese Every Day — Version 0.2

A free, buildless Japanese-learning app for absolute beginners, hosted at https://quirusm.github.io/japanese-learning/.

## Learning experience

- 16 sequential lessons in four units: first conversations, everyday essentials, out in the world, and making a connection.
- Exactly three new expressions per lesson (48 total). Start with hello / yes / no; build toward introductions, requests, cafés, shopping, directions, and simple personal conversation.
- Each lesson contains 17 short steps: meet three expressions, recognition, listening comprehension, typed recall, spoken repetition, and two situational replies. Mistakes add a later recall attempt.
- One new lesson a day is recommended. The daily plan targets 5 minutes of review, 10 learning, 10 speaking, and 5 conversation. Rounds may be repeated to fill the time; the app does not pretend a short round took 10 minutes.
- Active practice time is tracked only while a practice screen is visible and the learner has interacted within the last minute.
- Review intervals: 1, 3, 7, 14, 30, 60 days. Again returns in 10 minutes; Almost returns in one day. Early practice leaves scheduled dates unchanged. These are deliberately simple intervals, not a claim to implement a research-grade adaptive model.

## iPhone and saved progress

The main `index.html` now serves Version 0.2. `v02.html` redirects to the main address, so icons/bookmarks for either entry point reach the current app. The manifest, Apple touch icon, safe-area spacing, large controls, and responsive layout support Home Screen use.

Japanese audio keeps the working Version 0.1 approach: a tap calls `speechSynthesis.speak()` with `SpeechSynthesisUtterance`, `lang = ja-JP`, and normal rate 0.78. A Japanese voice is selected when available. Slow audio uses 0.62. No microphone access or pronunciation scoring is used. If a device cannot play speech, listening questions offer an explicitly labelled reading fallback.

Storage keys `jp_index`, `jp_done`, and `jp02completed` are read but never changed or deleted. The raw values are archived under `jp_v02_legacy_snapshot` and copied into the new `jp_everyday_v02` save. Practised phrases join the review deck without being labelled mastered. Only the identical first lesson from the earlier 0.2 draft receives completion credit; the raw old completion count remains visible.

Every exercise position, typed draft answer, and review grade saves automatically. A reload returns to Today with a Resume button. A paused session must be finished before beginning another, to prevent silently losing its place.

Settings includes JSON export and validated restore with a preview. Before restore, the current save is kept under `jp_everyday_v02_before_restore`. Corrupt saves are copied to timestamped recovery keys before a new save is started when storage permits. If storage fails, the app reports it and export remains available. Progress stays local; no cross-device sync is provided. Export before clearing website data.

The service worker caches the app for repeat/offline visits after a successful online load. Navigation checks the network first. Versioned assets and a manual update check avoid pinning the old page. Offline speech depends on a voice available on the device. Close and reopen an old Home Screen view while online; do not delete website data to update.

## Development and deployment

No package installation or build is required. GitHub Pages publishes the repository root from `main` using its existing Pages build and deployment pipeline. `.nojekyll` keeps this a plain static site. Commit changes to `main`, wait for the matching Pages deployment to succeed, then verify the root page, scripts, and `version.json` against the committed files.

Run the dependency-free checks with Node.js:

```sh
node --check app.js
node --check engine.js
node --check curriculum.js
node --check sw.js
node --test tests/engine.test.js
```

Tests cover curriculum size, old-save migration (partial and complete), progression, due-date boundaries, scheduling, recall normalisation, and restore validation. Browser QA exercises a complete lesson, intentional mistakes, reload/resume, progression, early reviews, and narrow layouts. Actual iOS audio still needs confirmation on an iPhone; a desktop/cloud browser cannot establish that.

## Limits

This release is a small foundation course, not a complete route to conversational proficiency. Conversation activities use authored situations, not open-ended AI chat. Speaking is self-assessed, not automatically graded. All functionality runs in the browser with no accounts, analytics, paid APIs, subscriptions, or third-party runtime assets.
