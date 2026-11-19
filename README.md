# ROBO-G Robotics Tournament Management System

## Run locally

From the project folder, start a local web server:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/index.html` for the public leaderboard and `http://localhost:8000/scorer.html` for the scorer console.

When Firebase configuration placeholders are unchanged, the app runs in a local browser-storage mode. It is suitable for testing on one computer, but not for separate devices.

## Configure Firebase

1. Create a Firebase project.
2. Enable Firestore Database and Firebase Authentication (Email/Password).
3. Register a web app and copy its web configuration.
4. Replace the placeholders in `js/firebase-config.js`.
5. Create an authorized scorer user in Firebase Authentication.
6. Add a custom user claim named `scorer` with the Boolean value `true`. Firebase Console custom claims require the Admin SDK or Firebase CLI. An example:

```javascript
const { getAuth } = require("firebase-admin/auth");
await getAuth().setCustomUserClaims("SCORER_UID", { scorer: true });
```

7. Deploy `firebase.rules` to Firestore as `firestore.rules`, or paste its contents into Firebase Console → Firestore Database → Rules.
8. Serve the files over HTTPS or localhost. Firebase modules require an HTTP(S) server; do not open them with `file://`.

## Deploy

For Firebase Hosting:

```powershell
npm install -g firebase-tools
firebase login
firebase init hosting firestore
firebase deploy
```

Select this project directory as the public directory and set `index.html` as a normal static entry. Deploy security rules with `firebase deploy --only firestore:rules`.

## Firestore collections

- `teams`: `id`, `name`, `category`, `registeredAt`, `active`, and optional `archivedAt`
- `results`: `id`, `teamId`, `teamName`, `category`, `roundNumber`, `timeLimit`, `actualTimeTaken`, `taskBreakdown`, `totalScore`, `submissionTimestamp`
- `categories`: optional category metadata

## Scorer workflow

1. Sign in with an authorized scorer account.
2. Add or manage teams in Manage Teams.
3. Open Enter Scores and select category, team, and round.
4. Start the timer, stop it at the end of the run, enter the score-sheet results, review, and submit.
5. Replacing an existing round requires confirmation.

The public leaderboard opens independently and listens to Firestore updates in real time. If Firebase is unavailable, the app uses local browser storage and cross-tab updates as a fallback.
