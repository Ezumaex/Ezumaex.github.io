/* The gallery works with ordinary HTML controls, whether or not Three.js loads. */
(() => {
  const gallery = document.querySelector("#project-showcase");
  if (!gallery) return;
  const stage = document.querySelector("#project-scene");
  const choices = document.querySelector("#showcase-projects");
  const filter = document.querySelector("#showcase-skill");
  const previous = document.querySelector("#showcase-prev");
  const next = document.querySelector("#showcase-next");
  const image = document.querySelector("#showcase-fallback");
  const caption = gallery.querySelector(".showcase-caption");
  const empty = document.querySelector("#showcase-empty");
  let projects = [];
  let skills = [];
  let matches = [];
  let active = 0;
  let filterName = "";
  const normalize = url => (url || "").replace(/\/$/, "").toLowerCase();
  const publish = () => document.dispatchEvent(new CustomEvent("portfolio:showcase", { detail: window.portfolioShowcase }));
  function render() {
    const skill = skills.find(item => item.name === filterName);
    const evidence = new Set([...(skill?.personal || []), ...(skill?.experience || [])].map(item => normalize(item.url)));
    matches = projects.map((project, index) => ({ project, index })).filter(({ project }) => !skill || evidence.has(normalize(project.repository)));
    if (!matches.some(item => item.index === active)) active = matches[0]?.index ?? -1;
    const project = projects[active];
    const isEmpty = !project || !matches.length;
    gallery.hidden = !projects.length;
    gallery.querySelector(".showcase-layout").hidden = isEmpty;
    empty.hidden = !isEmpty;
    if (isEmpty) empty.textContent = filterName + ": no matching featured project yet. See the Skills section for verified learning, professional, or collaborative evidence.";
    choices.replaceChildren(...matches.map(({ project: item, index }) => {
      const button = document.createElement("button");
      button.type = "button";
      const number = document.createElement("span"); number.className = "showcase-choice-number"; number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("strong"); title.textContent = item.name;
      const subtitle = document.createElement("span"); subtitle.className = "showcase-choice-meta"; subtitle.textContent = item.technologies.slice(0, 3).join(" / ");
      const arrow = document.createElement("span"); arrow.className = "showcase-choice-arrow"; arrow.textContent = "↗"; arrow.setAttribute("aria-hidden", "true");
      button.append(number, title, subtitle, arrow);
      button.dataset.project = String(index);
      button.setAttribute("aria-pressed", String(index === active));
      button.addEventListener("click", () => select(index, true));
      return button;
    }));
    previous.disabled = next.disabled = matches.length < 2;
    filter.value = filterName;
    if (project && !isEmpty) {
      const source = project.previewImage || project.image;
      image.hidden = !source;
      if (source) { image.src = source; image.alt = project.imageAlt || project.name; }
      gallery.dataset.preview = String(active % 2);
      document.querySelector("#showcase-title").textContent = project.name;
      document.querySelector("#showcase-technologies").replaceChildren(...project.technologies.map(technology => {
        const tag = document.createElement("li"); tag.textContent = technology; return tag;
      }));
      document.querySelector("#showcase-counter").textContent = String(matches.findIndex(item => item.index === active) + 1).padStart(2, "0") + " / " + String(matches.length).padStart(2, "0") + " · " + project.context;
      document.querySelector("#showcase-architecture").textContent = project.architecture || project.subtitle || project.description;
      document.querySelector("#showcase-details").href = "#project-" + (project.slug || active);
    }
    document.querySelectorAll(".project-card").forEach(card => {
      const index = Number(card.dataset.projectIndex);
      card.classList.toggle("is-related", !!filterName && matches.some(item => item.index === index));
      card.classList.toggle("is-previewed", !isEmpty && index === active);
    });
    window.portfolioShowcase = { projects, active, indices: matches.map(item => item.index), filter: filterName };
    publish();
  }
  function select(index, focus = false) {
    active = index;
    render();
    if (focus) choices.querySelector('[data-project="' + index + '"]')?.focus();
  }
  function step(direction, focus = false) {
    if (!matches.length) return;
    const position = matches.findIndex(item => item.index === active);
    select(matches[(position + direction + matches.length) % matches.length].index, focus);
  }
  previous.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  choices.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") select(matches[0].index, true);
    else if (event.key === "End") select(matches[matches.length - 1].index, true);
    else step(event.key === "ArrowRight" ? 1 : -1, true);
  });
  filter.addEventListener("change", () => { filterName = filter.value; render(); });
  document.addEventListener("portfolio:project-filter", event => { filterName = event.detail.name; render(); });
  document.addEventListener("portfolio:project-request", event => { filterName = ""; select(event.detail.index); });
  document.querySelector("#showcase-details").addEventListener("click", () => {
    const project = projects[active];
    if (!project) return;
    const details = document.querySelector("#project-" + project.slug + " details");
    if (details) { details.open = true; details.querySelector("summary").focus({ preventScroll: true }); }
  });
  document.addEventListener("portfolio:projects", event => { projects = event.detail; render(); });
  document.addEventListener("portfolio:skills", event => {
    skills = event.detail;
    skills.forEach(skill => {
      const option = document.createElement("option");
      option.value = option.textContent = skill.name;
      filter.append(option);
    });
  });
  document.addEventListener("portfolio:skill", event => { filterName = event.detail.name; render(); });
  // A horizontal swipe is optional; vertical touch scrolling and pinch zoom remain native.
  let start = null;
  stage.addEventListener("pointerdown", event => { if (event.isPrimary) start = { x: event.clientX, y: event.clientY }; });
  stage.addEventListener("pointerup", event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    start = null;
  });
  stage.addEventListener("pointercancel", () => { start = null; });
  stage.addEventListener("pointerleave", () => { start = null; });
})();
