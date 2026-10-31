
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

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

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

const errorText = e =>
  e?.message || "Não foi possível concluir.";

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

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.page);
  });
});

function item(title, body, extra = "") {
  const el = document.createElement("div");
  el.className = "panel";

  el.innerHTML = `
    <strong>${esc(title)}</strong>
    <p>${esc(body)}</p>
    ${extra}
  `;

  return el;
}

// LINKS DA IGREJA

function links() {
  const out = $("#links");
  if (!out) return;

  const linksList = [];

  for (const [url, label] of [
    [cfg.liveUrl, "▶ Assistir culto ao vivo"],
    [cfg.instagramUrl, "Instagram da igreja"]
  ]) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") continue;

      const a = document.createElement("a");
      a.href = parsed.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = label;

      const p = document.createElement("p");
      p.append(a);
      linksList.push(p);
    } catch {
      // Link ainda não configurado.
    }
  }

  out.replaceChildren(...linksList);

  if (!linksList.length) {
    out.textContent =
      "Os links da igreja serão cadastrados em breve.";
  }
}

// EVENTOS

async function events() {
  const main = $("#eventos");
  const home = $("#eventosInicio");

  if (!db) {
    if (main) main.textContent = "Eventos em breve.";
    if (home) home.textContent = "Eventos serão exibidos aqui.";
    return;
  }

  const { data, error } = await db
    .from("events")
    .select("title,description,starts_at")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(20);

  if (error) {
    msg("Erro ao carregar eventos: " + error.message, true);
    return;
  }

  for (const [out, entries] of [
    [main, data || []],
    [home, (data || []).slice(0, 3)]
  ]) {
    if (!out) continue;

    out.replaceChildren();

    entries.forEach(event => {
      const date = new Date(event.starts_at)
        .toLocaleString("pt-BR", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo"
        });

      out.append(
        item(
          event.title,
          date + "\n" + (event.description || "")
        )
      );
    });

    if (!entries.length) {
      out.textContent =
        "Nenhum evento cadastrado por enquanto.";
    }
  }
}

// ANIVERSARIANTES

async function birthdays() {
  const out = $("#birthdays");
  if (!out) return;

  out.textContent = "Carregando...";

  if (!db) {
    out.textContent =
      "Disponível após configurar o banco de dados.";
    return;
  }

  const { data, error } =
    await db.rpc("month_birthdays");

  out.replaceChildren();

  if (error) {
    out.textContent =
      "Não foi possível carregar aniversariantes.";
    return;
  }

  (data || []).forEach(person => {
    const day = String(person.birth_day).padStart(2, "0");
    const month = String(person.birth_month).padStart(2, "0");

    out.append(
      item(
        `${day}/${month} — ${person.display_name}`,
        "Que Deus abençoe sua vida! 🎉"
      )
    );
  });

  if (!out.children.length) {
    out.textContent =
      "Ainda não há aniversariantes autorizados neste mês.";
  }
}

// FORMULÁRIOS DE ACESSO

const authHTML = `
  <div class="panel">
    <h2>Entrar</h2>
    <form id="loginForm">
      <label>
        E-mail
        <input type="email" name="email"
          required autocomplete="email">
      </label>

      <label>
        Senha
        <input type="password" name="password"
          minlength="8" required
          autocomplete="current-password">
      </label>

      <button class="button">Entrar</button>
    </form>
  </div>

  <div class="panel">
    <h2>Solicitar cadastro</h2>

    <p class="muted">
      A liderança precisa aprovar o cadastro
      antes de liberar a área de membros.
    </p>

    <form id="signupForm">
      <label>
        Nome completo
        <input name="name" maxlength="80"
          required autocomplete="name">
      </label>

      <label>
        E-mail
        <input type="email" name="email"
          required autocomplete="email">
      </label>

      <label>
        Senha (mínimo 8 caracteres)
        <input type="password" name="password"
          minlength="8" required
          autocomplete="new-password">
      </label>

      <button class="button">
        Criar minha conta
      </button>
    </form>
  </div>
`;

// PERFIL DO MEMBRO

async function getProfile() {
  if (!user || !db) return null;

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    msg("Perfil indisponível: " + error.message, true);
    return null;
  }

  return data;
}

// ATUALIZAR TELA DE LOGIN

async function authUI() {
  if (!db) {
    user = null;
    profile = null;
  } else {
    const { data, error } = await db.auth.getUser();

    if (error) {
      user = null;
      profile = null;
    } else {
      user = data.user;
      profile = user ? await getProfile() : null;
    }
  }

  const authArea = $("#authArea");
  const memberArea = $("#memberArea");
  const approvedArea = $("#approvedArea");
  const adminArea = $("#adminArea");

  if (authArea) authArea.hidden = !!user;
  if (memberArea) memberArea.hidden = !user;

  if (approvedArea) {
    approvedArea.hidden = !(profile?.approved);
  }

  if (adminArea) {
    adminArea.hidden = !(
      profile?.approved &&
      profile?.role === "admin"
    );
  }

  if (!user) {
    if (authArea) {
      authArea.innerHTML = authHTML;

      $("#loginForm")?.addEventListener(
        "submit", login
      );

      $("#signupForm")?.addEventListener(
        "submit", signup
      );
    }

    return;
  }

  $("#displayName").value = profile?.display_name || "";
  $("#birthday").value = profile?.birthday || "";

  $("#showBirthday").checked =
    !!profile?.show_birthday;

  $("#notifyBirthday").checked =
    !!profile?.notify_others;

  $("#receiveNotices").checked =
    profile?.receive_birthday_notices !== false;

  $("#memberStatus").textContent = profile?.approved
    ? "Cadastro aprovado • " +
      (profile.role === "admin"
        ? "Administrador"
        : "Membro")
    : "Seu cadastro aguarda aprovação da liderança.";

  if (profile?.approved) {
    await Promise.all([
      inbox(),
      announcements()
    ]);

    if (profile.role === "admin") {
      await pending();
    }
  }
}

// ENTRAR

async function login(e) {
  e.preventDefault();

  if (!db) {
    return msg("Configure primeiro o Supabase.", true);
  }

  const f = new FormData(e.target);

  const { error } = await db.auth.signInWithPassword({
    email: String(f.get("email")).trim(),
    password: f.get("password")
  });

  if (error) {
    return msg(
      "Não foi possível entrar: " + errorText(error),
      true
    );
  }

  await authUI();
  msg("Bem-vindo(a) à IBI Biguaçu!");
}

// CRIAR CONTA

async function signup(e) {
  e.preventDefault();

  if (!db) {
    return msg("Configure primeiro o Supabase.", true);
  }

  const f = new FormData(e.target);
  const name = String(f.get("name") || "").trim();
  const email = String(f.get("email") || "").trim();
  const password = f.get("password");

  if (!name || !email) {
    return msg("Preencha nome e e-mail.", true);
  }

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name
      },
      emailRedirectTo:
        location.origin + location.pathname
    }
  });

  if (error) {
    return msg(
      "Erro no cadastro: " + errorText(error),
      true
    );
  }

  await authUI();

  msg(
    data.session
      ? "Conta criada! Aguarde aprovação da liderança."
      : "Cadastro solicitado! Confira seu e-mail e confirme a conta."
  );
}

// MENSAGENS INDIVIDUAIS

async function inbox() {
  const out = $("#inbox");
  if (!out || !user || !db) return;

  const { data, error } = await db
    .from("notifications")
    .select("id,title,body,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  out.replaceChildren();

  if (error) {
    out.textContent =
      "Não foi possível carregar suas mensagens.";
    return;
  }

  (data || []).forEach(n => {
    out.append(item(n.title, n.body));
  });

  if (!out.children.length) {
    out.textContent = "Nenhuma mensagem no momento.";
  }
}

// COMUNICADOS

async function announcements() {
  const out = $("#announcements");
  if (!out || !db) return;

  const { data, error } = await db
    .from("announcements")
    .select("title,body,created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  out.replaceChildren();

  if (error) {
    out.textContent =
      "Não foi possível carregar comunicados.";
    return;
  }

  (data || []).forEach(n => {
    out.append(item(n.title, n.body));
  });

  if (!out.children.length) {
    out.textContent = "Nenhum comunicado interno.";
  }
}

// APROVAR MEMBROS

async function pending() {
  const out = $("#pending");

  if (!out || !db || profile?.role !== "admin") {
    return;
  }

  const { data, error } =
    await db.rpc("pending_members");

  out.replaceChildren();

  if (error) {
    out.textContent =
      "Erro ao carregar cadastros pendentes.";
    return;
  }

  (data || []).forEach(p => {
    const el = item(
      p.display_name,
      "Aguardando aprovação"
    );

    const button = document.createElement("button");
    button.className = "button";
    button.textContent = "Aprovar";

    button.onclick = async () => {
      if (!confirm("Aprovar este membro?")) return;

      const { error } = await db.rpc(
        "approve_member",
        { member_id: p.id }
      );

      if (error) {
        return msg(errorText(error), true);
      }

      msg("Membro aprovado!");
      await pending();
    };

    el.append(button);
    out.append(el);
  });

  if (!out.children.length) {
    out.textContent = "Nenhum cadastro pendente.";
  }
}

// SALVAR PERFIL

$("#profileForm")?.addEventListener(
  "submit",
  async e => {
    e.preventDefault();
    if (!user || !db) return;

    const changes = {
      display_name: $("#displayName").value.trim(),
      birthday: $("#birthday").value || null,
      show_birthday: $("#showBirthday").checked,
      notify_others: $("#notifyBirthday").checked,
      receive_birthday_notices:
        $("#receiveNotices").checked
    };

    if (
      changes.notify_others &&
      !changes.show_birthday
    ) {
      return msg(
        "Para avisar os membros, autorize aparecer na lista.",
        true
      );
    }

    const { error } = await db
      .from("profiles")
      .update(changes)
      .eq("id", user.id);

    if (error) {
      return msg(errorText(error), true);
    }

    msg("Perfil salvo com sucesso!");
    await authUI();
    await birthdays();
  }
);

// PUBLICAR COMUNICADO

$("#noticeForm")?.addEventListener(
  "submit",
  async e => {
    e.preventDefault();
    if (!db || profile?.role !== "admin") return;

    const f = new FormData(e.target);

    const { error } = await db
      .from("announcements")
      .insert({
        title: f.get("title"),
        body: f.get("body")
      });

    if (error) {
      return msg(errorText(error), true);
    }

    e.target.reset();
    msg("Comunicado publicado!");
    await announcements();
  }
);

// PUBLICAR EVENTO

$("#eventForm")?.addEventListener(
  "submit",
  async e => {
    e.preventDefault();
    if (!db || profile?.role !== "admin") return;

    const f = new FormData(e.target);
    const starts = new Date(f.get("starts_at"));

    if (isNaN(starts.getTime())) {
      return msg("Data inválida.", true);
    }

    const { error } = await db
      .from("events")
      .insert({
        title: f.get("title"),
        description: f.get("description"),
        starts_at: starts.toISOString()
      });

    if (error) {
      return msg(errorText(error), true);
    }

    e.target.reset();
    msg("Evento publicado!");
    await events();
  }
);

// SAIR DA CONTA

$("#logout")?.addEventListener("click", async () => {
  if (db) {
    await db.auth.signOut();
  }

  await authUI();
  msg("Você saiu da sua conta.");
});

// INICIALIZAÇÃO

async function initializeApp() {
  links();

  await Promise.all([
    events(),
    birthdays(),
    authUI()
  ]);

  if (!configured) {
    msg(
      "Modo demonstração: configure a URL e a chave pública do Supabase.",
      true
    );
  }
}

initializeApp().catch(error => {
  console.error("Erro ao iniciar aplicativo:", error);
  msg("Não foi possível iniciar o aplicativo.", true);
});

// PWA - INSTALAÇÃO NO CELULAR

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(error => {
        console.warn(
          "Service Worker não registrado:",
          error
        );
      });
  });
}
