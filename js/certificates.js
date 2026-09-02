const grid = document.querySelector("#certificate-grid");
const searchInput = document.querySelector("#certificate-search");
const categorySelect = document.querySelector("#certificate-category");
const count = document.querySelector("#certificate-count");
const dialog = document.querySelector("#certificate-dialog");
const dialogImage = document.querySelector("#dialog-image");
const dialogTitle = document.querySelector("#dialog-title");
const dialogMeta = document.querySelector("#dialog-meta");
const dialogDescription = document.querySelector("#dialog-description");
const dialogCredential = document.querySelector("#dialog-credential");
const dialogOriginal = document.querySelector("#dialog-original");
const dialogVerify = document.querySelector("#dialog-verify");
const dialogClose = document.querySelector("#dialog-close");

let certificates = [];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function openCertificate(certificate) {
  dialogImage.src = certificate.image;
  dialogImage.alt = `${certificate.title} certificate issued by ${certificate.issuer}`;
  dialogTitle.textContent = certificate.title;
  dialogMeta.textContent = `${certificate.issuer} · ${certificate.displayDate}`;
  dialogDescription.textContent = certificate.description;
  dialogCredential.textContent = certificate.credentialId ? `Credential ID: ${certificate.credentialId}` : "Credential ID not provided";
  dialogOriginal.href = certificate.pdf || certificate.image;
  dialogOriginal.textContent = certificate.pdf ? "Open PDF" : "Open original";
  if (certificate.credentialUrl) {
    dialogVerify.href = certificate.credentialUrl;
    dialogVerify.hidden = false;
  } else {
    dialogVerify.hidden = true;
    dialogVerify.removeAttribute("href");
  }
  dialog.showModal();
}

function certificateCard(certificate) {
  const article = element("article", "certificate-card");
  const preview = element("button", "certificate-preview");
  preview.type = "button";
  preview.setAttribute("aria-label", `Preview ${certificate.title}`);
  const image = element("img", "");
  image.src = certificate.image;
  image.alt = "";
  image.loading = "lazy";
  image.width = 640;
  image.height = 430;
  preview.append(image);
  preview.addEventListener("click", () => openCertificate(certificate));

  const body = element("div", "certificate-card-body");
  const category = element("p", "certificate-category", certificate.category);
  const title = element("h2", "", certificate.title);
  const issuer = element("p", "certificate-issuer", `${certificate.issuer} · ${certificate.displayDate}`);
  const actions = element("div", "certificate-actions");
  const view = element("button", "card-link", "Preview");
  view.type = "button";
  view.addEventListener("click", () => openCertificate(certificate));
  actions.append(view);
  if (certificate.credentialUrl) {
    const verify = element("a", "card-link muted-link", "Verify ↗");
    verify.href = certificate.credentialUrl;
    verify.target = "_blank";
    verify.rel = "noreferrer";
    actions.append(verify);
  }
  body.append(category, title, issuer, actions);
  article.append(preview, body);
  return article;
}

function applyFilters() {
  const tokenize = (value) => value.toLowerCase().match(/[a-z0-9#+.]+/g) || [];
  const queryTokens = tokenize(searchInput.value.trim());
  const category = categorySelect.value;
  const filtered = certificates.filter((certificate) => {
    const haystackTokens = tokenize([certificate.title, certificate.issuer, certificate.category, ...certificate.skills].join(" "));
    const matchesQuery = queryTokens.every((token) => haystackTokens.includes(token));
    return matchesQuery && (!category || certificate.category === category);
  });
  grid.replaceChildren(...filtered.map(certificateCard));
  count.textContent = `${filtered.length} certificate${filtered.length === 1 ? "" : "s"}`;
  if (!filtered.length) {
    grid.append(element("p", "empty-state", "No certificates match those filters."));
  }
}

async function loadCertificates() {
  try {
    const response = await fetch("data/certificates.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Certificate data could not be loaded.");
    certificates = (await response.json()).sort((a, b) => b.issued.localeCompare(a.issued));
    const categories = [...new Set(certificates.map((certificate) => certificate.category))].sort();
    categories.forEach((category) => {
      const option = element("option", "", category);
      option.value = category;
      categorySelect.append(option);
    });
    applyFilters();
  } catch (error) {
    count.textContent = "Unable to load certificates";
    grid.replaceChildren(element("p", "data-error", "Certificate details are temporarily unavailable."));
  }
}

searchInput.addEventListener("input", applyFilters);
categorySelect.addEventListener("change", applyFilters);
dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    dialog.close();
  }
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

loadCertificates();
