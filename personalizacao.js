
/* IBI BIGUAÇU - PERSONALIZAÇÃO V108
   Logo, fundo, ministérios, textos e galeria.
   Usa o login do app.js.
*/
(function () {
  "use strict";

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

  const imagens = [
    ["logo", "Logo da igreja"],
    ["banner", "Imagem de fundo da página inicial"],
    ...ministerios.map(([id, nome]) =>
      [id, "Foto do ministério: " + nome]
    )
  ];

  // MESMA CONEXÃO DO APLICATIVO
  function api() {
    try {
      return typeof db !== "undefined" ? db : null;
    } catch {
      return null;
    }
  }

  function criar(tag, texto = "") {
    const el = document.createElement(tag);
    el.textContent = texto;
    return el;
  }

  function informar(texto, erro = false) {
    const el = $("#personalStatus");
    if (!el) return;

    el.textContent = texto;
    el.style.color = erro ? "#b42330" : "#137547";
  }

  function urlSegura(valor) {
    try {
      const url = new URL(valor);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  // AUTENTICAÇÃO
  async function verificarAdmin(silencioso = false) {
    const client = api();

    if (!client) {
      if (!silencioso) informar(
        "Conexão com Supabase indisponível.",
        true
      );
      return false;
    }

    try {
      const { data: auth, error: erroAuth } =
        await client.auth.getUser();

      if (erroAuth || !auth?.user) {
        if (!silencioso) informar(
          "Entre novamente como administradora.",
          true
        );
        return false;
      }

      const { data: perfil, error } = await client
        .from("profiles")
        .select("role,approved")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (error) throw error;

      const permitido =
        perfil?.role === "admin" &&
        perfil?.approved === true;

      if (!permitido && !silencioso) {
        informar("Conta sem permissão administrativa.", true);
      }

      return permitido;

    } catch (erro) {
      if (!silencioso) informar(
        "Erro na autenticação: " + erro.message,
        true
      );
      return false;
    }
  }

  // APARÊNCIA DO SITE
  async function carregarAparencia() {
    const client = api();
    if (!client) return {};

    const { data, error } = await client
      .from("ibi_aparencia")
      .select("chave,valor");

    if (error) {
      console.warn("Aparência:", error.message);
      return {};
    }

    return Object.fromEntries(
      (data || []).map(r => [r.chave, r.valor])
    );
  }

  function aplicarAparencia(config) {
    const logo = $("header .logo");
    const logoUrl = urlSegura(config.logo);

    if (logo && logoUrl) {
      logo.src = logoUrl;
    }

    const hero = $("#inicio .hero");
    const banner = urlSegura(config.banner);

    if (hero && banner) {
      hero.style.backgroundImage =
        "linear-gradient(90deg, " +
        "rgba(4,15,41,.88), " +
        "rgba(4,21,54,.35)), " +
        'url("' + banner + '")';

      hero.style.backgroundSize = "cover";
      hero.style.backgroundPosition = "center";
    }

    const titulo = $("#inicio .hero h1");

    if (titulo && config.titulo) {
      titulo.textContent = config.titulo;
    }

    const subtitulo = $(
      "#inicio .hero-content p:not(#saudacao)"
    ) || $("#inicio .hero p:not(#saudacao)");

    if (subtitulo && config.subtitulo) {
      subtitulo.textContent = config.subtitulo;
    }

    const cards = [
      ...document.querySelectorAll("#ministerios article")
    ];

    ministerios.forEach(([chave, nome], indice) => {
      const card = cards[indice];
      const url = urlSegura(config[chave]);

      if (!card || !url) return;

      let foto = card.querySelector(".ibi-foto");

      if (!foto) {
        foto = criar("img");
        foto.className = "ibi-foto";
        foto.alt = "Ministério " + nome;

        Object.assign(foto.style, {
          width: "100%",
          height: "180px",
          objectFit: "cover",
          borderRadius: "12px",
          marginBottom: "12px"
        });

        card.prepend(foto);
      }

      foto.src = url;
    });
  }

  async function atualizarAparencia() {
    const config = await carregarAparencia();
    aplicarAparencia(config);

    const titulo = $("#personalTitulo");
    const subtitulo = $("#personalSubtitulo");

    if (titulo && document.activeElement !== titulo) {
      titulo.value = config.titulo || "";
    }

    if (subtitulo && document.activeElement !== subtitulo) {
      subtitulo.value = config.subtitulo || "";
    }
  }

  // UPLOAD
  async function enviarImagem(arquivo, pasta) {
    const client = api();

    if (!client) {
      throw new Error("Supabase indisponível.");
    }

    const formatos = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp"
    };

    if (!arquivo || !formatos[arquivo.type]) {
      throw new Error("Escolha PNG, JPG ou WebP.");
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      throw new Error("Imagem maior que 5 MB.");
    }

    const caminho =
      pasta + "/" +
      crypto.randomUUID() +
      "." + formatos[arquivo.type];

    const { error } = await client.storage
      .from("ibi-imagens")
      .upload(caminho, arquivo, {
        contentType: arquivo.type,
        upsert: false
      });

    if (error) throw error;

    const { data } = client.storage
      .from("ibi-imagens")
      .getPublicUrl(caminho);

    return {
      url: data.publicUrl,
      caminho
    };
  }

  // SALVAR PERSONALIZAÇÃO
  async function salvarPersonalizacao(evento) {
    evento.preventDefault();

    // IMPORTANTE: capturar o formulário ANTES do await
    const form = evento.currentTarget;
    const botao = form.querySelector(
      'button[type="submit"]'
    );

    if (!(await verificarAdmin())) return;

    const client = api();

    if (botao) botao.disabled = true;
    informar("Salvando personalização...");

    try {
      const campos = form.querySelectorAll(
        "[data-chave]"
      );

      let alteracoes = 0;

      for (const campo of campos) {
        let valor = "";

        if (campo.type === "file") {
          if (!campo.files?.length) continue;

          const imagem = await enviarImagem(
            campo.files[0],
            campo.dataset.chave
          );

          valor = imagem.url;

        } else {
          valor = campo.value.trim();
          if (!valor) continue;
        }

        const { error } = await client
          .from("ibi_aparencia")
          .upsert({
            chave: campo.dataset.chave,
            valor
          }, {
            onConflict: "chave"
          });

        if (error) throw error;

        alteracoes++;
      }

      if (!alteracoes) {
        informar("Selecione uma imagem ou preencha um texto.");
        return;
      }

      form.querySelectorAll('input[type="file"]')
        .forEach(input => input.value = "");

      await atualizarAparencia();
      informar("Personalização salva com sucesso!");

    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      informar(
        "Erro ao salvar: " + erro.message,
        true
      );

    } finally {
      if (botao) botao.disabled = false;
    }
  }

  // GALERIA PÚBLICA
  function criarGaleriaPublica() {
    if ($("#ibiGaleriaPublica")) return;

    const pagina = $("#galeria") || $("#inicio");
    if (!pagina) return;

    const area = criar("div");
    area.id = "ibiGaleriaPublica";
    area.className = "gallery-grid";

    if ($("#galeria")) {
      pagina.append(area);
    } else {
      const secao = criar("section");
      secao.className = "panel";
      secao.append(criar("h2", "Galeria da IBI Biguaçu"));
      secao.append(area);
      pagina.append(secao);
    }
  }

  async function carregarGaleria() {
    const area = $("#ibiGaleriaPublica");
    const client = api();

    if (!area || !client) return;

    const { data, error } = await client
      .from("ibi_galeria")
      .select("id,url,legenda")
      .order("criado_em", { ascending: false })
      .limit(40);

    if (error) {
      console.warn("Galeria:", error.message);
      return;
    }

    area.replaceChildren();

    for (const foto of data || []) {
      const src = urlSegura(foto.url);
      if (!src) continue;

      const figure = criar("figure");
      const img = criar("img");

      img.src = src;
      img.alt = foto.legenda || "Foto da igreja";
      img.loading = "lazy";

      Object.assign(img.style, {
        width: "100%",
        height: "190px",
        objectFit: "cover",
        borderRadius: "12px"
      });

      figure.append(img);

      if (foto.legenda) {
        figure.append(
          criar("figcaption", foto.legenda)
        );
      }

      area.append(figure);
    }

    if (!area.children.length) {
      area.textContent =
        "Em breve, fotos dos nossos encontros.";
    }
  }

  // PUBLICAR FOTO
  async function publicarFoto(evento) {
    evento.preventDefault();

    // Corrige o mesmo erro de currentTarget
    const form = evento.currentTarget;
    const arquivo = form.querySelector(
      "#personalFotoGaleria"
    )?.files[0];

    const legenda = form.querySelector(
      "#personalLegenda"
    )?.value.trim() || "";

    const autorizacao = form.querySelector(
      "#personalAutorizacao"
    )?.checked;

    const botao = form.querySelector(
      'button[type="submit"]'
    );

    if (!autorizacao) {
      informar("Confirme a autorização da foto.", true);
      return;
    }

    if (!(await verificarAdmin())) return;

    if (botao) botao.disabled = true;
    informar("Enviando foto...");

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
      await carregarGaleria();
      await carregarGaleriaAdmin();

      informar("Foto publicada com sucesso!");

    } catch (erro) {
      console.error("Erro na galeria:", erro);
      informar(
        "Erro ao publicar: " + erro.message,
        true
      );

    } finally {
      if (botao) botao.disabled = false;
    }
  }

  // LISTA DE FOTOS DO ADMINISTRADOR
  async function carregarGaleriaAdmin() {
    if (!(await verificarAdmin(true))) return;

    const area = $("#ibiGaleriaAdmin");
    if (!area) return;

    const { data, error } = await api()
      .from("ibi_galeria")
      .select("id,legenda,caminho")
      .order("criado_em", { ascending: false })
      .limit(50);

    if (error) {
      informar("Erro na galeria: " + error.message, true);
      return;
    }

    area.replaceChildren();

    for (const foto of data || []) {
      const linha = criar(
        "div",
        foto.legenda || "Foto sem legenda"
      );

      linha.style.padding = "12px";
      linha.style.borderBottom = "1px solid #ddd";

      const excluir = criar("button", "Excluir foto");
      excluir.type = "button";
      excluir.className = "button secondary";

      excluir.addEventListener("click", async () => {
        if (!confirm("Excluir esta foto?")) return;
        if (!(await verificarAdmin())) return;

        const { error } = await api()
          .from("ibi_galeria")
          .delete()
          .eq("id", foto.id);

        if (error) {
          informar(error.message, true);
          return;
        }

        if (foto.caminho) {
          const { error: erroStorage } = await api()
            .storage
            .from("ibi-imagens")
            .remove([foto.caminho]);

          if (erroStorage) {
            console.warn(
              "Imagem não removida:",
              erroStorage.message
            );
          }
        }

        await carregarGaleria();
        await carregarGaleriaAdmin();
        informar("Foto excluída!");
      });

      linha.append(excluir);
      area.append(linha);
    }
  }

  // INTERFACE
  function campo(rotulo, input) {
    const label = criar("label");

    label.style.display = "block";
    label.style.margin = "15px 0";

    const titulo = criar("strong", rotulo);
    titulo.style.display = "block";

    input.style.display = "block";
    input.style.marginTop = "7px";
    input.style.width = "100%";

    label.append(titulo, input);
    return label;
  }

  function criarPainel() {
    const admin = $("#adminArea");
    if (!admin || $("#ibiPersonalPanel")) return;

    const painel = criar("section");
    painel.id = "ibiPersonalPanel";
    painel.className = "panel";

    painel.append(
      criar("h2", "🎨 Personalizar aplicativo")
    );

    painel.append(
      criar(
        "p",
        "Altere logo, fundo, fotos dos ministérios, " +
        "textos e galeria pelo celular."
      )
    );

    const form = criar("form");
    form.id = "ibiPersonalForm";

    for (const [chave, nome] of imagens) {
      const input = criar("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.dataset.chave = chave;

      form.append(campo(nome, input));
    }

    const titulo = criar("input");
    titulo.type = "text";
    titulo.id = "personalTitulo";
    titulo.maxLength = 120;
    titulo.dataset.chave = "titulo";

    form.append(
      campo("Título principal", titulo)
    );

    const subtitulo = criar("input");
    subtitulo.type = "text";
    subtitulo.id = "personalSubtitulo";
    subtitulo.maxLength = 300;
    subtitulo.dataset.chave = "subtitulo";

    form.append(
      campo("Mensagem de boas-vindas", subtitulo)
    );

    const salvar = criar(
      "button",
      "Salvar personalização"
    );

    salvar.type = "submit";
    salvar.className = "button";
    form.append(salvar);

    painel.append(form);

    // GALERIA
    painel.append(
      criar("h3", "📷 Galeria de fotos")
    );

    const galeriaForm = criar("form");
    galeriaForm.id = "ibiGaleriaForm";

    const foto = criar("input");
    foto.type = "file";
    foto.id = "personalFotoGaleria";
    foto.accept = "image/png,image/jpeg,image/webp";
    foto.required = true;

    galeriaForm.append(
      campo("Selecionar foto", foto)
    );

    const legenda = criar("input");
    legenda.type = "text";
    legenda.id = "personalLegenda";
    legenda.maxLength = 180;

    galeriaForm.append(
      campo("Legenda da foto", legenda)
    );

    const autorizacao = criar("input");
    autorizacao.type = "checkbox";
    autorizacao.id = "personalAutorizacao";
    autorizacao.required = true;

    const label = criar("label");
    label.append(
      autorizacao,
      document.createTextNode(
        " Confirmo que tenho autorização para publicar."
      )
    );

    galeriaForm.append(label);

    const publicar = criar(
      "button",
      "Publicar foto"
    );

    publicar.type = "submit";
    publicar.className = "button";

    galeriaForm.append(publicar);
    painel.append(galeriaForm);

    const lista = criar("div");
    lista.id = "ibiGaleriaAdmin";
    painel.append(lista);

    const mensagem = criar("p");
    mensagem.id = "personalStatus";
    mensagem.setAttribute("role", "status");
    painel.append(mensagem);

    admin.append(painel);

    form.addEventListener(
      "submit",
      salvarPersonalizacao
    );

    galeriaForm.addEventListener(
      "submit",
      publicarFoto
    );
  }

  // INICIAR
  async function iniciarPersonalizacao() {
    criarGaleriaPublica();
    criarPainel();

    await atualizarAparencia();
    await carregarGaleria();

    if (await verificarAdmin(true)) {
      await carregarGaleriaAdmin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => iniciarPersonalizacao()
        .catch(console.error)
    );
  } else {
    iniciarPersonalizacao().catch(console.error);
  }

})();
