/* One JSON-backed credential explorer; original files remain ordinary links. */
(() => {
  const explorer = document.querySelector("#certificate-explorer");
  if (!explorer) return;
  const list = document.querySelector("#home-certificate-grid");
  const input = document.querySelector("#home-certificate-search");
  const count = document.querySelector("#home-certificate-count");
  const inspector = document.querySelector("#certificate-inspector");
  const sheet = document.querySelector("#certificate-sheet");
  const sheetLink = document.querySelector("#certificate-sheet-link");
  const verify = document.querySelector("#certificate-inspector-verify");
  let certificates = [], filtered = [], selectedId = "", imageVersion = 0;
  const node = (tag, className, text) => {
    const item = document.createElement(tag);
    item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  const tokens = value => value.toLowerCase().match(/[a-z0-9#+.]+/g) || [];

  function select(certificate, focus = false) {
    if (!certificate) return;
    const changed = selectedId !== certificate.id;
    selectedId = certificate.id;
    inspector.hidden = false;
    inspector.dataset.certificate = certificate.id;
    list.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.certificate === selectedId)));
    document.querySelector("#certificate-inspector-meta").textContent = `${certificate.issuer} · ${certificate.displayDate}`;
    document.querySelector("#certificate-inspector-title").textContent = certificate.title;
    document.querySelector("#certificate-inspector-description").textContent = certificate.description;
    document.querySelector("#certificate-inspector-credential").textContent = certificate.credentialId ? `Credential ID · ${certificate.credentialId}` : "";
    document.querySelector("#certificate-inspector-skills").replaceChildren(...certificate.skills.map(skill => node("li", "", skill)));
    const original = document.querySelector("#certificate-inspector-original");
    original.href = sheetLink.href = certificate.pdf || certificate.image;
    original.textContent = certificate.pdf ? "Open original PDF ↗" : "Open original image ↗";
    sheetLink.setAttribute("aria-label", `Open original ${certificate.title} certificate in a new tab`);
    verify.hidden = !certificate.credentialUrl;
    if (certificate.credentialUrl) verify.href = certificate.credentialUrl;
    else verify.removeAttribute("href");
    if (changed) {
      const version = ++imageVersion;
      sheetLink.setAttribute("aria-busy", "true");
      sheet.alt = `${certificate.title} certificate issued by ${certificate.issuer}`;
      sheet.src = certificate.image;
      sheet.onload = () => {
        if (version !== imageVersion) return;
        sheetLink.removeAttribute("aria-busy");
        sheetLink.classList.remove("image-unavailable");
        window.portfolioAnimate?.enter(sheet, { distance: 14, duration: 650, scale: .975 });
      };
      sheet.onerror = () => {
        if (version !== imageVersion) return;
        sheetLink.removeAttribute("aria-busy");
        sheetLink.classList.add("image-unavailable");
      };
      if (sheet.complete && sheet.naturalWidth) sheet.onload();
      document.dispatchEvent(new CustomEvent("portfolio:certificate", { detail: { id: certificate.id } }));
    }
    if (focus) {
      const selected = [...list.querySelectorAll("button")].find(button => button.dataset.certificate === selectedId);
      selected?.focus({ preventScroll: true });
      selected?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
  }
  function choice(certificate, index) {
    const button = node("button", "certificate-choice");
    button.type = "button";
    button.dataset.certificate = certificate.id;
    button.setAttribute("aria-pressed", "false");
    const ordinal = node("span", "certificate-choice-number", String(index + 1).padStart(2, "0"));
    ordinal.setAttribute("aria-hidden", "true");
    const copy = node("span", "certificate-choice-copy");
    copy.append(node("span", "certificate-choice-meta", `${certificate.issuer} · ${certificate.displayDate}`), node("strong", "", certificate.title));
    const arrow = node("span", "certificate-choice-arrow", "↗"); arrow.setAttribute("aria-hidden", "true");
    button.append(ordinal, copy, arrow);
    button.addEventListener("click", () => select(certificate));
    return button;
  }
  function filter() {
    const query = tokens(input.value.trim());
    filtered = certificates.filter(certificate => {
      const words = tokens([certificate.title, certificate.issuer, certificate.category, ...certificate.skills].join(" "));
      return query.every(term => words.includes(term));
    });
    list.replaceChildren(...filtered.map(choice));
    count.textContent = `${filtered.length} certificate${filtered.length === 1 ? "" : "s"}`;
    inspector.hidden = !filtered.length;
    explorer.classList.toggle("is-empty", !filtered.length);
    if (filtered.length) select(filtered.find(item => item.id === selectedId) || filtered[0]);
    else list.append(node("p", "empty-state", "No certificates match that search. Try an issuer or a skill such as React or Java."));
    document.dispatchEvent(new CustomEvent("portfolio:content"));
  }
  list.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) || !filtered.length) return;
    event.preventDefault();
    const current = filtered.findIndex(item => item.id === selectedId);
    const direction = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
    const index = event.key === "Home" ? 0 : event.key === "End" ? filtered.length - 1 : (current + direction + filtered.length) % filtered.length;
    select(filtered[index], true);
  });
  async function load() {
    try {
      const response = await fetch("data/certificates.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Certificate data unavailable");
      certificates = (await response.json()).sort((a, b) => b.issued.localeCompare(a.issued));
      document.querySelector("#certificate-total").textContent = String(certificates.length);
      explorer.classList.add("is-ready");
      input.addEventListener("input", filter);
      filter();
    } catch {
      count.textContent = "Showing saved certificate links";
      list.prepend(node("p", "data-error", "The interactive explorer is temporarily unavailable. All original certificates remain linked below."));
    }
  }
  load();
})();
