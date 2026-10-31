
/*
  IBI BIGUAÇU - AJUSTES FINAIS V3
  Visitante, Membro e Administrador.
  Solicitar cadastro somente em Visitante.
  Devocional diário com data.
*/
(function () {
  "use strict";

  const $ = s => document.querySelector(s);

  const estilo = document.createElement("style");
  estilo.textContent = `
    #membros > .container > h1,
    #membros > .container > .kicker {
      display: none !important;
    }

    #ibiEscolhaAcesso .ibiGrade {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 10px;
      max-width: 900px;
    }

    #ibiEscolhaAcesso .ibiCartao {
      min-width: 0;
      min-height: 125px;
      border-radius: 16px;
      padding: 15px 10px;
    }

    #ibiEscolhaAcesso .ibiCartao strong {
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    #ibiEscolhaAcesso .ibiCartao small {
      font-size: 11px;
    }

    #ibiEscolhaAcesso .ibiCartao.ativo {
      background: #eaf2ff;
      border-color: #24599d;
    }

    #ibiVisitanteForm,
    #ibiCadastroVisitante {
      background: #fff;
      color: #153259;
      border: 1px solid #d8e4f2;
      border-radius: 16px;
      padding: 22px;
      margin: 16px 0;
    }

    #ibiVisitanteForm[hidden],
    #ibiCadastroVisitante[hidden],
    #authArea[hidden] {
      display: none !important;
    }

    #ibiVisitanteForm input {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #c4d3e5;
      border-radius: 9px;
      margin: 12px 0;
      font: inherit;
    }

    #ibiVisitanteForm button {
      background: #123e77;
      color: white;
      padding: 12px 18px;
      border: 0;
      border-radius: 10px;
      cursor: pointer;
    }

    #ibiCadastroVisitante > .panel {
      margin: 0;
      border: 0;
      box-shadow: none;
      padding: 0;
    }

    #ibiDevocional {
      max-width: 850px;
      padding: 24px;
      background: linear-gradient(135deg,#eef5ff,#fff);
      border: 1px solid #d6e4f2;
      border-radius: 18px;
      color: #173456;
    }

    #ibiDevocional .ibiTopoDev {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    #ibiDevocional .ibiRef {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #123d72;
      margin: 20px 0 12px;
    }

    #ibiDevocional .ibiResumo {
      line-height: 1.8;
      font-size: 16px;
    }

    #ibiDevocional .ibiData {
      font-size: 13px;
      color: #55718c;
    }

    @media(max-width:500px) {
      #ibiEscolhaAcesso .ibiGrade {
        gap: 6px;
      }

      #ibiEscolhaAcesso .ibiCartao {
        min-height: 112px;
        padding: 11px 6px;
      }

      #ibiEscolhaAcesso .ibiCartao strong {
        font-size: 11px;
      }

      #ibiEscolhaAcesso .ibiCartao small {
        font-size: 10px;
      }
    }
  `;
  document.head.append(estilo);

  function dataBrasil() {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date());
  }

  function cliente() {
    try {
      return typeof db !== "undefined" ? db : null;
    } catch {
      return null;
    }
  }

  function saudacao(nome) {
    const el = $("#saudacao");
    if (el && nome) {
      el.textContent = "Olá, graça e paz, " + nome + "!";
    }
  }

  async function recuperarVisitante() {
    const nome = sessionStorage.getItem("ibiVisitanteNome");
    if (!nome) return;

    const api = cliente();

    try {
      if (api) {
        const { data } = await api.auth.getUser();
        if (data?.user) return;
      }
      saudacao(nome);
    } catch (erro) {
      console.warn("Saudação:", erro);
    }
  }

  function configurarEntrada() {
    const escolha = $("#ibiEscolhaAcesso");
    const grade = escolha?.querySelector(".ibiGrade");
    const auth = $("#authArea");
    const membro = $("#memberArea");

    if (!escolha || !grade || !auth) return;

    const titulo = escolha.querySelector(".ibiTopoPainel h2");
    const descricao = escolha.querySelector(".ibiTopoPainel p");

    if (titulo) titulo.textContent = "Como deseja entrar?";
    if (descricao) {
      descricao.textContent = "Escolha uma opção para continuar.";
    }

    let visitante = $("#ibiOpcaoVisitante");

    if (!visitante) {
      visitante = document.createElement("button");
      visitante.type = "button";
      visitante.id = "ibiOpcaoVisitante";
      visitante.className = "ibiCartao";

      const icone = document.createElement("span");
      icone.className = "ibiIcone";
      icone.textContent = "👋";

      const nome = document.createElement("strong");
      nome.textContent = "Visitante";

      const explicacao = document.createElement("small");
      explicacao.textContent = "Conhecer a igreja";

      visitante.append(icone, nome, explicacao);
      grade.prepend(visitante);
    }

    // FORMULÁRIO SIMPLES DE VISITANTE
    let form = $("#ibiVisitanteForm");

    if (!form) {
      form = document.createElement("form");
      form.id = "ibiVisitanteForm";

      form.innerHTML = `
        <h3>Seja bem-vindo à IBI Biguaçu!</h3>
        <p>Como podemos chamar você?</p>
        <label for="ibiNomeVisitante">Seu primeiro nome</label>
        <input
          id="ibiNomeVisitante"
          type="text"
          maxlength="50"
          autocomplete="given-name"
          placeholder="Digite seu nome"
          required
        >
        <button type="submit">
          Entrar como visitante
        </button>
        <p style="font-size:12px;margin-top:12px">
          Sem senha. Acesso somente ao site público.
        </p>
      `;

      escolha.after(form);

      form.addEventListener("submit", evento => {
        evento.preventDefault();

        const nome = $("#ibiNomeVisitante")
          ?.value.trim().split(/\s+/)[0];

        if (!nome) return;

        sessionStorage.setItem("ibiVisitanteNome", nome);
        saudacao(nome);

        const inicio = $('nav [data-page="inicio"]');
        if (inicio) inicio.click();

        saudacao(nome);
        window.scrollTo(0, 0);
      });
    }

    // ÁREA SEPARADA PARA SOLICITAR CADASTRO
    let areaCadastro = $("#ibiCadastroVisitante");

    if (!areaCadastro) {
      areaCadastro = document.createElement("div");
      areaCadastro.id = "ibiCadastroVisitante";
      areaCadastro.hidden = true;
      form.after(areaCadastro);
    }

    // IMPORTANTE:
    // O formulário de cadastro original é movido inteiro.
    // Não colocamos um formulário dentro de outro.
    function moverCadastroOriginal() {
      const signup = auth.querySelector("#signupForm");

      if (!signup) return;

      const painelCadastro = signup.closest(".panel");
      if (!painelCadastro) return;

      if (painelCadastro.parentElement !== areaCadastro) {
        areaCadastro.append(painelCadastro);
      }
    }

    // O app.js pode reconstruir os formulários
    // depois do login ou de uma solicitação.
    let agendado = false;

    const observador = new MutationObserver(() => {
      if (agendado) return;

      agendado = true;

      queueMicrotask(() => {
        agendado = false;
        moverCadastroOriginal();
      });
    });

    observador.observe(auth, {
      childList: true,
      subtree: true
    });

    moverCadastroOriginal();

    const orientacao = escolha.querySelector(
      ".ibiTopoPainel + .ibiGrade + p"
    );

    function escolher(botao, tipo) {
      grade.querySelectorAll(".ibiCartao").forEach(item => {
        item.classList.toggle("ativo", item === botao);
      });

      const eVisitante = tipo === "visitante";

      form.hidden = !eVisitante;
      areaCadastro.hidden = !eVisitante;

      // Login somente para Membro ou Administrador.
      if (!membro || membro.hidden) {
        auth.hidden = eVisitante;
      }

      if (orientacao) {
        orientacao.textContent = eVisitante
          ? "Conheça a igreja ou solicite seu cadastro."
          : "Use seu e-mail e senha cadastrados.";
      }

      if (!eVisitante) {
        sessionStorage.setItem("ibiTipoAcesso", tipo);
      }
    }

    visitante.addEventListener("click", () => {
      escolher(visitante, "visitante");
    });

    grade.querySelectorAll(".ibiCartao").forEach(botao => {
      if (botao === visitante) return;

      const texto = botao.textContent.toLowerCase();
      const tipo = texto.includes("administrador")
        ? "admin"
        : "membro";

      botao.addEventListener("click", () => {
        escolher(botao, tipo);
      });
    });

    // Na primeira visita, mostra só os 3 cartões.
    form.hidden = true;
    areaCadastro.hidden = true;

    if (!membro || membro.hidden) {
      auth.hidden = true;
    }

    recuperarVisitante();
  }

  // DEVOCIONAL: DATA + REFERÊNCIA + RESUMO
  function configurarDevocional() {
    const caixa = $("#ibiDevocional");
    if (!caixa) return;

    const referencia = caixa.querySelector(
      ".ibiReferencia, .ibiRef"
    );

    const resumo = caixa.querySelector("p");

    if (!referencia || !resumo) return;

    const textoRef = referencia.textContent.trim();
    const textoResumo = resumo.textContent.trim();

    if (!textoRef || !textoResumo) return;

    caixa.replaceChildren();

    const topo = document.createElement("div");
    topo.className = "ibiTopoDev";

    const titulo = document.createElement("strong");
    titulo.textContent = "📖 Devocional do Dia";

    const data = document.createElement("span");
    data.className = "ibiData";
    data.textContent = dataBrasil();

    topo.append(titulo, data);

    const ref = document.createElement("span");
    ref.className = "ibiRef";
    ref.textContent = textoRef;

    const reflexao = document.createElement("p");
    reflexao.className = "ibiResumo";
    reflexao.textContent = textoResumo;

    caixa.append(topo, ref, reflexao);

    $("#devocionais")?.querySelectorAll(".panel")
      .forEach(painel => {
        if (painel.textContent.includes(
          "Novos devocionais serão publicados"
        )) {
          painel.hidden = true;
        }
      });
  }

  function iniciar() {
    const entrar = $('nav [data-page="membros"]');

    if (entrar) entrar.textContent = "👤 ENTRAR";

    configurarEntrada();
    configurarDevocional();

    document.querySelectorAll(
      'nav [data-page="inicio"]'
    ).forEach(botao => {
      botao.addEventListener("click", recuperarVisitante);
    });

    let diaAnterior = dataBrasil();

    setInterval(() => {
      const diaAtual = dataBrasil();

      if (diaAtual !== diaAnterior) {
        diaAnterior = diaAtual;

        // Só atualiza a página automaticamente
        // se a pessoa estiver lendo o devocional.
        if ($("#devocionais")?.classList.contains("active")) {
          location.reload();
        }
      }
    }, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
