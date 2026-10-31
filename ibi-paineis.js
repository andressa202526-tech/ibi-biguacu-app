
/*
  IBI BIGUAÇU - PAINÉIS V3
  Não altera app.js, login ou dados existentes.
*/
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);

  const estilos = document.createElement("style");
  estilos.textContent = `
    #aniversarios,
    nav [data-page="aniversarios"] {
      display: none !important;
    }

    #ibiEscolhaAcesso,
    #ibiPainelCards {
      font-family: inherit;
      margin: 22px 0;
    }

    .ibiTopoPainel {
      background: linear-gradient(125deg,#071b41,#194a83);
      border-radius: 18px;
      color: white;
      padding: 25px;
      margin-bottom: 20px;
    }

    .ibiTopoPainel h2 {
      color: white;
      margin: 8px 0;
      font-size: clamp(22px,4vw,30px);
    }

    .ibiTopoPainel p {
      color: #dce9fa;
      margin: 8px 0;
    }

    .ibiGrade {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 12px;
      margin: 18px 0;
    }

    .ibiCartao {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      background: #fff;
      color: #102a50;
      border: 1px solid #d9e3f0;
      border-radius: 15px;
      padding: 18px 14px;
      text-align: left;
      cursor: pointer;
      font: inherit;
      box-shadow: 0 4px 16px #071b410e;
      min-height: 122px;
    }

    .ibiCartao:hover,
    .ibiCartao.ativo {
      background: #eaf2ff;
      border-color: #24599d;
    }

    .ibiCartao strong {
      font-size: 15px;
    }

    .ibiCartao small {
      color: #58718f;
      font-size: 12px;
    }

    .ibiIcone {
      font-size: 25px;
      line-height: 1.2;
    }

    .ibiAba {
      background: #fff;
      color: #17304e;
      border: 1px solid #dce5f0;
      border-radius: 16px;
      padding: 20px;
      margin-top: 15px;
    }

    .ibiAba[hidden],
    #ibiEscolhaAcesso[hidden],
    #ibiPainelCards[hidden] {
      display: none !important;
    }

    .ibiAba h3 {
      margin-top: 0;
    }

    #ibiAdminConteudo #adminArea {
      border: 0;
      padding: 0;
      margin: 0;
      box-shadow: none;
    }

    #ibiAdminConteudo #adminArea[hidden] {
      display: none !important;
    }

    #ibiDevocional {
      background: linear-gradient(135deg,#eef4ff,#ffffff);
      color: #163252;
      border: 1px solid #d7e4f4;
      border-radius: 18px;
      padding: 25px;
      margin: 20px 0;
    }

    #ibiDevocional h2 {
      margin: 9px 0;
      color: #0d366b;
    }

    #ibiDevocional .ibiReferencia {
      display: inline-block;
      color: #174d87;
      font-weight: 700;
      margin: 8px 0;
    }

    #ibiDevocional p {
      line-height: 1.75;
    }

    #ibiEscolhaAcesso .ibiGrade {
      max-width: 650px;
    }

    @media (min-width: 780px) {
      #ibiPainelCards .ibiGrade {
        grid-template-columns: repeat(3,minmax(0,1fr));
      }
    }

    @media (max-width: 420px) {
      .ibiCartao {
        padding: 13px 11px;
        min-height: 112px;
      }

      .ibiAba {
        padding: 14px;
      }
    }
  `;
  document.head.appendChild(estilos);

  // NOVO NOME DO BOTÃO DE LOGIN
  const botaoEntrar = $('nav [data-page="membros"]');
  if (botaoEntrar) {
    botaoEntrar.textContent = "👤 ENTRAR";
  }

  // REMOVE APENAS O ATALHO PÚBLICO DE ANIVERSÁRIOS
  document.querySelectorAll("#inicio .tiles button")
    .forEach((botao) => {
      if (botao.textContent.includes("Aniversariantes")) {
        botao.remove();
      }
    });

  // CONEXÃO ORIGINAL DO APLICATIVO
  function cliente() {
    try {
      return typeof db !== "undefined" ? db : null;
    } catch (erro) {
      return null;
    }
  }

  function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function criarCartao(icone, titulo, descricao, acao) {
    const botao = criar("button", "ibiCartao");
    botao.type = "button";

    botao.append(
      criar("span", "ibiIcone", icone),
      criar("strong", "", titulo),
      criar("small", "", descricao)
    );

    botao.addEventListener("click", acao);
    return botao;
  }

  const secaoMembros = $("#membros");
  const authArea = $("#authArea");
  const memberArea = $("#memberArea");
  const approvedArea = $("#approvedArea");
  const adminArea = $("#adminArea");
  const profileForm = $("#profileForm");

  if (
    secaoMembros &&
    authArea &&
    memberArea &&
    approvedArea &&
    profileForm
  ) {
    // OPÇÕES ENTRAR COMO MEMBRO OU ADMINISTRADOR
    const escolha = criar("div");
    escolha.id = "ibiEscolhaAcesso";

    const escolhaTopo = criar("div", "ibiTopoPainel");
    escolhaTopo.append(
      criar("h2", "", "Bem-vindo à IBI Biguaçu"),
      criar("p", "", "Escolha como deseja entrar.")
    );

    const escolhaGrade = criar("div", "ibiGrade");

    const orientacao = criar(
      "p",
      "",
      "Use seu e-mail e sua senha cadastrados."
    );

    escolhaGrade.append(
      criarCartao(
        "👥",
        "Entrar como membro",
        "Avisos, escalas e aniversariantes",
        () => {
          sessionStorage.setItem("ibiTipoAcesso", "membro");
          orientacao.textContent =
            "Entre com seu cadastro de membro.";
        }
      ),
      criarCartao(
        "🛡️",
        "Entrar como administrador",
        "Acesso exclusivo da administração",
        () => {
          sessionStorage.setItem("ibiTipoAcesso", "admin");
          orientacao.textContent =
            "Entre com sua conta. O sistema verificará sua permissão.";
        }
      )
    );

    escolha.append(escolhaTopo, escolhaGrade, orientacao);
    authArea.parentNode.insertBefore(escolha, authArea);

    // ÁREA EXCLUSIVA APÓS CADASTRO APROVADO
    const painel = criar("div");
    painel.id = "ibiPainelCards";

    const topo = criar("div", "ibiTopoPainel");
    const saudacao = criar(
      "h2",
      "",
      "Olá, graça e paz!"
    );
    saudacao.id = "ibiSaudacaoMembro";

    topo.append(
      criar("small", "", "IBI BIGUAÇU • ÁREA EXCLUSIVA"),
      saudacao,
      criar(
        "p",
        "",
        "Somos igreja, somos família. Que bom ter você aqui!"
      )
    );

    const grade = criar("div", "ibiGrade");
    const conteudos = criar("div");

    const abas = {};

    function adicionarAba(id, titulo) {
      const aba = criar("section", "ibiAba");
      aba.id = "ibiAba_" + id;
      aba.hidden = true;
      aba.append(criar("h3", "", titulo));
      conteudos.append(aba);
      abas[id] = aba;
      return aba;
    }

    const abaAvisos = adicionarAba(
      "avisos", "📢 Avisos internos"
    );

    const abaEscalas = adicionarAba(
      "escalas", "📋 Escalas dos ministérios"
    );

    const abaAniversarios = adicionarAba(
      "aniversarios", "🎂 Aniversariantes do mês"
    );

    const abaMensagens = adicionarAba(
      "mensagens", "✉️ Minhas mensagens"
    );

    const abaPerfil = adicionarAba(
      "perfil", "👤 Meu perfil"
    );

    const abaAdmin = adicionarAba(
      "admin", "🛡️ Administração"
    );

    const listaEscalas = criar(
      "div", "", "Abra para consultar as escalas."
    );

    abaEscalas.append(listaEscalas);

    // REAPROVEITAR CONTEÚDOS ORIGINAIS
    const avisos = $("#announcements");
    const inbox = $("#inbox");
    const aniversarios = $("#birthdays");

    if (avisos) abaAvisos.append(avisos);
    if (inbox) abaMensagens.append(inbox);
    if (aniversarios) abaAniversarios.append(aniversarios);

    // O formulário mantém seus eventos e IDs originais.
    const caixaPerfil = profileForm.closest(".panel");
    if (caixaPerfil) abaPerfil.append(caixaPerfil);

    // O painel de fotos e aprovação também mantém seus IDs.
    if (adminArea) {
      const conteudoAdmin = criar("div");
      conteudoAdmin.id = "ibiAdminConteudo";
      conteudoAdmin.append(adminArea);
      abaAdmin.append(conteudoAdmin);
    }

    const botoes = [];

    function selecionarAba(id) {
      Object.keys(abas).forEach((chave) => {
        abas[chave].hidden = chave !== id;
      });

      botoes.forEach((item) => {
        item.botao.classList.toggle(
          "ativo", item.id === id
        );
      });

      if (id === "escalas") carregarEscalas();
      if (id === "aniversarios") {
        atualizarAniversarios();
      }
    }

    function adicionarBotao(icone, nome, descricao, id) {
      const botao = criarCartao(
        icone,
        nome,
        descricao,
        () => selecionarAba(id)
      );

      botoes.push({ botao, id });
      grade.append(botao);

      return botao;
    }

    adicionarBotao(
      "📢", "Avisos internos",
      "Comunicados da igreja", "avisos"
    );

    adicionarBotao(
      "📋", "Escalas",
      "Louvor, mídia, Kids e outros", "escalas"
    );

    adicionarBotao(
      "🎂", "Aniversariantes",
      "Nossa família", "aniversarios"
    );

    adicionarBotao(
      "✉️", "Minhas mensagens",
      "Recados individuais", "mensagens"
    );

    adicionarBotao(
      "👤", "Meu perfil",
      "Meus dados e cadastro", "perfil"
    );

    const botaoAdmin = adicionarBotao(
      "🛡️", "Administração",
      "Membros, fotos, avisos e eventos", "admin"
    );

    botaoAdmin.hidden = true;

    painel.append(topo, grade, conteudos);
    approvedArea.prepend(painel);

    selecionarAba("avisos");

    // BUSCAR O NOME E PERMISSÃO DO MEMBRO
    let ultimaPessoa = "";
    let verificando = false;

    async function atualizarPainel() {
      escolha.hidden = !memberArea.hidden;

      if (
        memberArea.hidden ||
        approvedArea.hidden ||
        verificando
      ) return;

      const api = cliente();
      if (!api) return;

      verificando = true;

      try {
        const { data: auth } = await api.auth.getUser();
        const pessoa = auth?.user;

        if (!pessoa) return;

        const { data: perfil, error } = await api
          .from("profiles")
          .select("display_name,role,approved")
          .eq("id", pessoa.id)
          .maybeSingle();

        if (error || !perfil?.approved) {
          painel.hidden = true;
          botaoAdmin.hidden = true;
          return;
        }

        painel.hidden = false;

        const nome =
          perfil.display_name ||
          pessoa.user_metadata?.display_name ||
          "";

        const primeiroNome =
          nome.trim().split(/\s+/)[0];

        saudacao.textContent = primeiroNome
          ? "Olá, graça e paz, " + primeiroNome + "!"
          : "Olá, graça e paz!";

        const eAdmin = perfil.role === "admin";

        botaoAdmin.hidden = !eAdmin;

        if (!eAdmin && !abas.admin.hidden) {
          selecionarAba("avisos");
        }

        if (pessoa.id !== ultimaPessoa) {
          ultimaPessoa = pessoa.id;

          if (
            eAdmin &&
            sessionStorage.getItem("ibiTipoAcesso") === "admin"
          ) {
            selecionarAba("admin");
          } else {
            selecionarAba("avisos");
          }
        }

      } catch (erro) {
        console.warn("Painel IBI:", erro);
      } finally {
        verificando = false;
      }
    }

    // ANIVERSÁRIOS SOMENTE APÓS APROVAÇÃO
    async function atualizarAniversarios() {
      if (
        approvedArea.hidden ||
        memberArea.hidden ||
        !cliente()
      ) return;

      try {
        const { data, error } = await cliente()
          .rpc("month_birthdays");

        if (error) throw error;

        if (!aniversarios) return;

        aniversarios.replaceChildren();

        if (!data?.length) {
          aniversarios.textContent =
            "Nenhum aniversariante autorizado neste mês.";
          return;
        }

        data.forEach((pessoa) => {
          const dia = String(
            pessoa.birth_day
          ).padStart(2, "0");

          const mes = String(
            pessoa.birth_month
          ).padStart(2, "0");

          const linha = criar("div", "panel");

          linha.append(
            criar(
              "strong",
              "",
              dia + "/" + mes + " — " +
              pessoa.display_name
            ),
            criar(
              "p",
              "",
              "Que Deus abençoe sua vida!"
            )
          );

          aniversarios.append(linha);
        });

      } catch (erro) {
        console.warn("Aniversários:", erro);
      }
    }

    // ESCALAS JÁ CRIADAS NO SUPABASE
    async function carregarEscalas() {
      if (
        approvedArea.hidden ||
        memberArea.hidden
      ) return;

      const api = cliente();
      if (!api) return;

      listaEscalas.textContent = "Carregando escalas...";

      try {
        const { data, error } = await api
          .from("ibi_escalas")
          .select(
            "ministerio,titulo,data_escala,detalhes"
          )
          .order("data_escala", {
            ascending: true
          })
          .limit(100);

        if (error) throw error;

        listaEscalas.replaceChildren();

        if (!data?.length) {
          listaEscalas.textContent =
            "Nenhuma escala publicada ainda.";
          return;
        }

        data.forEach((escala) => {
          const caixa = criar("div", "panel");

          caixa.append(
            criar(
              "strong",
              "",
              escala.ministerio + " — " +
              escala.titulo
            ),
            criar(
              "p",
              "",
              "Data: " + escala.data_escala
            ),
            criar(
              "p",
              "",
              escala.detalhes || ""
            )
          );

          listaEscalas.append(caixa);
        });

      } catch (erro) {
        listaEscalas.textContent =
          "Não foi possível carregar as escalas.";
        console.warn("Escalas:", erro);
      }
    }

    // ATUALIZAR APÓS LOGIN OU APROVAÇÃO
    const observador = new MutationObserver(() => {
      atualizarPainel();
    });

    [memberArea, approvedArea].forEach((area) => {
      observador.observe(area, {
        attributes: true,
        attributeFilter: ["hidden"]
      });
    });

    const api = cliente();

    if (api) {
      api.auth.onAuthStateChange(() => {
        ultimaPessoa = "";
        setTimeout(atualizarPainel, 300);
      });
    }

    atualizarPainel();

    // Evitar exposição visual do painel enquanto
    // a permissão ainda está sendo confirmada.
    painel.hidden = true;
    atualizarPainel();
  }

  // DEVOCIONAL DIÁRIO PÚBLICO
  const devocionais = [
    {
      ref: "Salmos 119:105",
      titulo: "Direção para o caminho",
      texto: "A Palavra de Deus ilumina nossas escolhas. Mesmo diante de dúvidas, podemos buscar nela sabedoria para caminhar."
    },
    {
      ref: "Filipenses 4:6-7",
      titulo: "Confiança em oração",
      texto: "Podemos apresentar nossas preocupações ao Senhor. A oração fortalece nossa confiança e nos ensina a viver com gratidão."
    },
    {
      ref: "Isaías 40:31",
      titulo: "Forças renovadas",
      texto: "Esperar no Senhor é continuar confiando nele. Deus nos fortalece para prosseguir, mesmo nos dias difíceis."
    },
    {
      ref: "Josué 1:9",
      titulo: "Coragem para continuar",
      texto: "A presença de Deus nos encoraja a enfrentar novos desafios com fé e perseverança."
    },
    {
      ref: "Salmos 23:1",
      titulo: "O cuidado do Pastor",
      texto: "O Senhor conhece nossas necessidades. Seu cuidado nos convida ao descanso e à confiança."
    },
    {
      ref: "Provérbios 3:5-6",
      titulo: "Confie no Senhor",
      texto: "Nem sempre compreendemos tudo. Entregar nossos caminhos a Deus é reconhecer sua sabedoria."
    },
    {
      ref: "Mateus 5:14-16",
      titulo: "Seja luz",
      texto: "Nossas atitudes podem revelar o amor de Cristo. Pequenos gestos de bondade também testemunham nossa fé."
    },
    {
      ref: "João 15:5",
      titulo: "Permanecer em Cristo",
      texto: "Nossa vida espiritual cresce quando cultivamos comunhão com Jesus e dependemos dele diariamente."
    },
    {
      ref: "Romanos 12:2",
      titulo: "Mente renovada",
      texto: "A caminhada cristã envolve transformação. Que nossos pensamentos e decisões se aproximem da vontade de Deus."
    },
    {
      ref: "Salmos 121:1-2",
      titulo: "Nosso socorro",
      texto: "Nos momentos de incerteza, lembramos que nosso socorro vem do Senhor, criador de todas as coisas."
    },
    {
      ref: "1 Pedro 5:7",
      titulo: "Deus cuida de você",
      texto: "Podemos levar nossas preocupações a Deus porque seu cuidado alcança cada parte da nossa vida."
    },
    {
      ref: "Colossenses 3:14",
      titulo: "Escolha o amor",
      texto: "O amor une e fortalece os relacionamentos. Que ele esteja presente nas palavras e atitudes de hoje."
    },
    {
      ref: "Gálatas 6:9",
      titulo: "Não desista de fazer o bem",
      texto: "A fidelidade nas pequenas atitudes importa. Continuemos servindo com perseverança."
    },
    {
      ref: "2 Timóteo 1:7",
      titulo: "Fé e equilíbrio",
      texto: "Deus nos chama a viver com coragem, amor e domínio próprio, buscando nele direção para nossas decisões."
    },
    {
      ref: "Efésios 4:32",
      titulo: "Pratique a bondade",
      texto: "A bondade e o perdão demonstram a graça que recebemos. Podemos começar hoje em nossa própria casa."
    },
    {
      ref: "Mateus 6:33",
      titulo: "Prioridades",
      texto: "Colocar o Reino de Deus em primeiro lugar nos ajuda a organizar a vida segundo aquilo que realmente importa."
    },
    {
      ref: "Tiago 1:5",
      titulo: "Peça sabedoria",
      texto: "Diante das escolhas, podemos buscar a sabedoria que vem de Deus com humildade e fé."
    },
    {
      ref: "Hebreus 10:24-25",
      titulo: "Caminhar juntos",
      texto: "A comunhão nos fortalece. Somos chamados a incentivar uns aos outros no amor e nas boas obras."
    },
    {
      ref: "Salmos 100:2",
      titulo: "Sirva com alegria",
      texto: "Servir ao Senhor é um privilégio. Que a alegria esteja presente até nas tarefas mais simples."
    },
    {
      ref: "João 13:34-35",
      titulo: "Amar como Jesus",
      texto: "O amor entre irmãos é um testemunho poderoso. Jesus nos ensinou a cuidar uns dos outros."
    },
    {
      ref: "Lamentações 3:22-23",
      titulo: "Misericórdias renovadas",
      texto: "Cada novo dia nos lembra da fidelidade e da misericórdia de Deus, que sustentam nossa caminhada."
    },
    {
      ref: "Salmos 46:1",
      titulo: "Refúgio e fortaleza",
      texto: "Nos momentos de dificuldade, Deus permanece nosso refúgio. Podemos recorrer a ele em oração."
    },
    {
      ref: "Miquéias 6:8",
      titulo: "Viva com justiça",
      texto: "A fé também se expressa em justiça, misericórdia e humildade diante do Senhor."
    },
    {
      ref: "Filipenses 1:6",
      titulo: "Deus continua trabalhando",
      texto: "O crescimento espiritual é uma caminhada. Podemos confiar na fidelidade de Deus durante o processo."
    },
    {
      ref: "Romanos 15:13",
      titulo: "Esperança que fortalece",
      texto: "A esperança em Deus nos encoraja a perseverar e a compartilhar paz com as pessoas ao redor."
    },
    {
      ref: "Salmos 37:5",
      titulo: "Entregue seus planos",
      texto: "Consagrar nossos caminhos ao Senhor é buscar sua orientação e confiar no seu cuidado."
    },
    {
      ref: "1 Tessalonicenses 5:17-18",
      titulo: "Oração e gratidão",
      texto: "Podemos cultivar uma vida de oração e gratidão, reconhecendo a presença de Deus no cotidiano."
    },
    {
      ref: "Mateus 11:28",
      titulo: "Descanso em Jesus",
      texto: "Jesus acolhe os cansados. Nele encontramos um convite à confiança e ao descanso espiritual."
    },
    {
      ref: "Isaías 43:19",
      titulo: "Novos caminhos",
      texto: "Deus pode abrir caminhos onde antes víamos apenas dificuldades. Podemos seguir com esperança."
    },
    {
      ref: "1 Coríntios 15:58",
      titulo: "Permaneça firme",
      texto: "O trabalho realizado para o Senhor tem valor. Continuemos constantes, mesmo nas pequenas responsabilidades."
    },
    {
      ref: "Salmos 126:3",
      titulo: "Gratidão pelo que Deus fez",
      texto: "Lembrar das bênçãos recebidas alimenta a gratidão e fortalece nossa confiança para o futuro."
    }
  ];

  function criarDevocional() {
    const pagina = $("#devocionais");
    if (!pagina || $("#ibiDevocional")) return;

    const local = pagina.querySelector(".container") || pagina;

    // Usa a data de Brasília para escolher a reflexão.
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const obter = (nome) => Number(
      partes.find((p) => p.type === nome)?.value
    );

    const ano = obter("year");
    const mes = obter("month");
    const dia = obter("day");

    const numeroDia = Math.floor(
      Date.UTC(ano, mes - 1, dia) / 86400000
    );

    const devocional = devocionais[
      numeroDia % devocionais.length
    ];

    const caixa = criar("article");
    caixa.id = "ibiDevocional";

    caixa.append(
      criar("small", "", "📖 PALAVRA DO DIA"),
      criar("h2", "", devocional.titulo),
      criar("span", "ibiReferencia", devocional.ref),
      criar("p", "", devocional.texto),
      criar(
        "small",
        "",
        "Reflexão diária • IBI Biguaçu"
      )
    );

    local.prepend(caixa);
  }

  criarDevocional();

})();
