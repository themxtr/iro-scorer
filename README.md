# ROBO-G Robotics Tournament Management System

The app is static HTML/CSS/JavaScript hosted on GitHub Pages. Firebase Firestore is the shared database and pushes team/result changes to both pages in real time. GitHub Pages hosts files only; it does not provide a shared database.

## One-time setup

### 1. Configure Firebase

1. Create a Firebase project and register a Web app.
2. Enable **Cloud Firestore** and **Authentication → Email/Password**.
3. Create a Firestore database.
4. Copy the Firebase Web app configuration into `js/firebase-config.js`.
   The Firebase web config is visible in the browser by design. Never put a service-account key or Admin SDK credential in this repository.
5. In Firebase Authentication → Settings → Authorized domains, add `themxtr.github.io`.
6. Add `robogbangalore@gmail.com` as a user in Firebase Authentication and verify the email. Firestore rules authorize only this verified email to make scorer changes.
7. Publish the rules with `firebase deploy --only firestore:rules --project iro2026`, or paste the contents of `firebase.rules` in Firestore → Rules. The included `firebase.json` maps the rules file for Firebase CLI deployment.

The rules allow the public leaderboard to read data, but only the authenticated, verified scorer email above can change teams or submit results. Firestore rules—not hidden controls in the HTML—enforce access.

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
2. Add teams, then submit their round scores.
3. Open the public results URL on the projector/TV.
4. The public page listens to Firestore snapshots and refreshes the standings automatically after each change. It cycles through Explorer, Innovator, and Techies, advancing through team rows every three seconds and repeating continuously.

Both pages should show a Firebase/Firestore connection status. If the Firebase configuration is still the placeholder, the scorer explicitly runs in local demo mode; browser storage is not shared across devices. If Firebase is configured but cannot connect, the app shows the error instead of silently switching to local data.

The same light/dark toggle is available on both pages. The selected theme is saved in the browser and shared between the scorer and leaderboard on that device.

## Local preview

Serve the project over HTTP (ES modules do not work from a `file://` URL):

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/` and `http://localhost:8000/scorer.html`. For shared multi-device testing, configure Firebase as above; local demo mode is only for one browser.

## Firestore data

- `teams`: `name`, `category`, `registeredAt`, `active`, optional `archivedAt`
- `results`: `teamId`, `teamName`, `category`, `roundNumber`, `timeLimit`, `actualTimeTaken`, `taskBreakdown`, `totalScore`, `submissionTimestamp`

Round results are stored independently. Replacing an existing team/round result requires confirmation.
