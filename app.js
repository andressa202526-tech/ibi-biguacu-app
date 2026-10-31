
const cfg = window.IBI_CONFIG || {};

const configured =
  cfg.supabaseUrl?.startsWith("https://") &&
  typeof cfg.supabaseAnonKey === "string" &&
  cfg.supabaseAnonKey.length > 20 &&
  !cfg.supabaseAnonKey.includes("COLE");

const db = configured && window.supabase
  ? window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey
    )
  : null;

let user = null;
let profile = null;

const $ = s => document.querySelector(s);

const esc = s => String(s ?? "").replace(
  /[&<>"']/g,
  c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c])
);

const errorText = e =>
  e?.message || "Não foi possível concluir.";

function msg(text, error = false) {
  const el = $("#flash");
  if (!el) return;
  el.hidden = false;
  el.className = "flash" + (error ? " error" : "");
  el.textContent = text;
  el.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function navigate(name) {
  document.querySelectorAll(".page").forEach(el => {
    el.classList.toggle("active", el.id === name);
  });

  document.querySelectorAll("nav button").forEach(el => {
    el.classList.toggle(
      "selected",
      el.dataset.page === name
    );
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(b => {
  b.addEventListener("click", () => navigate(b.dataset.page));
});

function item(title, body) {
  const el = document.createElement("div");
  el.className = "panel";

  const strong = document.createElement("strong");
  strong.textContent = title;

  const p = document.createElement("p");
  p.textContent = body;

  el.append(strong, p);
  return el;
}

// LINKS

function links() {
  const out = $("#links");
  if (!out) return;

  out.replaceChildren();

  for (const [url, title] of [
    [cfg.liveUrl, "▶ Assistir culto ao vivo"],
    [cfg.instagramUrl, "Instagram da igreja"]
  ]) {
