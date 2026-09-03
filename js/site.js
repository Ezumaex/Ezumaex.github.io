const projectGrid = document.querySelector("#project-grid");
const menuButton = document.querySelector("#menu-button");
const siteNav = document.querySelector("#site-nav");
const skillControls = document.querySelector("#skill-evidence-controls");
const skillPanel = document.querySelector("#skill-evidence-panel");
const contributionSection = document.querySelector("#collaboration");
const contributionGrid = document.querySelector("#contribution-grid");
const scrollProgress = document.querySelector("#scroll-progress");
const greeting = document.querySelector("#hero-greeting");
const manilaTime = document.querySelector("#manila-time");

if (menuButton && siteNav) {
  document.documentElement.classList.add("navigation-ready");
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    siteNav.dataset.open = String(!expanded);
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menuButton.setAttribute("aria-expanded", "false");
      siteNav.dataset.open = "false";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteNav.dataset.open === "true") {
      menuButton.setAttribute("aria-expanded", "false");
      siteNav.dataset.open = "false";
      menuButton.focus();
    }
  });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function professionalTimeParts() {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    hourCycle: "h23"
  }).format(new Date()));

  let salutation = "Good evening";
  if (hour >= 5 && hour < 12) salutation = "Good morning";
  else if (hour >= 12 && hour < 18) salutation = "Good afternoon";
  else if (hour >= 0 && hour < 5) salutation = "Still up late?";

  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());

  return { salutation, clock };
}

function updateManilaTime() {
  const { salutation, clock } = professionalTimeParts();
  if (greeting) greeting.textContent = `${salutation} — welcome to my portfolio`;
  if (manilaTime) manilaTime.textContent = `Manila · ${clock}`;
}

if (greeting || manilaTime) {
  updateManilaTime();
  window.setInterval(() => { if (!document.hidden) updateManilaTime(); }, 60000);
}

let progressFrame = 0;
function updateScrollProgress() {
  progressFrame = 0;
  if (!scrollProgress) return;
  const available = document.documentElement.scrollHeight - window.innerHeight;
  const progress = available > 0 ? Math.max(0, Math.min(1, window.scrollY / available)) : 0;
  scrollProgress.style.transform = `scaleX(${progress})`;
}
function scheduleProgress() {
  if (!progressFrame) progressFrame = requestAnimationFrame(updateScrollProgress);
}
scheduleProgress();
window.addEventListener("scroll", scheduleProgress, { passive: true });
window.addEventListener("resize", scheduleProgress);
document.addEventListener("portfolio:content", scheduleProgress);

if (siteNav && "IntersectionObserver" in window) {
  const navLinks = [...siteNav.querySelectorAll('a[href^="#"]')];
  const visible = new Set();
  const aliases = { about: "top", skills: "top", education: "experience" };
  const activate = id => navLinks.forEach(link => {
    if (link.hash === "#" + (aliases[id] || id)) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    const candidates = [...visible].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    if (candidates[0]) activate(candidates[0].id);
  }, { threshold: 0, rootMargin: "-12% 0px -55%" });
  document.querySelectorAll("main > section[id], .portfolio-canvas > section[id]").forEach(section => navObserver.observe(section));
  activate(location.hash.slice(1) || "top");
  window.addEventListener("pagehide", event => { if (!event.persisted) navObserver.disconnect(); });
}

function projectCard(project, index) {
  const article = element("article", "project-card");
  article.id = `project-${project.slug || index}`;
  article.dataset.repository = project.repository;
  article.dataset.projectIndex = String(index);
  const shell = element("div", "project-shell");
  const topline = element("div", "project-topline");
  topline.append(
    element("p", "project-label", `${String(index + 1).padStart(2, "0")} · ${project.status}`),
    element("span", "project-context", project.context)
  );

  const main = element("div", "project-main");
  const copy = element("div", "project-copy");
  copy.append(
    element("h3", "", project.name),
    element("p", "project-subtitle", project.subtitle || ""),
    element("p", "project-description", project.description)
  );

  const links = element("div", "project-links");
  const repository = element("a", "text-link", "Repository ↗");
  repository.href = project.repository;
  repository.target = "_blank";
  repository.rel = "noreferrer";
  links.append(repository);
  if (project.liveDemo) {
    const live = element("a", "text-link", "Live site ↗");
    live.href = project.liveDemo;
    live.target = "_blank";
    live.rel = "noreferrer";
    links.append(live);
  }
  const previewButton = element("button", "text-link project-preview-button", "Explore preview ↑");
  previewButton.type = "button";
  previewButton.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("portfolio:project-request", { detail: { index } }));
    document.querySelector("#project-showcase")?.scrollIntoView({ behavior: window.portfolioMotion?.enabled ? "smooth" : "instant", block: "start" });
    document.querySelector("#showcase-projects [aria-pressed='true']")?.focus({ preventScroll: true });
  });
  links.append(previewButton);
  copy.append(links);
  main.append(copy);

  if (project.image) {
    const media = element("div", "project-media");
    const image = element("img", "");
    image.src = project.image;
    image.alt = project.imageAlt || `${project.name} project preview`;
    image.loading = "lazy";
    image.width = 960;
    image.height = 600;
    media.append(image);
    main.append(media);
  }

  shell.append(topline, main);
  article.append(shell);

  const details = element("details", "project-disclosure");
  const summary = element("summary", "", "Show implementation details");
  const detailsBody = element("div", "project-details");

  if (project.highlights?.length) {
    const highlights = element("div", "");
    highlights.append(element("p", "architecture-label", "Implementation"));
    const list = element("ul", "implementation-list");
    project.highlights.forEach((item) => list.append(element("li", "", item)));
    highlights.append(list);
    detailsBody.append(highlights);
  }

  if (project.architecture) {
    const architecture = element("div", "");
    architecture.append(
      element("p", "architecture-label", "Architecture"),
      architectureSteps(project.architecture)
    );
    detailsBody.append(architecture);
  }

  const technologies = element("div", "");
  technologies.append(element("p", "technology-label", "Technologies"));
  const tags = element("ul", "tag-list");
  tags.setAttribute("aria-label", `${project.name} technologies`);
  project.technologies.forEach((technology) => tags.append(element("li", "", technology)));
  technologies.append(tags);
  detailsBody.append(technologies);

  if (project.note) detailsBody.append(element("p", "project-note", project.note));
  details.append(summary, detailsBody);
  article.append(details);
  return article;
}

function architectureSteps(text) {
  const list = element("ol", "architecture-flow");
  list.setAttribute("aria-label", "System architecture");
  text.split(/\s*→\s*/).forEach(step => list.append(element("li", "", step)));
  return list;
}

async function loadProjects() {
  if (!projectGrid) return;
  try {
    const response = await fetch("data/projects.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Project data could not be loaded.");
    const projects = await response.json();
    projectGrid.replaceChildren(...projects.filter((project) => project.featured).map(projectCard));
    document.dispatchEvent(new CustomEvent("portfolio:projects", { detail: projects.filter(project => project.featured) }));
    document.dispatchEvent(new CustomEvent("portfolio:content"));
  } catch (error) {
    projectGrid.prepend(element("p", "data-error", "Showing the saved project list; interactive details are temporarily unavailable."));
  }
}

function evidenceGroup(title, items) {
  if (!items.length) return null;
  const group = element("section", "evidence-group");
  group.append(element("h4", "", title));
  const list = element("ul", "evidence-list");
  items.forEach((item) => {
    const listItem = element("li", "");
    const label = item.url ? element("a", "text-link", item.title) : element("strong", "", item.title);
    if (item.url) {
      label.href = item.url;
      if (item.url.startsWith("http")) {
        label.target = "_blank";
        label.rel = "noreferrer";
      }
    }
    listItem.append(label, element("span", "", item.detail));
    list.append(listItem);
  });
  group.append(list);
  return group;
}

function renderSkillEvidence(skill, userInitiated = false) {
  const heading = element("h3", "", skill.name);
  const groups = element("div", "evidence-groups");
  [
    evidenceGroup("Personal work", skill.personal || []),
    evidenceGroup("Professional / team work", skill.experience || []),
    evidenceGroup("Learning evidence", skill.learning || [])
  ].filter(Boolean).forEach((group) => groups.append(group));
  const evidenceLink = element("a", "text-link skill-work-link", (skill.personal || []).length ? "Explore related project previews ↓" : "Browse all featured projects ↓");
  evidenceLink.href = "#work";
  evidenceLink.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("portfolio:project-filter", { detail: { name: (skill.personal || []).length ? skill.name : "" } }));
  });
  skillPanel.replaceChildren(heading, groups, evidenceLink);
  if (userInitiated) document.dispatchEvent(new CustomEvent("portfolio:skill", { detail: skill }));
  skillControls.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.skill === skill.name));
  });
}

async function loadSkillEvidence() {
  if (!skillControls || !skillPanel) return;
  try {
    const response = await fetch("data/skills.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Skill evidence could not be loaded.");
    const skills = await response.json();
    const buttons = skills.map((skill) => {
      const button = element("button", "skill-evidence-button", skill.name);
      button.type = "button";
      button.dataset.skill = skill.name;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => renderSkillEvidence(skill, true));
      return button;
    });
    skillControls.replaceChildren(...buttons);
    document.addEventListener("portfolio:skill-request", event => {
      const skill = skills.find(item => item.name === event.detail.name);
      if (skill) renderSkillEvidence(skill, true);
    });
    document.dispatchEvent(new CustomEvent("portfolio:skills", { detail: skills }));
    document.dispatchEvent(new CustomEvent("portfolio:content"));
    if (skills.length) renderSkillEvidence(skills[0]);
  } catch (error) {
    skillControls.replaceChildren(element("p", "data-error", "Skill evidence is temporarily unavailable."));
    skillPanel.replaceChildren();
  }
}

function contributionCard(contribution, index) {
  const article = element("article", "contribution-card");
  const meta = element("div", "contribution-meta");
  meta.append(
    element("p", "project-label", `${String(index + 1).padStart(2, "0")} · ${contribution.projectType}`),
    element("span", "project-context", contribution.period)
  );
  article.append(
    meta,
    element("h3", "", contribution.name),
    element("p", "organization", contribution.organization),
    element("p", "contribution-role", `My role · ${contribution.role}`),
    element("p", "project-description", contribution.description)
  );
  const list = element("div", "contribution-progress");
  list.setAttribute("aria-label", "Verified contribution areas");
  list.append(element("p", "contribution-progress-label", "Explore my contribution · select an area"));
  contribution.contributions.forEach((item, area) => {
    const step = element("details", "contribution-step");
    const summary = element("summary", "");
    summary.append(element("span", "contribution-number", String(area + 1).padStart(2, "0")), element("span", "", contribution.contributionAreas?.[area] || `Contribution ${area + 1}`));
    step.append(summary, element("div", "contribution-detail", item));
    step.open = area === 0;
    list.append(step);
  });
  const tags = element("ul", "tag-list");
  tags.setAttribute("aria-label", `${contribution.name} technologies`);
  contribution.technologies.forEach((technology) => tags.append(element("li", "", technology)));
  article.append(list, tags);

  const links = element("div", "project-links");
  [
    [contribution.liveDemo, "Live demo ↗"],
    [contribution.repository, "Repository ↗"],
    [contribution.evidenceUrl, "Contribution evidence ↗"]
  ].forEach(([url, label]) => {
    if (!url) return;
    const link = element("a", "text-link", label);
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    links.append(link);
  });
  if (links.children.length) article.append(links);
  return article;
}

async function loadContributions() {
  if (!contributionSection || !contributionGrid) return;
  try {
    const response = await fetch("data/contributions.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Contribution data could not be loaded.");
    const contributions = (await response.json()).filter((item) => item.repository || item.projectType.toLowerCase().includes("team project"));
    if (!contributions.length) return;
    contributionGrid.replaceChildren(...contributions.map(contributionCard));
    contributionSection.hidden = false;
    document.dispatchEvent(new CustomEvent("portfolio:content"));
  } catch (error) {
    contributionSection.hidden = false;
  }
}


loadProjects();
loadSkillEvidence();
loadContributions();
