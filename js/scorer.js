import { firebaseConfig } from "./firebase-config.js";
import { LocalStore } from "./team-management.js";
import { CATEGORIES, createScoreSheet } from "./scoring.js";
import { RunTimer } from "./timer.js";

const validConfig = firebaseConfig.projectId !== "YOUR_PROJECT_ID";
let db, auth, Firestore, localStore = new LocalStore();
let teams = [], results = [], selectedCategory = null, selectedTeam = null, selectedRound = null, sheetApi = null, currentTotal = 0, firestoreReady = false, localMode = false;

const $ = id => document.getElementById(id);
const categories = ["Explorer","Innovator","Techies"];

async function initFirebase() {
  if (!validConfig) { initLocal(); return; }
  try {
    const [
      appModule, authModule, firestoreModule
    ] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);
    const app = appModule.initializeApp(firebaseConfig);
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);
    Firestore = firestoreModule;
    firestoreReady = true;
    $("connectionStatus").textContent = "Firebase connected · live";
    authModule.onAuthStateChanged(auth, user => updateAuth(user));
    firestoreModule.onSnapshot(firestoreModule.collection(db,"teams"), snap => { teams=snap.docs.map(d=>({id:d.id,...d.data()})); refreshAll(); }, reportFirebaseError);
    firestoreModule.onSnapshot(firestoreModule.collection(db,"results"), snap => { results=snap.docs.map(d=>({id:d.id,...d.data()})); refreshAll(); }, reportFirebaseError);
  } catch (error) {
    $("connectionStatus").textContent = "Firebase connection failed";
    $("authButton").disabled = true;
    toast(`Firebase could not start: ${error.message}`);
  }
}
function initLocal() {
  localMode = true;
  localStore.subscribe(async () => {
    teams = await localStore.getTeams(); results = await localStore.getResults();
    refreshAll();
  });
  $("connectionStatus").textContent = "Local mode · not shared";
  $("authStatus").textContent = "Demo only";
  $("authButton").textContent = "Local mode";
  $("authButton").disabled = true;
}

function updateAuth(user) {
  $("authStatus").textContent = user ? `Signed in${user.email ? `: ${user.email}` : ""}` : "Not signed in";
  $("authButton").textContent = user ? "Sign out" : "Sign in";
}

async function saveTeam(team) {
  if (localMode) return localStore.saveTeam(team);
  if (!firestoreReady) throw new Error("Firebase is not connected. Team changes were not saved.");
  await Firestore.setDoc(Firestore.doc(db,"teams",team.id),team);
}
async function saveResult(result) {
  if (localMode) return localStore.saveResult(result);
  if (!firestoreReady) throw new Error("Firebase is not connected. The score was not saved.");
  await Firestore.setDoc(Firestore.doc(db,"results",result.id),result);
}

function reportFirebaseError(error) {
  $("connectionStatus").textContent = "Firebase read error";
  toast(`Firebase error: ${error.message}`);
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach(item=>item.classList.remove("active"));
  document.querySelectorAll(".view").forEach(view=>view.classList.remove("active"));
  button.classList.add("active");
  const view=button.dataset.view;
  $(`${view}View`).classList.add("active");
  $("viewTitle").textContent = button.textContent;
}));
$("quickScore").addEventListener("click",()=>document.querySelector('[data-view="scores"]').click());

$("teamForm").addEventListener("submit", async event=>{
  event.preventEvent?.();
  event.preventDefault();
  const id=$("teamId").value;
  const name=$("teamName").value.trim();
  const category=$("teamCategory").value;
  if(!name)return;
  const duplicate=teams.find(team=>team.active!==false&&team.category===category&&team.name.toLowerCase()===name.toLowerCase()&&team.id!==id);
  if(duplicate)return toast("That team name already exists in this category.");
  const team=id?teams.find(item=>item.id===id):{id:crypto.randomUUID(),registeredAt:new Date().toISOString()};
  if(!team)return;
  try {
    await saveTeam({...team,name,category,active:true});
    $("teamForm").reset(); $("teamId").value=""; $("teamFormTitle").textContent="Add Team"; $("teamSubmit").textContent="Add Team"; $("teamCancel").classList.add("hidden");
    toast("Team saved");
  } catch (error) {
    toast(`Could not save team: ${error.message}`);
  }
});
$("teamCancel").addEventListener("click",()=>{$("teamForm").reset();$("teamId").value="";$("teamFormTitle").textContent="Add Team";$("teamSubmit").textContent="Add Team";$("teamCancel").classList.add("hidden");});
$("teamSearch").addEventListener("input",renderTeams);

function renderTeams(){
  const search=$("teamSearch").value.trim().toLowerCase();
  $("teamCategoryCounts").innerHTML=categories.map(category=>{
    const count=teams.filter(team=>team.category===category&&team.active!==false&&(team.name||"").toLowerCase().includes(search)).length;
    return `<div class="category-count">${category}: <strong>${count}</strong></div>`;
  }).join("");
  $("teamLists").innerHTML=categories.map(category=>{
    const list=teams.filter(team=>team.category===category&&team.active!==false&&(team.name||"").toLowerCase().includes(search));
    return `<div class="team-column"><h3>${category} (${list.length})</h3>${list.map(team=>`
      <div class="team-row"><span>${escapeHtml(team.name)}</span><div>
      <button class="small-button" type="button" data-edit="${team.id}">Edit</button>
      <button class="small-button" type="button" data-archive="${team.id}">Archive</button></div></div>`).join("")||'<div class="team-row muted">No teams</div>'}</div>`;
  }).join("");
  document.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>{
    const team=teams.find(item=>item.id===button.dataset.edit); if(!team)return;
    $("teamId").value=team.id;$("teamName").value=team.name;$("teamCategory").value=team.category;$("teamFormTitle").textContent="Edit Team";$("teamSubmit").textContent="Save Changes";$("teamCancel").classList.remove("hidden");
  }));
  document.querySelectorAll("[data-archive]").forEach(button=>button.addEventListener("click",async()=>{
    const team=teams.find(item=>item.id===button.dataset.archive); if(!team)return;
    const hasResults=results.some(result=>result.teamId===team.id);
    if(!confirm(hasResults?"This team has submitted results. Archive it and preserve its history?":"Archive this team?"))return;
    try {
      await saveTeam({...team,active:false,archivedAt:new Date().toISOString()});
      toast("Team archived");
    } catch (error) {
      toast(`Could not archive team: ${error.message}`);
    }
  }));
}

const timer = new RunTimer($("timerDisplay"),$("timerStatus"));
$("timerStart").addEventListener("click",()=>timer.start());
$("timerStop").addEventListener("click",()=>{
  timer.stop(false);
  if(timer.actualSeconds!==null){
    $("recordedTime").textContent=formatTime(timer.actualSeconds);
    $("scoreSheetPanel").classList.remove("hidden");
  }
});
$("timerReset").addEventListener("click",()=>{
  if(timer.actualSeconds!==null&&!confirm("Reset the recorded run?"))return;
  timer.reset();$("scoreSheetPanel").classList.add("hidden");
});

document.querySelectorAll(".category-options button").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll(".category-options button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");
  selectedCategory=button.dataset.category;selectedTeam=null;selectedRound=null;
  timer.setCategory(selectedCategory);$("runPanel").classList.add("hidden");$("scoreSheetPanel").classList.add("hidden");
  document.querySelectorAll(".round-options button").forEach(item=>item.classList.remove("selected"));
  renderTeamPicker();
}));
$("scoreTeamSearch").addEventListener("input",renderTeamPicker);
function renderTeamPicker(){
  if(!selectedCategory){$("scoreTeamList").innerHTML="<p>Select a category first.</p>";return;}
  const search=$("scoreTeamSearch").value.trim().toLowerCase();
  const list=teams.filter(team=>team.category===selectedCategory&&team.active!==false&&(team.name||"").toLowerCase().includes(search));
  $("scoreTeamList").innerHTML=list.length?list.map(team=>`<button type="button" data-score-team="${team.id}" class="${selectedTeam?.id===team.id?"selected":""}">${escapeHtml(team.name)}</button>`).join(""):'<p>No teams registered. <button type="button" id="goTeam">Add a team</button></p>';
  document.querySelectorAll("[data-score-team]").forEach(button=>button.addEventListener("click",()=>{
    selectedTeam=teams.find(team=>team.id===button.dataset.scoreTeam);selectedRound=null;
    document.querySelectorAll("[data-score-team]").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");
    document.querySelectorAll(".round-options button").forEach(item=>item.classList.remove("selected"));
    $("runPanel").classList.add("hidden");$("scoreSheetPanel").classList.add("hidden");
  }));
  $("goTeam")?.addEventListener("click",()=>document.querySelector('[data-view="teams"]').click());
}
document.querySelectorAll(".round-options button").forEach(button=>button.addEventListener("click",()=>{
  if(!selectedCategory||!selectedTeam)return toast("Select a category and team first.");
  selectedRound=Number(button.dataset.round);
  document.querySelectorAll(".round-options button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");
  timer.setCategory(selectedCategory);$("runCategory").textContent=selectedCategory;$("runTeam").textContent=selectedTeam.name;$("runRound").textContent=`Round ${selectedRound}`;
  $("runPanel").classList.remove("hidden");$("scoreSheetPanel").classList.add("hidden");
  $("recordedTime").textContent="Not recorded";
  $("scoreSheetTitle").textContent=`${selectedCategory} Score Sheet`;
  $("scoreMaximum").textContent=`Maximum: ${CATEGORIES[selectedCategory].max}`;
  sheetApi=createScoreSheet(selectedCategory,$("scoreSheet"),total=>{$("liveTotal").textContent=total;currentTotal=total;});
  // Existing result is shown only at submission for explicit replacement confirmation.
}));

$("scoreSheet").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!selectedCategory||!selectedTeam||!selectedRound)return toast("Complete the scoring workflow first.");
  if(timer.actualSeconds===null)return toast("Stop the timer before submitting.");
  const existing=results.find(result=>result.teamId===selectedTeam.id&&Number(result.roundNumber)==selectedRound);
  if(existing&&!confirm(`Round ${selectedRound} already has ${existing.totalScore} points. Replace the existing result?`))return;
  const result={
    id:existing?.id||crypto.randomUUID(),teamId:selectedTeam.id,teamName:selectedTeam.name,category:selectedCategory,
    roundNumber:selectedRound,timeLimit:CATEGORIES[selectedCategory].timeLimit,actualTimeTaken:timer.actualSeconds,
    taskBreakdown:sheetApi.getBreakdown(),totalScore:currentTotal,submissionTimestamp:new Date().toISOString()
  };
  try {
    await saveResult(result);
  } catch (error) {
    toast(`Could not submit score: ${error.message}`);
    return;
  }
  toast("Score submitted successfully");
  timer.reset();$("scoreSheetPanel").classList.add("hidden");$("runPanel").classList.add("hidden");
  selectedRound=null;document.querySelectorAll(".round-options button").forEach(item=>item.classList.remove("selected"));
  refreshHistory();
});

function refreshHistory(){
  const category=$("historyCategory").value;const search=$("historySearch").value.trim().toLowerCase();
  const list=[...results].filter(result=>(!category||result.category===category)&&(result.teamName||"").toLowerCase().includes(search)).sort((a,b)=>new Date(b.submissionTimestamp)-new Date(a.submissionTimestamp));
  $("historyList").innerHTML=list.length?list.map(result=>`<div class="history-row"><strong>${escapeHtml(result.teamName)}</strong><span>${result.category}</span><span>Round ${result.roundNumber}</span><strong>${result.totalScore} pts</strong><span>${formatTime(Number(result.actualTimeTaken||0))} · ${new Date(result.submissionTimestamp).toLocaleString()}</span></div>`).join(""):'<div class="muted" style="padding:24px">No submissions</div>';
}
$("historyCategory").addEventListener("change",refreshHistory);$("historySearch").addEventListener("input",refreshHistory);

$("authDialog").addEventListener("close",()=>{});
$("authButton").addEventListener("click",async()=>{
  if(auth&&auth.currentUser){await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js").then(m=>m.signOut(auth));return;}
  if(!auth){toast("Configure Firebase before signing in.");return;}
  $("authDialog").showModal();
});
$("authCancel").addEventListener("click",()=>$("authDialog").close());
$("authForm").addEventListener("submit",async event=>{
  event.preventDefault();
  try{
    const {signInWithEmailAndPassword}=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    await signInWithEmailAndPassword(auth,$("authEmail").value,$("authPassword").value);$("authDialog").close();
  }catch(error){$("authError").textContent=error.message;}
});

function refreshAll(){renderTeams();refreshHistory();renderDashboard();}
function renderDashboard(){
  $("dashboardStats").innerHTML=categories.map(category=>{
    const teamCount=teams.filter(team=>team.category===category&&team.active!==false).length;
    const participated=new Set(results.filter(result=>result.category===category).map(result=>result.teamId)).size;
    return `<div class="stat-card"><span>${category} teams</span><strong>${teamCount}</strong><small>${participated} participated</small></div>`;
  }).join("");
}
function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;}
function escapeHtml(value){const div=document.createElement("div");div.textContent=value||"";return div.innerHTML;}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}

initFirebase();
