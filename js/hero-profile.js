/* Text remains useful without JavaScript; motion never controls access to roles. */
(() => {
  const title = document.querySelector("#rotating-role");
  const control = document.querySelector("#role-toggle");
  if (!title || !control) return;

  // Keep the accessible summary and longest-title .role-sizer in index.html in sync.
  const roles = ["Computer Engineering Student", "Web Developer", "Full-Stack Builder", "IoT Prototyper"];
  const hold = 3600;
  let index = 0;
  let phase = "hold";
  let length = roles[0].length;
  let timer = 0;
  let paused = false;
  let visible = false;
  let suspended = false;
  const animated = () => window.portfolioMotion?.enabled ?? false;
  const canRun = () => !paused && visible && !document.hidden && !suspended;

  function clearTimer() {
    window.clearTimeout(timer);
    timer = 0;
  }
  function settle() {
    phase = "hold";
    length = roles[index].length;
    title.textContent = roles[index];
  }
  function schedule(delay = hold) {
    clearTimer();
    if (canRun()) timer = window.setTimeout(tick, delay);
  }
  function tick() {
    timer = 0;
    if (!canRun()) return;
    if (!animated()) {
      // Reduced motion changes whole words, without typing, fading, or movement.
      index = (index + 1) % roles.length;
      settle();
      schedule();
      return;
    }
    if (phase === "hold") phase = "delete";
    if (phase === "delete") {
      length--;
      title.textContent = roles[index].slice(0, length);
      if (length === 0) {
        index = (index + 1) % roles.length;
        phase = "type";
      }
      schedule(38);
    } else {
      length++;
      title.textContent = roles[index].slice(0, length);
      if (length === roles[index].length) {
        phase = "hold";
        schedule();
      } else schedule(72);
    }
  }
  function sync() {
    clearTimer();
    settle();
    schedule();
  }
  control.hidden = false;
  control.addEventListener("click", () => {
    paused = !paused;
    control.textContent = paused ? "Play" : "Pause";
    control.setAttribute("aria-label", paused ? "Play rotating titles" : "Pause rotating titles");
    sync();
  });

  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }, { threshold: .1 }) : null;
  if (observer) observer.observe(title);
  else { visible = true; schedule(); }
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("portfolio:motion", sync);
  window.addEventListener("pagehide", event => {
    suspended = true;
    clearTimer();
    settle();
    if (!event.persisted) observer?.disconnect();
  });
  window.addEventListener("pageshow", () => { suspended = false; sync(); });
})();
