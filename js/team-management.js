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
  async clearScores(teamId, roundNumber = null) {
    const results = await this.getResults();
    const remaining = results.filter(result =>
      result.teamId !== teamId || (roundNumber !== null && Number(result.roundNumber) !== Number(roundNumber)));
    const cleared = results.length - remaining.length;
    if (cleared) {
      localStorage.setItem("roboGResults", JSON.stringify(remaining));
      this.channel?.postMessage({ type: "data-updated" });
    }
    return cleared;
  }
  async deleteTeam(teamId) {
    const [teams, results] = await Promise.all([this.getTeams(), this.getResults()]);
    const remainingTeams = teams.filter(team => team.id !== teamId);
    const remainingResults = results.filter(result => result.teamId !== teamId);
    const cleared = results.length - remainingResults.length;
    localStorage.setItem("roboGTeams", JSON.stringify(remainingTeams));
    localStorage.setItem("roboGResults", JSON.stringify(remainingResults));
    this.channel?.postMessage({ type: "data-updated" });
    return cleared;
  }
  subscribe(callback) {
    callback();
    window.addEventListener("storage", callback);
    this.channel?.addEventListener("message", callback);
  }
}
