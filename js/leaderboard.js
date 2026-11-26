import { firebaseConfig } from "./firebase-config.js";
import { LocalStore } from "./team-management.js";
import { initThemeToggle } from "./theme.js";

const categories = ["Explorer", "Innovator", "Techies"];
const categoryDetails = {
  Explorer: { label: "Explorers" },
  Innovator: { label: "Innovators" },
  Techies: { label: "Techies" }
};
let activeCategory = "Explorer";
let categoryIndex = 0;
let teamRowIndex = 0;
let teams = [];
let results = [];
let store = new LocalStore();
const validConfig = firebaseConfig.projectId !== "YOUR_PROJECT_ID";
const rotationIntervalMs = 3000;
initThemeToggle();

async function init() {
  if (validConfig) await initFirestore(); else initLocal();
  document.getElementById("fullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  window.setInterval(advanceRotation, rotationIntervalMs);
  setInterval(() => {
    document.getElementById("liveClock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  }, 1000);
  document.getElementById("liveClock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

async function initFirestore() {
  try {
    const [
      { initializeApp }, { getFirestore, collection, onSnapshot }
    ] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);
    const db = getFirestore(initializeApp(firebaseConfig));
    document.getElementById("connectionStatus").textContent = "Live updates connected";
    onSnapshot(collection(db, "teams"), snapshot => {
      teams = snapshot.docs.map(doc => ({id:doc.id,...doc.data()}));
      render();
    }, reportFirebaseError);
    onSnapshot(collection(db, "results"), snapshot => {
      results = snapshot.docs.map(doc => ({id:doc.id,...doc.data()}));
      render();
    }, reportFirebaseError);
  } catch (error) {
    document.getElementById("connectionStatus").textContent = "Live updates unavailable";
  }
}
function initLocal() {
  store.subscribe(async () => {
    teams = await store.getTeams();
    results = await store.getResults();
    document.getElementById("connectionStatus").textContent = "Demo mode";
    render();
  });
}
function reportFirebaseError(error) {
  document.getElementById("connectionStatus").textContent = "Live updates unavailable";
}

function millisecondsFor(result) {
  return Number(result.actualTimeMilliseconds ?? Number(result.actualTimeTaken ?? result.actualTimeSeconds ?? 0) * 1000);
}
function render() {
  const category = categoryDetails[activeCategory];
  document.getElementById("leaderboardTitle").textContent = `${category.label} Leaderboard`;
  const categoryTeams = teams.filter(team => team.category === activeCategory && team.active !== false);
  const rows = categoryTeams.map(team => {
    const teamResults = results.filter(result => result.teamId === team.id && result.category === activeCategory);
    const r1 = teamResults.find(result => Number(result.roundNumber) === 1);
    const r2 = teamResults.find(result => Number(result.roundNumber) === 2);
    const attempts = [r1,r2].filter(Boolean);
    const best = attempts.length ? attempts.reduce((winner,current) =>
      Number(current.totalScore) > Number(winner.totalScore) ||
      (Number(current.totalScore) === Number(winner.totalScore) && millisecondsFor(current) < millisecondsFor(winner)) ? current : winner
    ) : null;
    return { team, r1, r2, best };
  });
  rows.sort((a,b) => {
    if (!a.best && b.best) return 1;
    if (a.best && !b.best) return -1;
    if (!a.best && !b.best) return a.team.name.localeCompare(b.team.name);
    return Number(b.best.totalScore) - Number(a.best.totalScore) || millisecondsFor(a.best) - millisecondsFor(b.best) || a.team.name.localeCompare(b.team.name);
  });
  const participated = rows.filter(row => row.r1 || row.r2).length;
  document.getElementById("registeredCount").textContent = categoryTeams.length;
  document.getElementById("participatedCount").textContent = participated;
  document.getElementById("pendingCount").textContent = categoryTeams.length - participated;
  document.getElementById("leaderName").textContent = rows.find(row => row.best)?.team.name || "—";
  document.getElementById("leaderboardBody").innerHTML = rows.length ? rows.map((row,index) => `
    <tr data-team-row="${index}" class="${index === teamRowIndex ? "current-team" : ""}">
      <td><span class="rank-badge">${index+1}</span></td>
      <td><strong>${escapeHtml(row.team.name)}</strong></td>
      <td>${row.r1 ? `<span class="team-score">${row.r1.totalScore}</span>` : "—"}</td>
      <td>${row.r1 ? formatTime(millisecondsFor(row.r1)) : "—"}</td>
      <td>${row.r2 ? `<span class="team-score">${row.r2.totalScore}</span>` : "—"}</td>
      <td>${row.r2 ? formatTime(millisecondsFor(row.r2)) : "—"}</td>
      <td>${row.best ? `<span class="team-score">${row.best.totalScore}</span>` : "—"}</td>
    </tr>`).join("") : `<tr><td colspan="7" class="muted" style="text-align:center;padding:40px">No registered teams</td></tr>`;
  document.getElementById("lastUpdated").textContent = new Date().toLocaleString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
function advanceRotation() {
  const rows = document.querySelectorAll("#leaderboardBody tr[data-team-row]");
  if (teamRowIndex + 1 < rows.length) {
    rows[teamRowIndex].classList.remove("current-team");
    teamRowIndex++;
    rows[teamRowIndex].classList.add("current-team");
    rows[teamRowIndex].scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }
  categoryIndex = (categoryIndex + 1) % categories.length;
  activeCategory = categories[categoryIndex];
  teamRowIndex = 0;
  document.getElementById("leaderboardWrap").scrollTop = 0;
  render();
}
function formatTime(milliseconds) {
  const minutes=Math.floor(milliseconds/60000);
  const seconds=Math.floor(milliseconds/1000)%60;
  const remainder=Math.floor(milliseconds%1000);
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}:${String(remainder).padStart(3,"0")}`;
}
function escapeHtml(value) { const div=document.createElement("div"); div.textContent=value||""; return div.innerHTML; }
init();
