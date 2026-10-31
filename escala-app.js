
/* IBI BIGUAÇU - ESCALAS V1 */
(function () {
  "use strict";

  const ministerios = {
    igreja_geral: "Igreja Geral",
    midia: "Mídia",
    infantil: "Infantil",
    jovens: "Jovens (Elcana)",
    louvor: "Louvor",
    limpeza: "Limpeza",
    direcao: "Direção",
    pregacao: "Pregação"
  };

  const $ = s => document.querySelector(s);

  function novo(tag, texto, classe) {
    const e = document.createElement(tag);
    if (texto !== undefined) e.textContent = texto;
    if (classe) e.className = classe;
    return e;
  }

  function cliente() {
    try {
      return typeof db !== "undefined" ? db : null;
    } catch {
      return null;
    }
  }

  const estilo = novo("style");

  estilo.textContent = `
    .ibEscGrid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin:14px 0;
    }

    .ibEscCard {
      padding:16px;
      border:1px solid #cbd9ea;
      border-radius:14px;
      background:white;
      color:#173e75;
      text-align:left;
      cursor:pointer;
      font:inherit;
    }

    .ibEscCard[aria-pressed="true"] {
      background:#e8f1ff;
      border-color:#20518c;
    }

    .ibEscCard b {
      display:block;
      margin-bottom:5px;
    }

    .ibEscPanel {
      padding:17px;
      margin:14px 0;
      border:1px solid #d6e3f1;
      background:white;
      border-radius:15px;
      color:#17304d;
    }

    .ibEscPanel input,
    .ibEscPanel select,
    .ibEscPanel textarea {
      display:block;
      width:100%;
      padding:10px;
      border:1px solid #c2d2e5;
      border-radius:8px;
      margin:7px 0 13px;
      box-sizing:border-box;
      font:inherit;
    }

    .ibEscPanel label {
      display:block;
      font-size:14px;
      margin-top:10px;
    }

    .ibEscPanel input[type=checkbox] {
      width:auto;
      display:inline;
      margin:0 8px 0 0;
    }

    .ibEscBtn {
      background:#103f77;
      color:white;
      border:0;
      border-radius:8px;
      padding:11px 14px;
      cursor:pointer;
      font:inherit;
      margin:5px 5px 5px 0;
    }

    .ibEscBtn.secondary {
      background:#e5eef9;
      color:#173f75;
    }

    .ibEscPessoas {
      max-height:160px;
      overflow:auto;
      padding:9px;
      border:1px solid #cbd9ea;
      border-radius:9px;
    }

    .ibEscPessoas label {
      margin:5px 0;
    }

    .ibEscFoto {
      max-width:100%;
      max-height:330px;
      border-radius:10px;
      display:block;
      margin:10px 0;
    }

    @media(min-width:760px) {
      .ibEscGrid {
        grid-template-columns:repeat(4,minmax(0,1fr));
      }
    }
  `;

  document.head.append(estilo);

  let api;
  let usuario;
  let administrador = false;
  let meusMinisterios = [];
  let membros = [];
  let selecionado = "midia";
  let painel;
  let lista;
  let editor;
  let contato;
  let gestao;
  let mensagem;
  let carregando = false;

  function campo(nome, entrada) {
    const label = novo("label", nome);
    label.append(entrada);
    return label;
  }

  function entrada(tipo, nome, obrigatorio) {
    const e = novo("input");
    e.type = tipo;
    e.name = nome;
    e.required = !!obrigatorio;
    return e;
  }

  function aviso(texto, erro = false) {
    if (!mensagem) return;

    mensagem.textContent = texto;
    mensagem.style.color =
      erro ? "#b42330" : "#17683e";
  }

  async function verificarAcesso() {
    api = cliente();
    if (!api) return false;

    const { data: auth } = await api.auth.getUser();
    usuario = auth?.user;

    if (!usuario) return false;

    const { data, error } = await api.rpc(
      "ibi_escala_membro_aprovado"
    );

    if (error) {
      console.error(error);
      return false;
    }

    return data === true;
  }

  async function preparar() {
    if (carregando) return;

    carregando = true;

    try {
      if (!(await verificarAcesso())) return;

      const { data: admin } = await api.rpc(
        "ibi_escala_admin"
      );

      administrador = admin === true;

      const { data: gestores, error } = await api
        .from("ibi_escala_gestores")
        .select("ministerio");

      if (error) throw error;

      meusMinisterios = administrador
        ? Object.keys(ministerios)
        : [...new Set(
            (gestores || []).map(g => g.ministerio)
          )];

      if (meusMinisterios.length) {
        const resposta = await api.rpc(
          "ibi_escala_lista_membros"
        );

        if (resposta.error) throw resposta.error;
        membros = resposta.data || [];
      }

      montarPainel();

      await Promise.all([
        listarEscalas(),
        carregarContato()
      ]);

      if (administrador) {
        await carregarGestores();
      }

    } catch (erro) {
      console.error(erro);
      aviso("Erro: " + erro.message, true);

    } finally {
      carregando = false;
    }
  }

  function montarPainel() {
    if (painel) return;

    const alvo = $("#ibiAba_escalas");
    if (!alvo) return;

    alvo.replaceChildren();
    painel = alvo;

    alvo.append(
      novo("h3", "📅 Escalas dos Ministérios")
    );

    alvo.append(
      novo(
        "p",
        "Todos os membros aprovados podem consultar. " +
        "Somente responsáveis autorizados podem publicar."
      )
    );

    const grade = novo("div", undefined, "ibEscGrid");

    Object.entries(ministerios).forEach(([id, nome]) => {
      const botao = novo(
        "button",
        undefined,
        "ibEscCard"
      );

      botao.type = "button";
      botao.dataset.ministerio = id;
      botao.setAttribute(
        "aria-pressed",
        String(id === selecionado)
      );

      botao.append(
        novo("b", nome),
        novo("small", "Ver escalas")
      );

      botao.onclick = () => {
        selecionado = id;

        grade.querySelectorAll("button")
          .forEach(b => b.setAttribute(
            "aria-pressed",
            String(b === botao)
          ));

        listarEscalas();
        mostrarEditor();
      };

      grade.append(botao);
    });

    alvo.append(grade);

    mensagem = novo("p");
    mensagem.setAttribute("role", "status");
    alvo.append(mensagem);

    lista = novo("div");
    editor = novo("div");
    contato = novo("div");
    gestao = novo("div");

    alvo.append(lista, editor, contato, gestao);

    mostrarEditor();
    montarContato();

    if (administrador) {
      montarGestores();
    }
  }

  function mostrarEditor() {
    if (!editor) return;

    editor.replaceChildren();

    // Membro comum apenas visualiza.
    if (!meusMinisterios.includes(selecionado)) {
      return;
    }

    const caixa = novo(
      "section",
      undefined,
      "ibEscPanel"
    );

    caixa.append(
      novo(
        "h3",
        "Publicar escala — " + ministerios[selecionado]
      )
    );

    const formulario = novo("form");

    const titulo = entrada("text", "titulo", true);
    titulo.maxLength = 120;

    const funcao = entrada("text", "funcao", false);
    funcao.maxLength = 100;
    funcao.placeholder =
      "Ex.: Fotos, Stories, Louvor...";

    const data = entrada("date", "data_escala", true);
    const hora = entrada("time", "hora_escala", false);

    const detalhes = novo("textarea");
    detalhes.name = "detalhes";
    detalhes.rows = 3;
    detalhes.placeholder =
      "Orientações e informações da escala";

    const imagem = entrada("file", "imagem", false);
    imagem.accept =
      "image/png,image/jpeg,image/webp";

    formulario.append(
      campo("Título", titulo),
      campo("Função", funcao),
      campo("Data", data),
      campo("Horário", hora),
      campo("Observações", detalhes),
      campo("Imagem da escala (até 5 MB)", imagem),
      novo("strong", "Pessoas escaladas (opcional)")
    );

    const pessoas = novo(
      "div",
      undefined,
      "ibEscPessoas"
    );

    membros.forEach(m => {
      const label = novo("label");
      const check = entrada(
        "checkbox",
        "pessoa",
        false
      );

      check.value = m.id;

      label.append(
        check,
        document.createTextNode(m.nome || "Membro")
      );

      pessoas.append(label);
    });

    if (!membros.length) {
      pessoas.append(
        novo("small", "Nenhum membro disponível.")
      );
    }

    formulario.append(pessoas);

    const salvar = novo(
      "button",
      "Publicar escala",
      "ibEscBtn"
    );

    salvar.type = "submit";
    formulario.append(salvar);

    formulario.onsubmit = async evento => {
      evento.preventDefault();

      salvar.disabled = true;
      aviso("Salvando escala...");

      let caminho = null;

      try {
        const arquivo = imagem.files[0];

        if (arquivo) {
          if (
            ![
              "image/jpeg",
              "image/png",
              "image/webp"
            ].includes(arquivo.type) ||
            arquivo.size > 5242880
          ) {
            throw new Error(
              "Use uma imagem JPG, PNG ou WebP " +
              "de até 5 MB."
            );
          }

          const extensao =
            arquivo.type === "image/png"
              ? "png"
              : arquivo.type === "image/webp"
                ? "webp"
                : "jpg";

          caminho =
            selecionado + "/" +
            crypto.randomUUID() + "." +
            extensao;

          const envio = await api.storage
            .from("ibi-escalas")
            .upload(caminho, arquivo, {
              contentType: arquivo.type
            });

          if (envio.error) throw envio.error;
        }

        const resultado = await api
          .from("ibi_escalas")
          .insert({
            ministerio: selecionado,
            titulo: titulo.value.trim(),
            funcao: funcao.value.trim(),
            data_escala: data.value,
            hora_escala: hora.value || null,
            detalhes: detalhes.value.trim(),
            imagem_caminho: caminho
          })
          .select("id")
          .single();

        if (resultado.error) throw resultado.error;

        const escala = resultado.data;

        const ids = [
          ...pessoas.querySelectorAll("input:checked")
        ].map(c => c.value);

        const participantes = ids.map(id => ({
          escala_id: escala.id,
          membro_id: id,
          nome: membros.find(m => m.id === id)
            ?.nome || "Membro"
        }));

        if (participantes.length) {
          const r = await api
            .from("ibi_escala_participantes")
            .insert(participantes);

          if (r.error) {
            await api.from("ibi_escalas")
              .delete()
              .eq("id", escala.id);

            throw r.error;
          }
        }

        formulario.reset();
        aviso("Escala publicada com sucesso!");

        await listarEscalas();

      } catch (erro) {
        console.error(erro);
        aviso("Erro: " + erro.message, true);

        if (caminho) {
          await api.storage
            .from("ibi-escalas")
            .remove([caminho]);
        }

      } finally {
        salvar.disabled = false;
      }
    };

    caixa.append(formulario);
    editor.append(caixa);
  }

  async function listarEscalas() {
    if (!lista) return;
    if (!(await verificarAcesso())) return;

    lista.replaceChildren(
      novo("p", "Carregando escalas...")
    );

    try {
      const resposta = await api
        .from("ibi_escalas")
        .select(
          "id,ministerio,titulo,funcao," +
          "data_escala,hora_escala,detalhes," +
          "imagem_caminho," +
          "ibi_escala_participantes(nome,membro_id)"
        )
        .eq("ministerio", selecionado)
        .order("data_escala", {
          ascending: true
        });

      if (resposta.error) throw resposta.error;

      lista.replaceChildren();

      if (!resposta.data?.length) {
        lista.append(
          novo(
            "p",
            "Ainda não há escalas deste ministério."
          )
        );
        return;
      }

      for (const escala of resposta.data) {
        const caixa = novo(
          "article",
          undefined,
          "ibEscPanel"
        );

        caixa.append(
          novo("h4", escala.titulo)
        );

        const dataBR = escala.data_escala
          ?.split("-")
          .reverse()
          .join("/") || "";

        const hora = escala.hora_escala
          ? " • " + escala.hora_escala.slice(0, 5)
          : "";

        caixa.append(
          novo("p", "📅 " + dataBR + hora)
        );

        if (escala.funcao) {
          caixa.append(
            novo("p", "Função: " + escala.funcao)
          );
        }

        if (escala.detalhes) {
          caixa.append(
            novo("p", escala.detalhes)
          );
        }

        const nomes = (
          escala.ibi_escala_participantes || []
        ).map(p => p.nome).join(", ");

        if (nomes) {
          caixa.append(
            novo("p", "Escalados: " + nomes)
          );
        }

        if (escala.imagem_caminho) {
          const respostaImagem = await api.storage
            .from("ibi-escalas")
            .createSignedUrl(
              escala.imagem_caminho,
              600
            );

          if (
            !respostaImagem.error &&
            respostaImagem.data?.signedUrl
          ) {
            const endereco =
              respostaImagem.data.signedUrl;

            const foto = novo("img");
            foto.className = "ibEscFoto";
            foto.src = endereco;
            foto.alt =
              "Imagem da escala: " + escala.titulo;
            foto.loading = "lazy";

            caixa.append(foto);

            const ver = novo(
              "a",
              "Abrir imagem",
              "ibEscBtn"
            );

            ver.href = endereco;
            ver.target = "_blank";
            ver.rel = "noopener noreferrer";
            ver.style.display = "inline-block";

            caixa.append(ver);
          }
        }

        if (meusMinisterios.includes(selecionado)) {
          const excluir = novo(
            "button",
            "Excluir escala",
            "ibEscBtn secondary"
          );

          excluir.type = "button";

          excluir.onclick = async () => {
            if (!confirm(
              "Tem certeza que deseja excluir esta escala?"
            )) return;

            const r = await api
              .from("ibi_escalas")
              .delete()
              .eq("id", escala.id);

            if (r.error) {
              aviso(r.error.message, true);
              return;
            }

            if (escala.imagem_caminho) {
              await api.storage
                .from("ibi-escalas")
                .remove([escala.imagem_caminho]);
            }

            aviso("Escala excluída.");
            listarEscalas();
          };

          caixa.append(excluir);
        }

        lista.append(caixa);
      }

    } catch (erro) {
      lista.replaceChildren(
        novo(
          "p",
          "Erro ao abrir escalas: " + erro.message
        )
      );
    }
  }

  // PREFERÊNCIAS DE WHATSAPP
  function montarContato() {
    const caixa = novo(
      "section",
      undefined,
      "ibEscPanel"
    );

    caixa.append(
      novo("h3", "📱 Lembretes pelo WhatsApp")
    );

    caixa.append(
      novo(
        "p",
        "Cadastre seu número e autorize os " +
        "lembretes. O envio automático ainda " +
        "precisa ser conectado ao WhatsApp oficial."
      )
    );

    const formulario = novo("form");
    formulario.id = "ibiWhatsappEscala";

    const telefone = entrada(
      "tel",
      "telefone",
      true
    );

    telefone.placeholder = "5548999999999";
    telefone.inputMode = "numeric";

    const check = entrada(
      "checkbox",
      "autorizado",
      false
    );

    const label = novo("label");

    label.append(
      check,
      document.createTextNode(
        " Autorizo receber lembretes " +
        "das minhas escalas."
      )
    );

    const salvar = novo(
      "button",
      "Salvar preferência",
      "ibEscBtn"
    );

    salvar.type = "submit";

    formulario.append(
      campo(
        "WhatsApp com 55 + DDD + número",
        telefone
      ),
      label,
      salvar
    );

    caixa.append(formulario);
    contato.append(caixa);

    formulario.onsubmit = async evento => {
      evento.preventDefault();
      salvar.disabled = true;

      try {
        const numero = telefone.value.replace(
          /\D/g,
          ""
        );

        if (!/^55\d{10,11}$/.test(numero)) {
          throw new Error(
            "Informe 55 + DDD + número."
          );
        }

        const r = await api
          .from("ibi_escala_whatsapp")
          .upsert({
            membro_id: usuario.id,
            telefone: numero,
            autorizado: check.checked,
            atualizado_em:
              new Date().toISOString()
          });

        if (r.error) throw r.error;

        aviso("Preferência salva!");

      } catch (erro) {
        aviso(erro.message, true);

      } finally {
        salvar.disabled = false;
      }
    };
  }

  async function carregarContato() {
    if (!contato || !usuario) return;

    const { data } = await api
      .from("ibi_escala_whatsapp")
      .select("telefone,autorizado")
      .eq("membro_id", usuario.id)
      .maybeSingle();

    const formulario = $("#ibiWhatsappEscala");

    if (data && formulario) {
      formulario.elements.telefone.value =
        data.telefone;

      formulario.elements.autorizado.checked =
        data.autorizado;
    }
  }

  // ADMINISTRADOR DEFINE RESPONSÁVEIS
  function montarGestores() {
    const caixa = novo(
      "section",
      undefined,
      "ibEscPanel"
    );

    caixa.append(
      novo("h3", "🛡️ Responsáveis pelas escalas")
    );

    const formulario = novo("form");

    const pessoa = novo("select");

    membros.forEach(m => {
      const op = novo("option", m.nome);
      op.value = m.id;
      pessoa.append(op);
    });

    const ministerio = novo("select");

    Object.entries(ministerios)
      .forEach(([id, nome]) => {
        const op = novo("option", nome);
        op.value = id;
        ministerio.append(op);
      });

    const salvar = novo(
      "button",
      "Autorizar responsável",
      "ibEscBtn"
    );

    salvar.type = "submit";

    formulario.append(
      campo("Membro", pessoa),
      campo("Ministério", ministerio),
      salvar
    );

    const listaGestores = novo("div");
    listaGestores.id = "ibiListaGestores";

    caixa.append(
      formulario,
      listaGestores
    );

    gestao.append(caixa);

    formulario.onsubmit = async evento => {
      evento.preventDefault();
      salvar.disabled = true;

      const r = await api
        .from("ibi_escala_gestores")
        .upsert({
          membro_id: pessoa.value,
          ministerio: ministerio.value
        }, {
          onConflict: "membro_id,ministerio"
        });

      salvar.disabled = false;

      if (r.error) {
        aviso("Erro: " + r.error.message, true);
      } else {
        aviso("Responsável autorizado!");
        await carregarGestores();
      }
    };
  }

  async function carregarGestores() {
    const area = $("#ibiListaGestores");
    if (!area) return;

    const { data, error } = await api
      .from("ibi_escala_gestores")
      .select("membro_id,ministerio");

    if (error) {
      aviso(error.message, true);
      return;
    }

    area.replaceChildren();

    (data || []).forEach(g => {
      const nome = membros.find(
        m => m.id === g.membro_id
      )?.nome || "Membro";

      const linha = novo(
        "p",
        nome + " — " +
        (ministerios[g.ministerio] || g.ministerio)
      );

      const remover = novo(
        "button",
        "Remover permissão",
        "ibEscBtn secondary"
      );

      remover.type = "button";

      remover.onclick = async () => {
        if (!confirm(
          "Remover permissão deste responsável?"
        )) return;

        const r = await api
          .from("ibi_escala_gestores")
          .delete()
          .eq("membro_id", g.membro_id)
          .eq("ministerio", g.ministerio);

        if (r.error) {
          aviso(r.error.message, true);
        } else {
          aviso("Permissão removida.");
          carregarGestores();
        }
      };

      linha.append(remover);
      area.append(linha);
    });
  }

  function iniciar() {
    const aba = $("#ibiAba_escalas");
    const aprovado = $("#approvedArea");

    if (!aba || !aprovado) return;

    function abrir() {
      if (!aba.hidden && !aprovado.hidden) {
        preparar();
      }
    }

    const observador = new MutationObserver(abrir);

    observador.observe(aba, {
      attributes: true,
      attributeFilter: ["hidden"]
    });

    observador.observe(aprovado, {
      attributes: true,
      attributeFilter: ["hidden"]
    });

    abrir();
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
