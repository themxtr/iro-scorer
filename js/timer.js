import { CATEGORIES } from "./scoring.js";

export class RunTimer {
  constructor(display, status) {
    this.display = display;
    this.status = status;
    this.category = null;
    this.remaining = 0;
    this.initial = 0;
    this.interval = null;
    this.running = false;
    this.actualSeconds = null;
  }
  setCategory(category) {
    this.stop(false);
    this.category = category;
    this.initial = CATEGORIES[category]?.seconds || 0;
    this.remaining = this.initial;
    this.actualSeconds = null;
    this.status.textContent = "Timer ready";
    this.render();
  }
  start() {
    if (!this.category || this.running) return;
    if (this.actualSeconds !== null) this.reset();
    this.running = true;
    this.status.textContent = "Run in progress";
    this.interval = setInterval(() => {
      this.remaining--;
      this.render();
      if (this.remaining <= 0) this.stop(true);
    }, 1000);
  }
  stop(auto = false) {
    if (!this.category) return;
    clearInterval(this.interval);
    this.interval = null;
    if (this.running || auto) {
      this.running = false;
      this.actualSeconds = this.initial - this.remaining;
      this.status.textContent = auto ? "Time limit reached" : "Run stopped";
    }
  }
  reset() {
    if (!this.category) return;
    clearInterval(this.interval);
    this.interval = null;
    this.running = false;
    this.remaining = this.initial;
    this.actualSeconds = null;
    this.status.textContent = "Timer reset";
    this.render();
  }
  render() {
    const value = Math.max(0, this.remaining);
    const min = Math.floor(value / 60);
    const sec = value % 60;
    this.display.textContent = `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }
}
