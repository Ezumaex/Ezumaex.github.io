const projectGrid = document.querySelector("#project-grid");
const menuButton = document.querySelector("#menu-button");
const siteNav = document.querySelector("#site-nav");
const skillControls = document.querySelector("#skill-evidence-controls");
const skillPanel = document.querySelector("#skill-evidence-panel");
const contributionSection = document.querySelector("#collaboration");
const contributionGrid = document.querySelector("#contribution-grid");

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
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function projectCard(project, index) {
  const article = element("article", `project-card${index === 0 ? " project-card-featured" : ""}`);
  const header = element("div", "project-card-header");
  header.append(
    element("p", "project-number", `${String(index + 1).padStart(2, "0")} / ${project.status}`),
    element("span", "project-context", project.context)
  );

  if (project.image) {
    const media = element("div", "project-media");
    const image = element("img", "");
    image.src = project.image;
    image.alt = project.imageAlt || `${project.name} project preview`;
    image.loading = "lazy";
    image.width = 960;
    image.height = 540;
    media.append(image);
    article.append(media);
  }

  const title = element("h3", "", project.name);
  const description = element("p", "project-description", project.description);
  const tags = element("ul", "tag-list");
  tags.setAttribute("aria-label", `${project.name} technologies`);
  project.technologies.forEach((technology) => tags.append(element("li", "", technology)));

  const links = element("div", "project-links");
  const repoLink = element("a", "text-link", "Repository ↗");
  repoLink.href = project.repository;
  repoLink.target = "_blank";
  repoLink.rel = "noreferrer";
  links.append(repoLink);
  if (project.liveDemo) {
    const demoLink = element("a", "text-link muted-link", "Live site ↗");
    demoLink.href = project.liveDemo;
    demoLink.target = "_blank";
    demoLink.rel = "noreferrer";
    links.append(demoLink);
  }

  article.append(header, title, description, tags, links);
  return article;
}

async function loadProjects() {
  if (!projectGrid) return;
  try {
    const response = await fetch("data/projects.json");
    if (!response.ok) throw new Error("Project data could not be loaded.");
    const projects = await response.json();
    projectGrid.replaceChildren(...projects.filter((project) => project.featured).map(projectCard));
  } catch (error) {
    const message = element("p", "data-error", "Project details are temporarily unavailable. Visit GitHub to see the repositories.");
    projectGrid.replaceChildren(message);
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
    const detail = element("span", "", item.detail);
    listItem.append(label, detail);
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
    evidenceGroup("Collaborative / professional experience", skill.experience || []),
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
    const response = await fetch("data/skills.json");
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
    element("p", "project-number", `${String(index + 1).padStart(2, "0")} / ${contribution.projectType}`),
    element("span", "project-context", contribution.period)
  );
  const title = element("h3", "", contribution.name);
  const organization = element("p", "organization", contribution.organization);
  const role = element("p", "contribution-role", `My role · ${contribution.role}`);
  const description = element("p", "project-description", contribution.description);
  const list = element("ul", "contribution-list");
  contribution.contributions.forEach((item) => list.append(element("li", "", item)));
  const tags = element("ul", "tag-list");
  tags.setAttribute("aria-label", `${contribution.name} technologies`);
  contribution.technologies.forEach((technology) => tags.append(element("li", "", technology)));
  article.append(meta, title, organization, role, description, list, tags);
  const links = element("div", "project-links");
  [
    [contribution.repository, "View repository ↗"],
    [contribution.liveDemo, "Live demo ↗"],
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
    const response = await fetch("data/contributions.json");
    if (!response.ok) throw new Error("Contribution data could not be loaded.");
    const contributions = await response.json();
    if (!contributions.length) return;
    contributionGrid.replaceChildren(...contributions.map(contributionCard));
    contributionSection.hidden = false;
  } catch (error) {
    contributionSection.hidden = true;
  }
}

loadProjects();
loadSkillEvidence();
loadContributions();
