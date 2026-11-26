# IRO 2026 Nationals

The mobile-friendly scorer and live results pages are static HTML/CSS/JavaScript hosted on GitHub Pages. The IRO logo is used on both pages and as the site icon. Shared team/result changes update both pages in real time. GitHub Pages hosts files only; it does not provide a shared database.

## One-time setup

### 1. Configure Firebase

1. Create a Firebase project and register a Web app.
2. Enable **Cloud Firestore** and **Authentication → Sign-in method → Google**. Select a project support email when prompted.
3. Create a Firestore database.
4. Copy the Firebase Web app configuration into `js/firebase-config.js`.
   The Firebase web config is visible in the browser by design. Never put a service-account key or Admin SDK credential in this repository.
5. In Firebase Authentication → Settings → Authorized domains, add `themxtr.github.io`.
6. Firebase Authentication creates the Google user automatically at first sign-in. The scorer UI and Firestore rules authorize only the verified `robogbangalore@gmail.com` account.
7. Publish the rules with `firebase deploy --only firestore:rules --project iro2026`, or paste the contents of `firebase.rules` in Firestore → Rules. The included `firebase.json` maps the rules file for Firebase CLI deployment.

The rules allow the public leaderboard to read data, but only the authenticated, verified scorer email above can change teams or create, update, or delete results. Other Google accounts are signed out and shown “No entry.” The rules—not hidden controls in the HTML—enforce access.

### 2. Enable GitHub Pages

1. Push the `main` branch to `https://github.com/themxtr/iro-scorer`.
2. Open **Settings → Pages** for the repository.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. The included `.github/workflows/pages.yml` publishes the static files on each push to `main`. Check **Actions** for the deployment status.

Once deployed, open:

- Public results: `https://themxtr.github.io/iro-scorer/`
- Scorer console: `https://themxtr.github.io/iro-scorer/scorer.html`

### 3. Use it live

1. Sign in on `scorer.html` using an authorized scorer account.
2. Add teams to Explorers (ages 5–7), Innovators (ages 7–10), or Techies (ages 10–15).
3. Select a team and round, enter the score criteria, then enter the run time as `MM:SS:MMM` (minutes, seconds, milliseconds) and update the score.
4. Open the public results URL on the projector/TV.
5. The public page listens to Firestore snapshots and refreshes the standings automatically after each change. It cycles through Explorers, Innovators, and Techies, advancing through team rows every three seconds and repeating continuously.

Deleting a team also deletes its saved scores. In Submission History, **Clear score** lets the scorer remove only the selected round or both rounds for that team.

Both pages show a live-update connection status. If the Firebase configuration is still the placeholder, the scorer explicitly runs in local demo mode; browser storage is not shared across devices. If Firebase is configured but cannot connect, the app reports that live data is unavailable instead of silently switching to local data.

The same light/dark toggle is available on both pages. The selected theme is saved in the browser and shared between the scorer and leaderboard on that device.

## Local preview

Serve the project over HTTP (ES modules do not work from a `file://` URL):

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/` and `http://localhost:8000/scorer.html`. For shared multi-device testing, configure Firebase as above; local demo mode is only for one browser.

## Firestore data

- `teams`: `name`, `category`, `registeredAt`, `active`, optional `archivedAt`
- `results`: `teamId`, `teamName`, `category`, `roundNumber`, `actualTimeTaken` (seconds, retained for older clients), `actualTimeMilliseconds`, `taskBreakdown`, `totalScore`, `submissionTimestamp`

Round results are stored independently. Replacing an existing team/round result requires confirmation.
