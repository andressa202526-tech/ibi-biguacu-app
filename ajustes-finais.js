
/*
  IBI BIGUAÇU
  AJUSTES FINAIS - V1

  Mantém o site público e o sistema atual.
  Organiza o acesso e o devocional diário.
*/

(function () {
  "use strict";

  const $ = seletor => document.querySelector(seletor);

  // ESTILO
  const estilo = document.createElement("style");

  estilo.textContent = `
    /* Esconder título grande da tela de entrada */
    #membros > .container > h1,
    #membros > .container > .kicker {
      display: none !important;
    }

    /* Apenas a apresentação do acesso */
    #ibiEscolhaAcesso .ibiGrade {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 12px;
      max-width: 900px;
    }

    #ibiEscolhaAcesso .ibiCartao {
      min-width: 0;
      min-height: 135px;
      padding: 18px 12px;
      border-radius: 16px;
    }

    #ibiEscolhaAcesso .ibiCartao strong {
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    #ibiEscolhaAcesso .ibiCartao small {
      font-size: 12px;
    }

    #ibiEscolhaAcesso .ibiCartao.ativo {
      background: #eaf2ff;
      border-color: #1d538f;
    }

    /* Formulário do visitante */
    #ibiVisitanteForm {
      background: white;
      border: 1px solid #d6e3f0;
      border-radius: 16px;
      padding: 23px;
      margin: 20px 0;
      color: #153259;
    }

    #ibiVisitanteForm[hidden] {
      display: none !important;
    }

    #ibiVisitanteForm input {
      display: block;
      width: 100%;
      padding: 13px;
      box-sizing: border-box;
      border: 1px solid #b7c9df;
      border-radius: 9px;
      margin: 12px 0;
      font: inherit;
    }

    #ibiVisitanteForm button {
      padding: 12px 20px;
      background: #123e77;
      color: white;
      border: 0;
      border-radius: 10px;
      cursor: pointer;
    }

    /* Devocional */
    #ibiDevocional {
      max-width: 850px;
      margin: 20px 0;
      padding: 25px;
      border-radius: 18px;
      background: linear-gradient(135deg,#f0f6ff,#ffffff);
      border: 1px solid #d6e4f2;
      color: #183453;
    }

    #ibiDevocional .ibiData {
      font-size: 13px;
      color: #527092;
    }

    #ibiDevocional .ibiRef {
      display: block;
      margin: 18px 0 10px;
      font-size: clamp(21px,4vw,27px);
      font-weight: bold;
      color: #10396e;
    }

    #ibiDevocional .ibiResumo {
      font-size: 16px;
      line-height: 1.8;
      margin: 0;
    }

    #ibiDevocional .ibiTopoDev {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    @media(max-width: 550px) {
      #ibiEscolhaAcesso .ibiGrade {
        gap: 7px;
      }

      #ibiEscolhaAcesso .ibiCartao {
        min-height: 120px;
        padding: 12px 7px;
      }

      #ibiEscolhaAcesso .ibiCartao strong {
        font-size: 12px;
      }

      #ibiEscolhaAcesso .ibiCartao small {
        font-size: 10px;
      }
    }
  `;

  document.head.appendChild(estilo);

  function criar(tag, texto, classe) {
    const elemento = document.createElement(tag);

    if (texto !== undefined) {
      elemento.textContent = texto;
    }

    if (classe) elemento.className = classe;

    return elemento;
  }

  function cliente() {
    try {
      return typeof db !== "undefined" ? db : null;
    } catch {
      return null;
    }
  }

  // DATA NO HORÁRIO DE BRASÍLIA
  function dataBrasil() {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date());
  }

  // NOME DO VISITANTE, SEM CRIAR CONTA
  function mostrarNomeVisitante(nome) {
    const saudacao = $("#saudacao");

    if (saudacao && nome) {
      saudacao.textContent =
        "Olá, graça e paz, " + nome + "!";
    }
  }

  async function recuperarNomeVisitante() {
    const nome = sessionStorage.getItem(
      "ibiVisitanteNome"
    );

    if (!nome) return;

    const api = cliente();

    if (api) {
      try {
        const { data } = await api.auth.getUser();

        if (data?.user) return;
      } catch (erro) {
        console.warn("Visitante:", erro);
      }
    }

    mostrarNomeVisitante(nome);
  }

  // ENTRAR: VISITANTE / MEMBRO / ADMIN
  function configurarEntrada() {
    const escolha = $("#ibiEscolhaAcesso");
    const auth = $("#authArea");
    const membro = $("#memberArea");

    if (!escolha || !auth) return;

    const grade = escolha.querySelector(".ibiGrade");
    if (!grade) return;

    const titulo = escolha.querySelector(
      ".ibiTopoPainel h2"
    );

    if (titulo) {
      titulo.textContent = "Como deseja entrar?";
    }

    const descricao = escolha.querySelector(
      ".ibiTopoPainel p"
    );

    if (descricao) {
      descricao.textContent =
        "Escolha uma opção para continuar.";
    }

    // PRIMEIRO QUADRADO: VISITANTE
    let visitante = $("#ibiOpcaoVisitante");

    if (!visitante) {
      visitante = criar("button");
      visitante.type = "button";
      visitante.id = "ibiOpcaoVisitante";
      visitante.className = "ibiCartao";

      visitante.append(
        criar("span", "👋", "ibiIcone"),
        criar("strong", "Visitante"),
        criar("small", "Conhecer nossa igreja")
      );

      grade.prepend(visitante);
    }

    // FORMULÁRIO DO VISITANTE
    let form = $("#ibiVisitanteForm");

    if (!form) {
      form = criar("form");
      form.id = "ibiVisitanteForm";
      form.hidden = true;

      const tituloForm = criar(
        "h3",
        "Seja bem-vindo à IBI Biguaçu!"
      );

      const descricaoForm = criar(
        "p",
        "Qual é o seu primeiro nome?"
      );

      const input = criar("input");
      input.type = "text";
      input.id = "ibiNomeVisitante";
      input.placeholder = "Digite seu nome";
      input.maxLength = 50;
      input.required = true;
      input.autocomplete = "given-name";

      const botao = criar(
        "button",
        "Entrar como visitante"
      );
      botao.type = "submit";

      const observacao = criar(
        "p",
        "Não precisa de senha. Você terá acesso ao site público."
      );
      observacao.style.fontSize = "12px";

      form.append(
        tituloForm,
        descricaoForm,
        input,
        botao,
        observacao
      );

      escolha.insertAdjacentElement(
        "afterend",
        form
      );

      form.addEventListener("submit", evento => {
        evento.preventDefault();

        const nomeCompleto = input.value.trim();

        if (!nomeCompleto) return;

        const primeiroNome =
          nomeCompleto.split(/\s+/)[0];

        sessionStorage.setItem(
          "ibiVisitanteNome",
          primeiroNome
        );

        mostrarNomeVisitante(primeiroNome);

        const inicio = document.querySelector(
          'nav [data-page="inicio"]'
        );

        if (inicio) inicio.click();

        mostrarNomeVisitante(primeiroNome);

        window.scrollTo(0, 0);
      });
    }

    // MEMBRO E ADMIN USAM O LOGIN ORIGINAL
    visitante.addEventListener("click", () => {
      form.hidden = false;

      if (!membro || membro.hidden) {
        auth.hidden = true;
      }

      grade.querySelectorAll(".ibiCartao")
        .forEach(botao => {
          botao.classList.toggle(
            "ativo",
            botao === visitante
          );
        });
    });

    grade.querySelectorAll(".ibiCartao")
      .forEach(botao => {
        if (botao === visitante) return;

        botao.addEventListener("click", () => {
          form.hidden = true;
          auth.hidden = false;

          grade.querySelectorAll(".ibiCartao")
            .forEach(item => {
              item.classList.toggle(
                "ativo",
                item === botao
              );
            });
        });
      });

    // Oculta o login até uma escolha, apenas
    // para quem ainda não está autenticado.
    if (!membro || membro.hidden) {
      auth.hidden = true;
    }

    recuperarNomeVisitante();
  }

  // DEVOCIONAL: APENAS DATA, REFERÊNCIA E RESUMO
  function configurarDevocional() {
    const caixa = $("#ibiDevocional");
    if (!caixa) return;

    const referencia =
      caixa.querySelector(".ibiReferencia") ||
      caixa.querySelector(".ibiRef") ||
      caixa.querySelector("h2");

    const resumo =
      caixa.querySelector(".ibiResumo") ||
      caixa.querySelector("p");

    if (!referencia || !resumo) return;

    const textoReferencia =
      referencia.textContent.trim();

    const textoResumo =
      resumo.textContent.trim();

    if (!textoReferencia || !textoResumo) return;

    caixa.replaceChildren();

    const topo = criar("div", undefined, "ibiTopoDev");

    const titulo = criar(
      "strong",
      "📖 Devocional do Dia"
    );

    const data = criar(
      "span",
      dataBrasil(),
      "ibiData"
    );
    data.id = "ibiDataDevocional";

    topo.append(titulo, data);

    const ref = criar(
      "span",
      textoReferencia,
      "ibiRef"
    );

    const reflexao = criar(
      "p",
      textoResumo,
      "ibiResumo"
    );

    caixa.append(topo, ref, reflexao);

    // Esconde somente o aviso antigo
    // de "Em breve", preservando a página.
    const pagina = $("#devocionais");

    if (pagina) {
      pagina.querySelectorAll(".panel")
        .forEach(painel => {
          if (
            painel.textContent.includes(
              "Novos devocionais serão publicados"
            )
          ) {
            painel.hidden = true;
          }
        });
    }
  }

  // INICIALIZAÇÃO
  function iniciar() {
    const entrar = document.querySelector(
      'nav [data-page="membros"]'
    );

    if (entrar) {
      entrar.textContent = "👤 ENTRAR";
    }

    configurarEntrada();
    configurarDevocional();

    // Verifica periodicamente a virada do dia.
    // Se mudar a data, recarrega o devocional.
    let ultimaData = dataBrasil();

    setInterval(() => {
      const hoje = dataBrasil();

      if (hoje !== ultimaData) {
        ultimaData = hoje;

        // Evita interromper quem estiver
        // preenchendo algum formulário.
        if (
          document.getElementById("devocionais")
            ?.classList.contains("active")
        ) {
          window.location.reload();
        }
      }
    }, 60000);

    // Recupera a saudação de visitante se
    // retornar à página inicial.
    if (entrar) {
      document.querySelectorAll(
        'nav [data-page="inicio"]'
      ).forEach(botao => {
        botao.addEventListener(
          "click",
          recuperarNomeVisitante
        );
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );
  } else {
    iniciar();
  }

})();
