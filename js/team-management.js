export class LocalStore {
  constructor() {
    this.channel = "BroadcastChannel" in window ? new BroadcastChannel("robo-g-data") : null;
  }
  async getTeams() {
    return JSON.parse(localStorage.getItem("roboGTeams") || "[]");
  }
  async getResults() {
    return JSON.parse(localStorage.getItem("roboGResults") || "[]");
  }
  async saveTeam(team) {
    const teams = await this.getTeams();
    const index = teams.findIndex(item => item.id === team.id);
    if (index >= 0) teams[index] = team; else teams.push(team);
    localStorage.setItem("roboGTeams", JSON.stringify(teams));
    this.channel?.postMessage({ type: "data-updated" });
  }
  async saveResult(result) {
    const results = await this.getResults();
    const index = results.findIndex(item => item.teamId === result.teamId && item.roundNumber === result.roundNumber);
    if (index >= 0) results[index] = result; else results.push(result);
    localStorage.setItem("roboGResults", JSON.stringify(results));
    this.channel?.postMessage({ type: "data-updated" });
  }
  subscribe(callback) {
    callback();
    window.addEventListener("storage", callback);
    this.channel?.addEventListener("message", callback);
  }
}
