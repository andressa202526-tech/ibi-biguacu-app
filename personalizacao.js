
/* IBI Biguaçu - Personalização pelo administrador */
(() => {
  "use strict";

  const cfg = window.IBI_CONFIG || {};

  if (
    !window.supabase ||
    !cfg.supabaseUrl ||
    !cfg.supabaseAnonKey
  ) return;

  const fallbackClient = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );

  const api = () =>
    typeof db !== "undefined" && db
      ? db
      : fallbackClient;

  const $ = s => document.querySelector(s);

  const ministerios = [
    ["kids", "Kids"],
    ["pre", "Pré e Juniores"],
    ["elcana", "Elcana"],
    ["perolas", "Pérolas"],
    ["homens", "Homens"],
    ["louvor", "Louvor"],
    ["midia", "Mídia"],
    ["evangelismo", "Evangelismo"]
  ];

  function elemento(tag, texto = "") {
    const el = document.createElement(tag);
    el.textContent = texto;
    return el;
  }

  function urlSegura(valor) {
    try {
      const url = new URL(valor);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function aviso(texto, erro = false) {
    const el = $("#ibiPersonalStatus");

    if (el) {
      el.textContent = texto;
      el.style.color = erro ? "#b42330" : "#18764d";
    }
  }

  async function administrador() {
    const { data: auth } = await api().auth.getUser();

    if (!auth?.user) return false;

    const { data, error } =
      await api().rpc("ibi_e_admin");

    return !error && data === true;
  }

  function aplicarAparencia(registros) {
    const valores = Object.fromEntries(
      (registros || []).map(r => [r.chave, r.valor])
    );

    const logo = $("header .logo");

    if (logo && urlSegura(valores.logo)) {
      logo.src = urlSegura(valores.logo);
    }

    const hero = $("#inicio .hero");

    if (hero && urlSegura(valores.banner)) {
      const imagem = urlSegura(valores.banner);

      hero.style.backgroundImage =
        `linear-gradient(
          90deg,
          rgba(3, 20, 52, .85),
          rgba(3, 20, 52, .25)
        ), url("${imagem}")`;

      hero.style.backgroundSize = "cover";
      hero.style.backgroundPosition = "center";
    }

    const titulo = $("#inicio .hero h1");

    if (titulo && valores.titulo) {
      titulo.textContent = valores.titulo;
    }

    const subtitulo = $("#inicio .hero p");

    if (subtitulo && valores.subtitulo) {
      subtitulo.textContent = valores.subtitulo;
    }

    const cards = [
      ...document.querySelectorAll("#ministerios article")
    ];

    ministerios.forEach(([chave], indice) => {
      const card = cards[indice];
      const imagem = urlSegura(valores[chave]);

      if (!card || !imagem) return;

      let foto = card.querySelector(".ibi-foto");

      if (!foto) {
        foto = elemento("img");
        foto.className = "ibi-foto";
        card.prepend(foto);
      }

      foto.src = imagem;
      foto.alt = "Imagem do ministério";

      Object.assign(foto.style, {
        width: "100%",
        height: "180px",
        objectFit: "cover",
        borderRadius: "10px",
        marginBottom: "12px"
      });
    });
  }

  async function atualizarSite() {
    const { data, error } = await api()
      .from("ibi_aparencia")
      .select("chave,valor");

    if (!error) aplicarAparencia(data);

    const galeria = $("#ibiGaleriaPublica");
    if (!galeria) return;

    const resposta = await api()
      .from("ibi_galeria")
      .select("id,url,legenda")
      .order("criado_em", { ascending: false })
      .limit(30);

    if (resposta.error) return;

    galeria.replaceChildren();

    for (const foto of resposta.data || []) {
      const src = urlSegura(foto.url);
      if (!src) continue;

      const figure = elemento("figure");
      const img = elemento("img");

      img.src = src;
      img.alt = foto.legenda || "Foto da igreja";
      img.loading = "lazy";

      Object.assign(img.style, {
        width: "100%",
        height: "180px",
        objectFit: "cover",
        borderRadius: "10px"
      });

      figure.append(img);

      if (foto.legenda) {
        figure.append(
          elemento("figcaption", foto.legenda)
        );
      }

      galeria.append(figure);
    }

    if (!galeria.children.length) {
      galeria.append(
        elemento("p", "Em breve, fotos da nossa igreja.")
      );
    }
  }

  function campo(rotulo, input) {
    const label = elemento("label");

    label.style.display = "block";
    label.style.margin = "15px 0";

    label.append(elemento("strong", rotulo), input);

    input.style.display = "block";
    input.style.width = "100%";
    input.style.marginTop = "7px";

    return label;
  }

  async function enviarImagem(arquivo, chave) {
    const formatos = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp"
    };

    if (!arquivo || !formatos[arquivo.type]) {
      throw new Error("Use uma imagem PNG, JPG ou WebP.");
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter até 5 MB.");
    }

    const caminho =
      `${chave}/${crypto.randomUUID()}.${formatos[arquivo.type]}`;

    const { error } = await api()
      .storage
      .from("ibi-imagens")
      .upload(caminho, arquivo, {
        contentType: arquivo.type,
        upsert: false
      });

    if (error) throw error;

    const { data } = api()
      .storage
      .from("ibi-imagens")
      .getPublicUrl(caminho);

    return {
      url: data.publicUrl,
      caminho
    };
  }

  async function salvarAparencia(event) {
    event.preventDefault();

    if (!(await administrador())) {
      aviso("Acesso permitido apenas para administradores.", true);
      return;
    }

    const form = event.currentTarget;
    const botao = form.querySelector("button");

    botao.disabled = true;

    try {
      for (const input of form.querySelectorAll("[data-chave]")) {
        let valor = "";

        if (input.type === "file") {
          if (!input.files[0]) continue;

          const imagem = await enviarImagem(
            input.files[0],
            input.dataset.chave
          );

          valor = imagem.url;
        } else {
          valor = input.value.trim();

          if (!valor) continue;
        }

        const { error } = await api()
          .from("ibi_aparencia")
          .upsert({
            chave: input.dataset.chave,
            valor
          }, {
            onConflict: "chave"
          });

        if (error) throw error;
      }

      aviso("Alterações salvas com sucesso!");
      await atualizarSite();

    } catch (erro) {
      aviso("Erro ao salvar: " + erro.message, true);

    } finally {
      botao.disabled = false;
    }
  }

  async function publicarFoto(event) {
    event.preventDefault();

    if (!(await administrador())) {
      aviso("Acesso restrito.", true);
      return;
    }

    const form = event.currentTarget;
    const campos = form.querySelectorAll("input");

    const arquivo = campos[0].files[0];
    const legenda = campos[1].value.trim();
    const botao = form.querySelector("button");

    botao.disabled = true;

    try {
      const imagem = await enviarImagem(
        arquivo,
        "galeria"
      );

      const { error } = await api()
        .from("ibi_galeria")
        .insert({
          url: imagem.url,
          caminho: imagem.caminho,
          legenda,
          consentimento_confirmado: true
        });

      if (error) throw error;

      form.reset();
      aviso("Foto publicada!");

      await atualizarSite();
      await listarGaleriaAdmin();

    } catch (erro) {
      aviso("Erro: " + erro.message, true);

    } finally {
      botao.disabled = false;
    }
  }

  async function listarGaleriaAdmin() {
    const area = $("#ibiGaleriaAdmin");

    if (!area || !(await administrador())) return;

    const { data, error } = await api()
      .from("ibi_galeria")
      .select("id,legenda,caminho")
      .order("criado_em", { ascending: false })
      .limit(50);

    if (error) return;

    area.replaceChildren();

    for (const foto of data || []) {
      const linha = elemento(
        "div",
        foto.legenda || "Foto sem legenda"
      );

      linha.style.padding = "10px";

      const excluir = elemento("button", "Excluir");
      excluir.type = "button";
      excluir.className = "button secondary";

      excluir.addEventListener("click", async () => {
        if (!confirm("Excluir esta foto?")) return;
        if (!(await administrador())) return;

        const { error } = await api()
          .from("ibi_galeria")
          .delete()
          .eq("id", foto.id);

        if (error) {
          aviso(error.message, true);
          return;
        }

        await api()
          .storage
          .from("ibi-imagens")
          .remove([foto.caminho]);

        aviso("Foto excluída.");
        await atualizarSite();
        await listarGaleriaAdmin();
      });

      linha.append(excluir);
      area.append(linha);
    }
  }

  function criarGaleriaPublica() {
    if ($("#ibiGaleriaPublica")) return;

    const home = $("#inicio");
    if (!home) return;

    const section = elemento("section");
    section.className = "panel";

    section.append(
      elemento("h2", "Galeria da IBI Biguaçu")
    );

    const galeria = elemento("div");
    galeria.id = "ibiGaleriaPublica";

    Object.assign(galeria.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
      gap: "14px"
    });

    section.append(galeria);
    home.append(section);
  }

  function criarPainel() {
    const admin = $("#adminArea");

    if (!admin || $("#ibiPersonalPanel")) return;

    const painel = elemento("section");
    painel.id = "ibiPersonalPanel";
    painel.className = "panel";

    painel.append(
      elemento("h2", "🎨 Personalizar aplicativo")
    );

    painel.append(
      elemento(
        "p",
        "Altere as imagens e os textos do site pelo celular."
      )
    );

    const form = elemento("form");
    form.id = "ibiPersonalForm";

    const imagens = [
      ["logo", "Logo da igreja"],
      ["banner", "Imagem de fundo da página inicial"],
      ...ministerios.map(
        ([chave, nome]) => [chave, "Foto do ministério: " + nome]
      )
    ];

    for (const [chave, rotulo] of imagens) {
      const input = elemento("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.dataset.chave = chave;

      form.append(campo(rotulo, input));
    }

    const textos = [
      ["titulo", "Título da página inicial"],
      ["subtitulo", "Mensagem de boas-vindas"]
    ];

    for (const [chave, rotulo] of textos) {
      const input = elemento("input");
      input.type = "text";
      input.maxLength = chave === "titulo" ? 120 : 300;
      input.dataset.chave = chave;

      form.append(campo(rotulo, input));
    }

    const salvar = elemento(
      "button",
      "Salvar personalização"
    );

    salvar.type = "submit";
    salvar.className = "button";
    form.append(salvar);

    painel.append(form);

    painel.append(
      elemento("h3", "Galeria de fotos")
    );

    const formGaleria = elemento("form");
    formGaleria.id = "ibiGaleriaForm";

    const foto = elemento("input");
    foto.type = "file";
    foto.accept = "image/png,image/jpeg,image/webp";
    foto.required = true;

    formGaleria.append(
      campo("Selecionar foto", foto)
    );

    const legenda = elemento("input");
    legenda.type = "text";
    legenda.maxLength = 180;

    formGaleria.append(
      campo("Legenda", legenda)
    );

    const autorizacao = elemento("input");
    autorizacao.type = "checkbox";
    autorizacao.required = true;

    const texto = elemento("label");
    texto.append(
      autorizacao,
      document.createTextNode(
        " Confirmo que tenho autorização para publicar esta foto."
      )
    );

    formGaleria.append(texto);

    const publicar = elemento(
      "button",
      "Publicar foto"
    );

    publicar.type = "submit";
    publicar.className = "button";

    formGaleria.append(publicar);
    painel.append(formGaleria);

    const lista = elemento("div");
    lista.id = "ibiGaleriaAdmin";
    painel.append(lista);

    const status = elemento("p");
    status.id = "ibiPersonalStatus";
    status.setAttribute("role", "status");
    painel.append(status);

    admin.append(painel);

    form.addEventListener("submit", salvarAparencia);
    formGaleria.addEventListener("submit", publicarFoto);
  }

  async function iniciar() {
    criarGaleriaPublica();
    criarPainel();

    await atualizarSite();

    if (await administrador()) {
      await listarGaleriaAdmin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => iniciar().catch(console.error)
    );
  } else {
    iniciar().catch(console.error);
  }
})();
