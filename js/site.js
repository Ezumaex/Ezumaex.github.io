document.documentElement.classList.add("motion-ready");

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
const rotatingRole = document.querySelector("#rotating-role");
const heroVisual = document.querySelector(".hero-visual");
const homeCertificateGrid = document.querySelector("#home-certificate-grid");
const homeCertificateSearch = document.querySelector("#home-certificate-search");
const homeCertificateCount = document.querySelector("#home-certificate-count");
const certificateTotal = document.querySelector("#certificate-total");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (menuButton && siteNav) {
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
    minute: "2-digit",
    second: "2-digit"
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
  window.setInterval(updateManilaTime, 1000);
}

if (rotatingRole && !reducedMotion.matches) {
  const roles = ["Computer Engineering Student", "Web Developer", "Full-Stack Builder", "IoT Prototyper"];
  let roleIndex = 0;
  let characterIndex = roles[0].length;
  let deleting = true;

  const typeRole = () => {
    const current = roles[roleIndex];
    rotatingRole.textContent = current.slice(0, characterIndex);

    if (deleting) {
      characterIndex -= 1;
      if (characterIndex <= 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        window.setTimeout(typeRole, 280);
        return;
      }
      window.setTimeout(typeRole, 38);
      return;
    }

    characterIndex += 1;
    if (characterIndex > roles[roleIndex].length) {
      deleting = true;
      characterIndex = roles[roleIndex].length;
      window.setTimeout(typeRole, 1800);
      return;
    }
    window.setTimeout(typeRole, 72);
  };

  window.setTimeout(typeRole, 2100);
}

function updateScrollProgress() {
  if (!scrollProgress) return;
  const available = document.documentElement.scrollHeight - window.innerHeight;
  const percent = available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0;
  scrollProgress.style.width = `${percent}%`;
}

updateScrollProgress();
window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress);

const revealItems = document.querySelectorAll(".reveal");
if (reducedMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7%" });
  revealItems.forEach((item) => revealObserver.observe(item));
}

if (siteNav && "IntersectionObserver" in window) {
  const navLinks = [...siteNav.querySelectorAll('a[href^="#"]')];
  const sectionLinks = new Map(navLinks.map((link) => [link.getAttribute("href").slice(1), link]));
  const navObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => link.removeAttribute("aria-current"));
    const active = sectionLinks.get(visible.target.id);
    if (active) active.setAttribute("aria-current", "location");
  }, { threshold: [0.15, 0.35, 0.65], rootMargin: "-20% 0px -60%" });

  sectionLinks.forEach((link, id) => {
    const section = document.getElementById(id);
    if (section) navObserver.observe(section);
  });
}

if (heroVisual && !reducedMotion.matches) {
  const hero = heroVisual.closest(".hero");
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 10;
    heroVisual.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
  hero.addEventListener("pointerleave", () => {
    heroVisual.style.transform = "translate3d(0, 0, 0)";
  });
}

function projectCard(project, index) {
  const article = element("article", "project-card");
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
      element("p", "architecture-copy", project.architecture)
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

async function loadProjects() {
  if (!projectGrid) return;
  try {
    const response = await fetch("data/projects.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Project data could not be loaded.");
    const projects = await response.json();
    projectGrid.replaceChildren(...projects.filter((project) => project.featured).map(projectCard));
  } catch (error) {
    projectGrid.replaceChildren(element("p", "data-error", "Project details are temporarily unavailable. Visit GitHub to see the repositories."));
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

function renderSkillEvidence(skill) {
  const heading = element("h3", "", skill.name);
  const groups = element("div", "evidence-groups");
  [
    evidenceGroup("Personal work", skill.personal || []),
    evidenceGroup("Professional / team work", skill.experience || []),
    evidenceGroup("Learning evidence", skill.learning || [])
  ].filter(Boolean).forEach((group) => groups.append(group));
  skillPanel.replaceChildren(heading, groups);
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
      button.addEventListener("click", () => renderSkillEvidence(skill));
      return button;
    });
    skillControls.replaceChildren(...buttons);
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
  const list = element("ul", "contribution-list");
  contribution.contributions.forEach((item) => list.append(element("li", "", item)));
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
  } catch (error) {
    contributionSection.hidden = true;
  }
}

let homeCertificates = [];

function issuerMonogram(issuer) {
  const words = issuer.replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function homeCertificateCard(certificate) {
  const details = element("details", "home-certificate-card");
  const summary = element("summary", "home-certificate-summary");
  summary.append(
    element("span", "certificate-monogram", issuerMonogram(certificate.issuer)),
    element("p", "certificate-kicker", `${certificate.issuer} · ${certificate.displayDate}`),
    element("h3", "", certificate.title),
    element("span", "certificate-expand-label", "View details")
  );

  const body = element("div", "home-certificate-details");
  body.append(element("p", "", certificate.description));
  const skills = element("ul", "certificate-skills");
  skills.setAttribute("aria-label", `${certificate.title} skills`);
  certificate.skills.forEach((skill) => skills.append(element("li", "", skill)));
  body.append(skills);

  const actions = element("div", "certificate-actions");
  if (certificate.credentialUrl) {
    const verify = element("a", "text-link", "Verify credential ↗");
    verify.href = certificate.credentialUrl;
    verify.target = "_blank";
    verify.rel = "noreferrer";
    actions.append(verify);
  }
  const original = element("a", "text-link", "View certificate ↗");
  original.href = certificate.pdf || certificate.image;
  original.target = "_blank";
  original.rel = "noreferrer";
  actions.append(original);
  body.append(actions);
  details.append(summary, body);

  details.addEventListener("toggle", () => {
    if (!details.open) return;
    homeCertificateGrid.querySelectorAll("details[open]").forEach((item) => {
      if (item !== details) item.open = false;
    });
  });
  return details;
}

function filterHomeCertificates() {
  if (!homeCertificateGrid) return;
  const query = homeCertificateSearch?.value.trim().toLowerCase() || "";
  const filtered = homeCertificates.filter((certificate) => {
    const haystack = [certificate.title, certificate.issuer, certificate.category, ...certificate.skills].join(" ").toLowerCase();
    return query.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
  });
  homeCertificateGrid.replaceChildren(...filtered.map(homeCertificateCard));
  if (homeCertificateCount) homeCertificateCount.textContent = `${filtered.length} certificate${filtered.length === 1 ? "" : "s"}`;
  if (!filtered.length) homeCertificateGrid.append(element("p", "empty-state", "No certificates match that search."));
}

async function loadHomeCertificates() {
  if (!homeCertificateGrid) return;
  try {
    const response = await fetch("data/certificates.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Certificate data could not be loaded.");
    homeCertificates = (await response.json()).sort((a, b) => b.issued.localeCompare(a.issued));
    if (certificateTotal) certificateTotal.textContent = String(homeCertificates.length);
    filterHomeCertificates();
  } catch (error) {
    if (homeCertificateCount) homeCertificateCount.textContent = "Unable to load certificates";
    homeCertificateGrid.replaceChildren(element("p", "data-error", "Certificate details are temporarily unavailable."));
  }
}

homeCertificateSearch?.addEventListener("input", filterHomeCertificates);

loadProjects();
loadSkillEvidence();
loadContributions();
loadHomeCertificates();
