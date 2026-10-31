
/* IBI BIGUAÇU - PERSONALIZAÇÃO
   Usa a conexão autenticada do app.js.
   As permissões também devem existir no Supabase.
*/

(function () {
  "use strict";

  const $ = seletor => document.querySelector(seletor);

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
    ...ministerios.map(([id, nome]) => [
      id, "Foto do ministério: " + nome
    ])
  ];

  let adminAutorizado = false;

  function cliente() {
    try {
      if (typeof db !== "undefined" && db) {
        return db;
      }
    } catch (erro) {
      console.warn("Conexão indisponível:", erro);
    }

    return null;
  }

  function criar(tag, texto = "") {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;
    return elemento;
  }

  function informar(texto, erro = false) {
    const elemento = $("#personalStatus");
    if (!elemento) return;

    elemento.textContent = texto;
    elemento.style.color = erro ? "#b42330" : "#147047";
  }

  function urlSegura(valor) {
    try {
      const url = new URL(valor);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  // VERIFICAR O ADMINISTRADOR PELO MESMO LOGIN

  async function verificarAdmin() {
    const api = cliente();

    if (!api) {
      informar("Conexão com Supabase indisponível.", true);
      return false;
    }

    const { data: auth, error: erroAuth } =
      await api.auth.getUser();

    if (erroAuth || !auth?.user) {
      adminAutorizado = false;
      informar("Entre na sua conta de administradora.", true);
      return false;
    }

    const { data: perfil, error: erroPerfil } =
      await api
        .from("profiles")
        .select("role,approved")
        .eq("id", auth.user.id)
        .maybeSingle();

    if (erroPerfil) {
      adminAutorizado = false;
      informar(
        "Erro ao verificar permissão: " + erroPerfil.message,
        true
      );
      return false;
    }

    adminAutorizado =
      perfil?.role === "admin" &&
      perfil?.approved === true;

    if (!adminAutorizado) {
      informar(
        "Sua conta ainda não possui permissão administrativa.",
        true
      );
    }

    return adminAutorizado;
  }

  // CARREGAR PERSONALIZAÇÃO PÚBLICA

  async function carregarAparencia() {
    const api = cliente();
    if (!api) return {};

    const { data, error } = await api
      .from("ibi_aparencia")
      .select("chave,valor");

    if (error) {
      console.warn("Erro ao buscar aparência:", error.message);
      return {};
    }

    const config = {};

    for (const registro of data || []) {
      config[registro.chave] = registro.valor;
    }

    return config;
  }

  function aplicarAparencia(config) {
    const logo = $("header .logo");

    if (logo && urlSegura(config.logo)) {
      logo.src = urlSegura(config.logo);
    }

    const banner = $("#inicio .hero");
    const imagemBanner = urlSegura(config.banner);

    if (banner && imagemBanner) {
      banner.style.backgroundImage =
        "linear-gradient(90deg," +
        "rgba(4,15,41,.88)," +
        "rgba(4,21,54,.35))," +
        'url("' + imagemBanner + '")';

      banner.style.backgroundSize = "cover";
      banner.style.backgroundPosition = "center";
    }

    const titulo = $("#inicio .hero h1");

    if (titulo && config.titulo) {
      titulo.textContent = config.titulo;
    }

    const subtitulo = $("#inicio .hero-content p:not(#saudacao)");

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

  function preencherTextos(config) {
    const titulo = $("#personalTitulo");
    const subtitulo = $("#personalSubtitulo");

    if (titulo && config.titulo) {
      titulo.value = config.titulo;
    }

    if (subtitulo && config.subtitulo) {
      subtitulo.value = config.subtitulo;
    }
  }

  async function atualizarSite() {
    const config = await carregarAparencia();
    aplicarAparencia(config);
    preencherTextos(config);
    await carregarGaleria();
  }

  // ENVIAR IMAGEM PARA SUPABASE STORAGE

  async function enviarImagem(arquivo, pasta) {
    const api = cliente();

    if (!api) {
      throw new Error("Conexão indisponível.");
    }

    const formatos = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp"
    };

    if (!arquivo || !formatos[arquivo.type]) {
      throw new Error(
        "Selecione uma imagem PNG, JPG ou WebP."
      );
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      throw new Error(
        "A imagem precisa ter no máximo 5 MB."
      );
    }

    const caminho =
      pasta + "/" +
      crypto.randomUUID() +
      "." + formatos[arquivo.type];

    const { error } = await api.storage
      .from("ibi-imagens")
      .upload(caminho, arquivo, {
        contentType: arquivo.type,
        upsert: false
      });

    if (error) throw error;

    const { data } = api.storage
      .from("ibi-imagens")
      .getPublicUrl(caminho);

    return {
      url: data.publicUrl,
      caminho
    };
  }

  // SALVAR LOGO, FUNDO, FOTOS E TEXTOS

  async function salvarPersonalizacao(evento) {
    evento.preventDefault();

    if (!(await verificarAdmin())) return;

    const api = cliente();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');

    botao.disabled = true;
    informar("Salvando alterações...");

    try {
      const campos = form.querySelectorAll("[data-chave]");
      let alteracoes = 0;

      for (const campo of campos) {
        let valor = "";

        if (campo.type === "file") {
          const arquivo = campo.files[0];

          if (!arquivo) continue;

          const imagem = await enviarImagem(
            arquivo,
            campo.dataset.chave
          );

          valor = imagem.url;
        } else {
          valor = campo.value.trim();
          if (!valor) continue;
        }

        const { error } = await api
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

      if (alteracoes === 0) {
        informar("Selecione uma imagem ou preencha um texto.");
        return;
      }

      form.querySelectorAll('input[type="file"]')
        .forEach(input => input.value = "");

      informar("Personalização salva com sucesso!");
      await atualizarSite();

    } catch (erro) {
      informar(
        "Erro ao salvar: " + erro.message,
        true
      );

    } finally {
      botao.disabled = false;
    }
  }

  // GALERIA DE FOTOS

  async function carregarGaleria() {
    const area = $("#ibiGaleriaPublica");
    const api = cliente();

    if (!area || !api) return;

    const { data, error } = await api
      .from("ibi_galeria")
      .select("id,url,legenda")
      .order("criado_em", { ascending: false })
      .limit(40);

    if (error) {
      console.warn("Erro na galeria:", error.message);
      return;
    }

    area.replaceChildren();

    for (const foto of data || []) {
      const url = urlSegura(foto.url);
      if (!url) continue;

      const figure = criar("figure");
      const img = criar("img");

      img.src = url;
      img.alt = foto.legenda || "Foto da IBI Biguaçu";
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

  async function publicarFoto(evento) {
    evento.preventDefault();

    if (!(await verificarAdmin())) return;

    const form = evento.currentTarget;

    const arquivo =
      form.querySelector("#personalFotoGaleria").files[0];

    const legenda =
      form.querySelector("#personalLegenda").value.trim();

    const autorizacao =
      form.querySelector("#personalAutorizacao").checked;

    if (!autorizacao) {
      informar(
        "Confirme a autorização para publicar a foto.",
        true
      );
      return;
    }

    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;

    try {
      const imagem = await enviarImagem(
        arquivo,
        "galeria"
      );

      const { error } = await cliente()
        .from("ibi_galeria")
        .insert({
          url: imagem.url,
          caminho: imagem.caminho,
          legenda,
          consentimento_confirmado: true
        });

      if (error) throw error;

      form.reset();
      informar("Foto publicada com sucesso!");

      await carregarGaleria();
      await carregarGaleriaAdmin();

    } catch (erro) {
      informar(
        "Erro ao publicar foto: " + erro.message,
        true
      );

    } finally {
      botao.disabled = false;
    }
  }

  async function carregarGaleriaAdmin() {
    if (!(await verificarAdmin())) return;

    const area = $("#ibiGaleriaAdmin");
    if (!area) return;

    const { data, error } = await cliente()
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

      const botao = criar("button", "Excluir foto");
      botao.type = "button";
      botao.className = "button secondary";

      botao.addEventListener("click", async () => {
        if (!confirm("Deseja excluir esta foto?")) return;
        if (!(await verificarAdmin())) return;

        const resposta = await cliente()
          .from("ibi_galeria")
          .delete()
          .eq("id", foto.id);

        if (resposta.error) {
          informar(resposta.error.message, true);
          return;
        }

        if (foto.caminho) {
          const remocao = await cliente()
            .storage
            .from("ibi-imagens")
            .remove([foto.caminho]);

          if (remocao.error) {
            informar(
              "Registro excluído, mas a imagem ainda " +
              "está no armazenamento: " +
              remocao.error.message,
              true
            );
          }
        }

        await carregarGaleria();
        await carregarGaleriaAdmin();
      });

      linha.append(botao);
      area.append(linha);
    }
  }

  // CONSTRUIR FORMULÁRIOS

  function campo(rotulo, input) {
    const label = criar("label");

    label.style.display = "block";
    label.style.margin = "15px 0";

    const titulo = criar("strong", rotulo);
    titulo.style.display = "block";

    input.style.display = "block";
    input.style.width = "100%";
    input.style.marginTop = "7px";

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
        "Altere a logo, o fundo, os ministérios, " +
        "os textos e a galeria pelo celular."
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
      campo("Título da página inicial", titulo)
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

    painel.append(
      criar("h3", "📷 Galeria de fotos")
    );

    const formGaleria = criar("form");
    formGaleria.id = "ibiGaleriaForm";

    const foto = criar("input");
    foto.type = "file";
    foto.accept = "image/png,image/jpeg,image/webp";
    foto.id = "personalFotoGaleria";
    foto.required = true;

    formGaleria.append(
      campo("Selecionar foto", foto)
    );

    const legenda = criar("input");
    legenda.type = "text";
    legenda.id = "personalLegenda";
    legenda.maxLength = 180;

    formGaleria.append(
      campo("Legenda da foto", legenda)
    );

    const autorizacao = criar("input");
    autorizacao.type = "checkbox";
    autorizacao.id = "personalAutorizacao";
    autorizacao.required = true;

    const labelAutorizacao = criar("label");
    labelAutorizacao.append(
      autorizacao,
      document.createTextNode(
        " Confirmo que tenho autorização para publicar."
      )
    );

    formGaleria.append(labelAutorizacao);

    const publicar = criar(
      "button",
      "Publicar foto"
    );

    publicar.type = "submit";
    publicar.className = "button";

    formGaleria.append(publicar);
    painel.append(formGaleria);

    const lista = criar("div");
    lista.id = "ibiGaleriaAdmin";
    painel.append(lista);

    const resultado = criar("p");
    resultado.id = "personalStatus";
    resultado.setAttribute("role", "status");

    painel.append(resultado);
    admin.append(painel);

    form.addEventListener(
      "submit",
      salvarPersonalizacao
    );

    formGaleria.addEventListener(
      "submit",
      publicarFoto
    );
  }

  // INICIALIZAÇÃO

  async function iniciarPersonalizacao() {
    criarPainel();

    await atualizarSite();

    if (await verificarAdmin()) {
      await carregarGaleriaAdmin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        iniciarPersonalizacao().catch(console.error);
      }
    );
  } else {
    iniciarPersonalizacao().catch(console.error);
  }

})();
