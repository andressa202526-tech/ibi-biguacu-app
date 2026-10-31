
/* IBI BIGUAÇU - PAINEL DE PERSONALIZAÇÃO
   Logo, banner, ministérios, textos e galeria
*/

(function () {
  "use strict";

  const CONFIG = window.IBI_CONFIG || {};
  const $ = s => document.querySelector(s);

  if (!window.supabase ||
      !CONFIG.supabaseUrl ||
      !CONFIG.supabaseAnonKey) {
    console.warn("Supabase não configurado.");
    return;
  }

  const client = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseAnonKey,
    {
      auth: {
        storageKey: "ibi-personalizacao-auth",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  // Utilizar o mesmo cliente autenticado do aplicativo.
  function api() {
    try {
      if (typeof db !== "undefined" && db) {
        return db;
      }
    } catch (_) {}
    return client;
  }

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

  function criar(tag, texto = "") {
    const el = document.createElement(tag);
    el.textContent = texto;
    return el;
  }

  function status(texto, erro = false) {
    const el = $("#personalStatus");
    if (!el) return;

    el.textContent = texto;
    el.style.color = erro ? "#b42330" : "#18734b";
  }

  function urlValida(valor) {
    try {
      const url = new URL(valor);
      return url.protocol === "https:" ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  // VERIFICAR ADMINISTRADOR

  async function verificarAdmin() {
    const { data, error } = await api().auth.getUser();

    if (error || !data?.user) return false;

    const { data: perfil, error: erroPerfil } = await api()
      .from("profiles")
      .select("role,approved")
      .eq("id", data.user.id)
      .maybeSingle();

    return !erroPerfil &&
      perfil?.role === "admin" &&
      perfil?.approved === true;
  }

  // BUSCAR CONFIGURAÇÕES

  async function carregarConfiguracoes() {
    const { data, error } = await api()
      .from("ibi_aparencia")
      .select("chave,valor");

    if (error) {
      console.warn("Configurações:", error.message);
      return {};
    }

    const config = {};

    (data || []).forEach(item => {
      config[item.chave] = item.valor;
    });

    return config;
  }

  // APLICAR PERSONALIZAÇÃO NO SITE

  function aplicar(config) {
    const logo = $("header .logo");

    if (logo && urlValida(config.logo)) {
      logo.src = urlValida(config.logo);
    }

    const banner = $("#inicio .hero");

    if (banner && urlValida(config.banner)) {
      banner.style.backgroundImage =
        'linear-gradient(90deg,' +
        'rgba(4,15,41,.9),' +
        'rgba(4,21,54,.35)),' +
        'url("' + urlValida(config.banner) + '")';

      banner.style.backgroundSize = "cover";
      banner.style.backgroundPosition = "center";
    }

    const titulo = $("#inicio .hero h1");

    if (titulo && config.titulo) {
      titulo.textContent = config.titulo;
    }

    const subtitulo = $("#inicio .hero p");

    if (subtitulo && config.subtitulo) {
      subtitulo.textContent = config.subtitulo;
    }

    const cards = [
      ...document.querySelectorAll("#ministerios article")
    ];

    ministerios.forEach(([chave, nome], indice) => {
      const card = cards[indice];
      const url = urlValida(config[chave]);

      if (!card || !url) return;

      let foto = card.querySelector(".ibi-foto");

      if (!foto) {
        foto = criar("img");
        foto.className = "ibi-foto";
        foto.alt = "Ministério " + nome;

        foto.style.width = "100%";
        foto.style.height = "180px";
        foto.style.objectFit = "cover";
        foto.style.borderRadius = "12px";
        foto.style.marginBottom = "12px";

        card.prepend(foto);
      }

      foto.src = url;
    });
  }

  async function atualizarAparencia() {
    const config = await carregarConfiguracoes();
    aplicar(config);
    preencherTextos(config);
  }

  // UPLOAD DE IMAGENS

  async function enviarImagem(arquivo, pasta) {
    if (!arquivo) {
      throw new Error("Selecione uma imagem.");
    }

    const formatos = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp"
    };

    const extensao = formatos[arquivo.type];

    if (!extensao) {
      throw new Error("Use PNG, JPG ou WebP.");
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      throw new Error("Imagem maior que 5 MB.");
    }

    const nome =
      pasta + "/" +
      crypto.randomUUID() +
      "." + extensao;

    const { error } = await api()
      .storage
      .from("ibi-imagens")
      .upload(nome, arquivo, {
        contentType: arquivo.type,
        upsert: false
      });

    if (error) throw error;

    const { data } = api()
      .storage
      .from("ibi-imagens")
      .getPublicUrl(nome);

    return {
      url: data.publicUrl,
      caminho: nome
    };
  }

  // SALVAR CONFIGURAÇÕES

  async function salvarConfiguracoes(evento) {
    evento.preventDefault();

    if (!(await verificarAdmin())) {
      status("Acesso permitido apenas ao administrador.", true);
      return;
    }

    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');

    botao.disabled = true;
    status("Salvando alterações...");

    try {
      const campos = form.querySelectorAll("[data-chave]");

      for (const campo of campos) {
        let valor;

        if (campo.type === "file") {
          if (!campo.files.length) continue;

          const imagem = await enviarImagem(
            campo.files[0],
            campo.dataset.chave
          );

          valor = imagem.url;
        } else {
          valor = campo.value.trim();
        }

        if (!valor) continue;

        const { error } = await api()
          .from("ibi_aparencia")
          .upsert({
            chave: campo.dataset.chave,
            valor: valor
          }, {
            onConflict: "chave"
          });

        if (error) throw error;
      }

      status("Personalização salva com sucesso!");
      await atualizarAparencia();

    } catch (erro) {
      status("Erro ao salvar: " + erro.message, true);

    } finally {
      botao.disabled = false;
    }
  }

  // GALERIA PÚBLICA

  function criarGaleriaPublica() {
    if ($("#ibiGaleriaPublica")) return;

    const pagina = $("#galeria") || $("#inicio");

    if (!pagina) return;

    const secao = criar("section");
    secao.className = "panel";

    secao.append(
      criar("h2", "Galeria da IBI Biguaçu")
    );

    const galeria = criar("div");
    galeria.id = "ibiGaleriaPublica";

    galeria.style.display = "grid";
    galeria.style.gridTemplateColumns =
      "repeat(auto-fit,minmax(180px,1fr))";
    galeria.style.gap = "14px";

    secao.append(galeria);
    pagina.append(secao);
  }

  async function carregarGaleria() {
    const area = $("#ibiGaleriaPublica");
    if (!area) return;

    const { data, error } = await api()
      .from("ibi_galeria")
      .select("id,url,legenda")
      .order("criado_em", { ascending: false })
      .limit(40);

    if (error) {
      console.warn("Galeria:", error.message);
      return;
    }

    area.replaceChildren();

    (data || []).forEach(foto => {
      const url = urlValida(foto.url);
      if (!url) return;

      const figure = criar("figure");
      const img = criar("img");

      img.src = url;
      img.loading = "lazy";
      img.alt = foto.legenda || "Foto da igreja";
      img.style.width = "100%";
      img.style.height = "190px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "12px";

      figure.append(img);

      if (foto.legenda) {
        figure.append(
          criar("figcaption", foto.legenda)
        );
      }

      area.append(figure);
    });

    if (!area.children.length) {
      area.textContent =
        "Em breve, fotos dos nossos encontros.";
    }
  }

  // PUBLICAR FOTO

  async function publicarFoto(evento) {
    evento.preventDefault();

    if (!(await verificarAdmin())) {
      status("Acesso restrito.", true);
      return;
    }

    const form = evento.currentTarget;
    const arquivo = form.querySelector(
      'input[type="file"]'
    ).files[0];

    const legenda = form.querySelector(
      'input[name="legenda"]'
    ).value.trim();

    const autorizado = form.querySelector(
      'input[name="autorizacao"]'
    ).checked;

    if (!autorizado) {
      status("Confirme a autorização da foto.", true);
      return;
    }

    const botao = form.querySelector('button[type="submit"]');
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
          legenda: legenda,
          consentimento_confirmado: true
        });

      if (error) throw error;

      form.reset();
      status("Foto publicada com sucesso!");

      await carregarGaleria();
      await carregarGaleriaAdmin();

    } catch (erro) {
      status("Erro: " + erro.message, true);

    } finally {
      botao.disabled = false;
    }
  }

  // EXCLUIR FOTOS

  async function carregarGaleriaAdmin() {
    const area = $("#ibiGaleriaAdmin");

    if (!area || !(await verificarAdmin())) return;

    const { data, error } = await api()
      .from("ibi_galeria")
      .select("id,legenda,caminho")
      .order("criado_em", { ascending: false })
      .limit(50);

    if (error) return;

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
        if (!confirm("Excluir esta foto?")) return;
        if (!(await verificarAdmin())) return;

        const { error } = await api()
          .from("ibi_galeria")
          .delete()
          .eq("id", foto.id);

        if (error) {
          status(error.message, true);
          return;
        }

        if (foto.caminho) {
          const { error: erroStorage } = await api()
            .storage
            .from("ibi-imagens")
            .remove([foto.caminho]);

          if (erroStorage) {
            console.warn(erroStorage.message);
          }
        }

        status("Foto excluída.");
        await carregarGaleria();
        await carregarGaleriaAdmin();
      });

      linha.append(botao);
      area.append(linha);
    }
  }

  // CRIAR CAMPOS DO PAINEL

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

  function preencherTextos(config) {
    document.querySelectorAll(
      '#ibiPersonalForm input[type="text"]'
    ).forEach(input => {
      const valor = config[input.dataset.chave];

      if (valor && document.activeElement !== input) {
        input.value = valor;
      }
    });
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
        "Altere imagens e textos pelo celular. " +
        "As mudanças aparecem para todos os visitantes."
      )
    );

    const form = criar("form");
    form.id = "ibiPersonalForm";

    const imagens = [
      ["logo", "Logo da igreja"],
      ["banner", "Imagem de fundo da página inicial"],
      ...ministerios.map(
        ([chave, nome]) => [
          chave,
          "Foto do ministério: " + nome
        ]
      )
    ];

    imagens.forEach(([chave, nome]) => {
      const input = criar("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.dataset.chave = chave;

      form.append(campo(nome, input));
    });

    const textos = [
      ["titulo", "Título principal"],
      ["subtitulo", "Mensagem de boas-vindas"]
    ];

    textos.forEach(([chave, nome]) => {
      const input = criar("input");
      input.type = "text";
      input.maxLength =
        chave === "titulo" ? 120 : 300;
      input.dataset.chave = chave;

      form.append(campo(nome, input));
    });

    const salvar = criar(
      "button",
      "Salvar personalização"
    );
    salvar.type = "submit";
    salvar.className = "button";

    form.append(salvar);
    painel.append(form);

    // FORMULÁRIO DA GALERIA

    painel.append(
      criar("h3", "📷 Galeria de fotos")
    );

    const formGaleria = criar("form");
    formGaleria.id = "ibiGaleriaForm";

    const foto = criar("input");
    foto.type = "file";
    foto.accept = "image/png,image/jpeg,image/webp";
    foto.required = true;

    formGaleria.append(
      campo("Selecionar foto", foto)
    );

    const legenda = criar("input");
    legenda.type = "text";
    legenda.name = "legenda";
    legenda.maxLength = 180;

    formGaleria.append(
      campo("Legenda da foto", legenda)
    );

    const checkbox = criar("input");
    checkbox.type = "checkbox";
    checkbox.name = "autorizacao";
    checkbox.required = true;

    const autorizacao = criar("label");
    autorizacao.append(
      checkbox,
      document.createTextNode(
        " Confirmo que tenho autorização para publicar."
      )
    );

    formGaleria.append(autorizacao);

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
      salvarConfiguracoes
    );

    formGaleria.addEventListener(
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

    if (await verificarAdmin()) {
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
