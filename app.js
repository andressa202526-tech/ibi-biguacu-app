
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
  b.addEventListener("click", () => {
    navigate(b.dataset.page);
  });
});

function item(title, body) {
  const el = document.createElement("div");
  el.className = "panel";
  el.innerHTML = `
    <strong>${esc(title)}</strong>
    <p>${esc(body)}</p>
  `;
  return el;
}

// CAMPOS DO CADASTRO

const cargos = [
  "Membro",
  "Visitante",
  "Líder de ministério",
  "Diácono(a)",
  "Presbítero",
  "Pastor"
];

const ministerios = [
  "Nenhum no momento",
  "Elcana",
  "Kids",
  "Mulheres",
  "Homens",
  "Louvor",
  "Mídia",
  "Evangelismo"
];

function opcoes(lista) {
  return lista.map(v =>
    `<option value="${esc(v)}">${esc(v)}</option>`
  ).join("");
}

function camposExtras(prefix) {
  return `
    <label>Função na igreja
      <select id="${prefix}cargo_igreja"
        name="cargo_igreja">
        ${opcoes(cargos)}
      </select>
    </label>

    <label>Ministério
      <select id="${prefix}ministerio"
        name="ministerio">
        ${opcoes(ministerios)}
      </select>
    </label>

    <label>WhatsApp com DDD
      <input type="tel" name="whatsapp"
        id="${prefix}whatsapp"
        maxlength="20"
        placeholder="(48) 99999-9999">
    </label>

    <label>Endereço
      <input name="endereco"
        id="${prefix}endereco"
        maxlength="160"
        placeholder="Rua, número e complemento">
    </label>

    <label>Bairro
      <input name="bairro"
        id="${prefix}bairro" maxlength="80">
    </label>

    <label>Cidade
      <input name="cidade"
        id="${prefix}cidade" maxlength="80">
    </label>

    <label>Data de nascimento
      <input type="date" name="birthday"
        id="${prefix}birthday">
    </label>

    <label>
      <input type="checkbox"
        name="autoriza_whatsapp_aniversario"
        id="${prefix}autoriza_whatsapp_aniversario">
      Autorizo receber mensagens de aniversário
      da IBI Biguaçu pelo WhatsApp.
    </label>
  `;
}

function getExtras(form) {
  const f = new FormData(form);
  return {
    cargo_igreja: String(
      f.get("cargo_igreja") || "Membro"
    ),
    ministerio: String(
      f.get("ministerio") || "Nenhum no momento"
    ),
    whatsapp: String(f.get("whatsapp") || "").trim(),
    endereco: String(f.get("endereco") || "").trim(),
    bairro: String(f.get("bairro") || "").trim(),
    cidade: String(f.get("cidade") || "").trim(),
    birthday: String(f.get("birthday") || ""),
    autoriza_whatsapp_aniversario:
      f.has("autoriza_whatsapp_aniversario")
  };
}

function whatsappValido(dados) {
  const n = dados.whatsapp.replace(/\D/g, "");

  if (n && ![10, 11].includes(n.length)) {
    msg("WhatsApp inválido. Informe o DDD.", true);
    return false;
  }

  if (dados.autoriza_whatsapp_aniversario && !n) {
    msg("Informe o WhatsApp para autorizar mensagens.", true);
    return false;
  }

  return true;
}

// LINKS

function links() {
  const out = $("#links");
  if (!out) return;

  out.replaceChildren();

  const lista = [
    [cfg.liveUrl, "▶ Assistir culto ao vivo"],
    [cfg.instagramUrl, "Instagram da igreja"]
  ];

  let count = 0;

  for (const [url, titulo] of lista) {
    try {
      const link = new URL(url);
      if (link.protocol !== "https:") continue;

      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = link.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = titulo;
      p.append(a);
      out.append(p);
      count++;
    } catch {}
  }

  if (!count) {
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
    if (home) home.textContent = "Eventos em breve.";
    return;
  }

  const { data, error } = await db
    .from("events")
    .select("title,description,starts_at")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(20);

  if (error) {
    msg("Erro ao carregar eventos: " + errorText(error), true);
    return;
  }

  for (const [out, lista] of [
    [main, data || []],
    [home, (data || []).slice(0, 3)]
  ]) {
    if (!out) continue;

    out.replaceChildren();

    lista.forEach(e => {
      const date = new Date(e.starts_at).toLocaleString(
        "pt-BR",
        {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo"
        }
      );

      out.append(item(
        e.title,
        date + "\n" + (e.description || "")
      ));
    });

    if (!lista.length) {
      out.textContent = "Nenhum evento cadastrado.";
    }
  }
}

// ANIVERSARIANTES

async function birthdays() {
  const out = $("#birthdays");
  if (!out) return;

  if (!db) {
    out.textContent = "Aniversariantes em breve.";
    return;
  }

  const { data, error } =
    await db.rpc("month_birthdays");

  out.replaceChildren();

  if (error) {
    out.textContent = "Não foi possível carregar.";
    return;
  }

  (data || []).forEach(p => {
    const dia = String(p.birth_day).padStart(2, "0");
    const mes = String(p.birth_month).padStart(2, "0");

    out.append(item(
      `${dia}/${mes} — ${p.display_name}`,
      "Que Deus abençoe sua vida! 🎉"
    ));
  });

  if (!out.children.length) {
    out.textContent =
      "Nenhum aniversariante autorizado neste mês.";
  }
}

// LOGIN E CADASTRO

const authHTML = `
  <div class="panel">
    <h2>Entrar</h2>
    <form id="loginForm">
      <label>E-mail
        <input type="email" name="email"
          required autocomplete="email">
      </label>
      <label>Senha
        <input type="password" name="password"
          required minlength="8"
          autocomplete="current-password">
      </label>
      <button class="button">Entrar</button>
    </form>
  </div>

  <div class="panel">
    <h2>Solicitar cadastro</h2>
    <p class="muted">
      Seu cadastro será analisado pela liderança.
    </p>

    <form id="signupForm">
      <label>Nome completo
        <input name="name" required maxlength="80">
      </label>

      <label>E-mail
        <input type="email" name="email" required>
      </label>

      <label>Senha
        <input type="password" name="password"
          required minlength="8">
      </label>

      ${camposExtras("cad_")}

      <button class="button">Criar minha conta</button>
    </form>
  </div>
`;

async function getProfile() {
  if (!db || !user) return null;

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    msg("Erro no perfil: " + errorText(error), true);
    return null;
  }

  return data;
}

async function getContato() {
  if (!db || !user) return null;

  const { data, error } = await db
    .from("contatos_membros")
    .select("*")
    .eq("membro_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Contato indisponível:", error.message);
    return null;
  }

  return data;
}

function setValue(id, value) {
  const el = $("#" + id);
  if (el) el.value = value ?? "";
}

function setCheck(id, checked) {
  const el = $("#" + id);
  if (el) el.checked = !!checked;
}

async function authUI() {
  if (db) {
    const { data, error } = await db.auth.getUser();
    user = error ? null : data.user;
  } else {
    user = null;
  }

  profile = user ? await getProfile() : null;

  const authArea = $("#authArea");
  const memberArea = $("#memberArea");
  const approvedArea = $("#approvedArea");
  const adminArea = $("#adminArea");

  if (authArea) authArea.hidden = !!user;
  if (memberArea) memberArea.hidden = !user;

  if (approvedArea) {
    approvedArea.hidden = !profile?.approved;
  }

  if (adminArea) {
    adminArea.hidden = !(
      profile?.approved && profile.role === "admin"
    );
  }

  if (!user) {
    if (authArea) {
      authArea.innerHTML = authHTML;
      $("#loginForm")?.addEventListener("submit", login);
      $("#signupForm")?.addEventListener("submit", signup);
    }
    return;
  }

  const form = $("#profileForm");

  if (form && !$("#dadosExtras")) {
    const area = document.createElement("div");
    area.id = "dadosExtras";
    area.className = "panel";
    area.innerHTML = `
      <h3>Dados complementares</h3>
      ${camposExtras("perfil_")}
    `;

    const botao = form.querySelector(
      'button[type="submit"], button:not([type])'
    );

    if (botao) form.insertBefore(area, botao);
    else form.append(area);
  }

  setValue("displayName", profile?.display_name);
  setValue("birthday", profile?.birthday);
  setCheck("showBirthday", profile?.show_birthday);
  setCheck("notifyBirthday", profile?.notify_others);

  setCheck(
    "receiveNotices",
    profile?.receive_birthday_notices !== false
  );

  setValue(
    "perfil_cargo_igreja",
    profile?.cargo_igreja || "Membro"
  );

  setValue(
    "perfil_ministerio",
    profile?.ministerio || "Nenhum no momento"
  );

  setValue("perfil_birthday", profile?.birthday);

  const contato = await getContato();

  setValue("perfil_whatsapp", contato?.whatsapp);
  setValue("perfil_endereco", contato?.endereco);
  setValue("perfil_bairro", contato?.bairro);
  setValue("perfil_cidade", contato?.cidade);

  setCheck(
    "perfil_autoriza_whatsapp_aniversario",
    contato?.autoriza_whatsapp_aniversario
  );

  const status = $("#memberStatus");

  if (status) {
    status.textContent = profile?.approved
      ? "Cadastro aprovado • " +
        (profile.role === "admin"
          ? "Administrador"
          : "Membro")
      : "Seu cadastro aguarda aprovação da liderança.";
  }

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

async function login(e) {
  e.preventDefault();

  if (!db) {
    return msg("Configure o Supabase.", true);
  }

  const f = new FormData(e.target);

  const { error } = await db.auth.signInWithPassword({
    email: String(f.get("email")).trim(),
    password: f.get("password")
  });

  if (error) {
    return msg("Erro no login: " + errorText(error), true);
  }

  await authUI();
  msg("Bem-vindo(a) à IBI Biguaçu!");
}

async function signup(e) {
  e.preventDefault();

  if (!db) {
    return msg("Configure o Supabase.", true);
  }

  const f = new FormData(e.target);
  const dados = getExtras(e.target);

  if (!whatsappValido(dados)) return;

  const { data, error } = await db.auth.signUp({
    email: String(f.get("email")).trim(),
    password: f.get("password"),
    options: {
      data: {
        display_name: String(f.get("name")).trim(),
        ...dados
      },
      emailRedirectTo: location.origin + location.pathname
    }
  });

  if (error) {
    return msg("Erro no cadastro: " + errorText(error), true);
  }

  await authUI();

  msg(
    data.session
      ? "Conta criada! Aguarde aprovação."
      : "Confira seu e-mail para confirmar a conta."
  );
}

// MENSAGENS

async function inbox() {
  const out = $("#inbox");
  if (!out || !db || !user) return;

  const { data, error } = await db
    .from("notifications")
    .select("id,title,body,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  out.replaceChildren();

  if (error) {
    out.textContent = "Erro ao carregar mensagens.";
    return;
  }

  (data || []).forEach(n => {
    out.append(item(n.title, n.body));
  });

  if (!out.children.length) {
    out.textContent = "Nenhuma mensagem.";
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
    out.textContent = "Erro ao carregar comunicados.";
    return;
  }

  (data || []).forEach(n => {
    out.append(item(n.title, n.body));
  });

  if (!out.children.length) {
    out.textContent = "Nenhum comunicado.";
  }
}

// APROVAR MEMBROS

async function pending() {
  const out = $("#pending");

  if (
    !out || !db ||
    !profile?.approved ||
    profile.role !== "admin"
  ) return;

  const { data, error } =
    await db.rpc("pending_members");

  out.replaceChildren();

  if (error) {
    out.textContent = "Erro ao carregar cadastros.";
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

    const dados = getExtras(e.target);

    if (!whatsappValido(dados)) return;

    const changes = {
      display_name: $("#displayName").value.trim(),
      birthday: dados.birthday ||
        $("#birthday")?.value || null,
      show_birthday: !!$("#showBirthday")?.checked,
      notify_others: !!$("#notifyBirthday")?.checked,
      receive_birthday_notices:
        !!$("#receiveNotices")?.checked,
      cargo_igreja: dados.cargo_igreja,
      ministerio: dados.ministerio
    };

    if (
      changes.notify_others &&
      !changes.show_birthday
    ) {
      return msg(
        "Autorize aparecer na lista de aniversariantes.",
        true
      );
    }

    const { error } = await db
      .from("profiles")
      .update(changes)
      .eq("id", user.id);

    if (error) {
      return msg(
        "Erro ao salvar perfil: " + errorText(error),
        true
      );
    }

    const contato = {
      membro_id: user.id,
      whatsapp: dados.whatsapp || null,
      endereco: dados.endereco || null,
      bairro: dados.bairro || null,
      cidade: dados.cidade || null,
      autoriza_whatsapp_aniversario:
        dados.autoriza_whatsapp_aniversario
    };

    const { error: contactError } = await db
      .from("contatos_membros")
      .upsert(contato, { onConflict: "membro_id" });

    if (contactError) {
      return msg(
        "Perfil salvo, mas houve erro no contato: " +
        errorText(contactError),
        true
      );
    }

    msg("Dados salvos com sucesso!");
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

// SAIR

$("#logout")?.addEventListener("click", async () => {
  if (db) await db.auth.signOut();
  await authUI();
  msg("Você saiu da conta.");
});

// INICIAR APLICATIVO

async function iniciar() {
  links();

  await Promise.all([
    events(),
    birthdays(),
    authUI()
  ]);

  if (!configured) {
    msg(
      "Configure o Supabase no arquivo config.js.",
      true
    );
  }
}

iniciar().catch(error => {
  console.error(error);
  msg("Erro ao iniciar aplicativo.", true);
});

// INSTALACAO PWA

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(console.warn);
  });
}
