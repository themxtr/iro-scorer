import { firebaseConfig } from "./firebase-config.js";
import { LocalStore } from "./team-management.js";

const categories = ["Explorer", "Innovator", "Techies"];
let activeCategory = "Explorer";
let teams = [];
let results = [];
let store = new LocalStore();
let unsubscribe = null;

const validConfig = firebaseConfig.projectId !== "YOUR_PROJECT_ID";

async function init() {
  if (validConfig) await initFirestore(); else initLocal();
  document.querySelectorAll(".category-tab").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".category-tab").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeCategory = button.dataset.category;
    render();
  }));
  document.getElementById("fullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  setInterval(() => {
    document.getElementById("liveClock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  }, 1000);
  document.getElementById("liveClock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

async function initFirestore() {
  try {
    const [
      { initializeApp }, { getFirestore, collection, onSnapshot, query }
    ] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);
    const db = getFirestore(initializeApp(firebaseConfig));
    document.getElementById("connectionStatus").textContent = "Firestore connected";
    onSnapshot(collection(db, "teams"), snapshot => {
      teams = snapshot.docs.map(doc => ({id:doc.id,...doc.data()}));
      render();
    });
    onSnapshot(collection(db, "results"), snapshot => {
      results = snapshot.docs.map(doc => ({id:doc.id,...doc.data()}));
      render();
    });
  } catch (error) {
    document.getElementById("connectionStatus").textContent = "Firestore unavailable";
    initLocal();
  }
}
function initLocal() {
  store.subscribe(async () => {
    teams = await store.getTeams();
    results = await store.getResults();
    document.getElementById("connectionStatus").textContent = "Local mode";
    render();
  });
}

function secondsFor(result) {
  return Number(result.actualTimeTaken ?? result.actualTimeSeconds ?? 0);
}
function render() {
  document.getElementById("leaderboardTitle").textContent = `${activeCategory} Leaderboard`;
  const categoryTeams = teams.filter(team => team.category === activeCategory && team.active !== false);
  const rows = categoryTeams.map(team => {
    const teamResults = results.filter(result => result.teamId === team.id && result.category === activeCategory);
    const r1 = teamResults.find(result => Number(result.roundNumber) === 1);
    const r2 = teamResults.find(result => Number(result.roundNumber) === 2);
    const attempts = [r1,r2].filter(Boolean);
    const best = attempts.length ? attempts.reduce((winner,current) =>
      Number(current.totalScore) > Number(winner.totalScore) ||
      (Number(current.totalScore) === Number(winner.totalScore) && secondsFor(current) < secondsFor(winner)) ? current : winner
    ) : null;
    return { team, r1, r2, best };
  });
  rows.sort((a,b) => {
    if (!a.best && b.best) return 1;
    if (a.best && !b.best) return -1;
    if (!a.best && !b.best) return a.team.name.localeCompare(b.team.name);
    return Number(b.best.totalScore) - Number(a.best.totalScore) || secondsFor(a.best) - secondsFor(b.best) || a.team.name.localeCompare(b.team.name);
  });
  const participated = rows.filter(row => row.r1 || row.r2).length;
  document.getElementById("registeredCount").textContent = categoryTeams.length;
  document.getElementById("participatedCount").textContent = participated;
  document.getElementById("pendingCount").textContent = categoryTeams.length - participated;
  document.getElementById("leaderName").textContent = rows.find(row => row.best)?.team.name || "—";
  document.getElementById("leaderboardBody").innerHTML = rows.length ? rows.map((row,index) => `
    <tr>
      <td><span class="rank-badge">${index+1}</span></td>
      <td><strong>${escapeHtml(row.team.name)}</strong></td>
      <td>${row.r1 ? `<span class="team-score">${row.r1.totalScore}</span>` : "—"}</td>
      <td>${row.r1 ? formatTime(secondsFor(row.r1)) : "—"}</td>
      <td>${row.r2 ? `<span class="team-score">${row.r2.totalScore}</span>` : "—"}</td>
      <td>${row.r2 ? formatTime(secondsFor(row.r2)) : "—"}</td>
      <td>${row.best ? `<span class="team-score">${row.best.totalScore}</span>` : "—"}</td>
    </tr>`).join("") : `<tr><td colspan="7" class="muted" style="text-align:center;padding:40px">No registered teams</td></tr>`;
  document.getElementById("lastUpdated").textContent = new Date().toLocaleString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
function formatTime(seconds) { return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`; }
function escapeHtml(value) { const div=document.createElement("div"); div.textContent=value||""; return div.innerHTML; }
init();
