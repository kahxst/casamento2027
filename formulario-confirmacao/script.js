/* =========================================================
   CONFIGURAÇÃO — é só aqui que você precisa mexer
   ========================================================= */

// Para onde as respostas são enviadas (endereço de um Google Sheets/Apps Script,
// Formspree, API própria, etc.). Cole entre as aspas.
// ATENÇÃO: enquanto estiver vazio, o formulário funciona e mostra o agradecimento,
// mas NENHUMA resposta é enviada ou guardada.
const FORM_ENDPOINT = "";

// Tempo mínimo (ms) que o brinde fica na tela depois do clique, antes do agradecimento.
const MIN_TOAST_TIME = 1100;

/* =========================================================
   Formulário
   ========================================================= */
(function form() {
  const form = document.getElementById("form");
  const nome = document.getElementById("nome");
  const nomeErro = document.getElementById("nome-erro");
  const choice = form.querySelector(".choice");
  const presencaErro = document.getElementById("presenca-erro");
  const formErro = document.getElementById("form-erro");
  const submitWrap = form.querySelector(".submit");
  const button = document.getElementById("enviar");
  const thanks = document.getElementById("obrigado");
  const thanksTitle = document.getElementById("obrigado-titulo");
  let sending = false;

  function setError(el, box, message, invalidTarget) {
    box.textContent = message || "";
    box.hidden = !message;
    if (invalidTarget === "input") {
      if (message) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    } else {
      el.dataset.invalid = message ? "true" : "false";
    }
  }

  function validate() {
    const name = nome.value.replace(/\s+/g, " ").trim();
    const parts = name.split(" ").filter((p) => p.length > 1);
    const chosen = form.querySelector('input[name="presenca"]:checked');

    setError(nome, nomeErro, parts.length < 2 ? "Digite seu nome completo (nome e sobrenome)." : "", "input");
    setError(choice, presencaErro, chosen ? "" : "Escolha uma opção: Sim ou Não.", "group");

    if (parts.length < 2) { nome.focus(); return null; }
    if (!chosen) { form.querySelector('input[name="presenca"]').focus(); return null; }
    return { nome: name, comparecera: chosen.value };
  }

  // limpa o aviso assim que a pessoa corrige
  nome.addEventListener("input", () => setError(nome, nomeErro, "", "input"));
  form.querySelectorAll('input[name="presenca"]').forEach((r) =>
    r.addEventListener("change", () => setError(choice, presencaErro, "", "group")));

  async function send(data) {
    if (!FORM_ENDPOINT.trim()) {
      console.info("[Formulário] FORM_ENDPOINT está vazio: a resposta NÃO foi enviada.", data);
      return;
    }
    const response = await fetch(FORM_ENDPOINT.trim(), {
      method: "POST",
      body: JSON.stringify({ ...data, enviadoEm: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error("Falha no envio: " + response.status);
  }

  function showThanks() {
    thanks.hidden = false;
    document.body.style.overflow = "hidden";
    thanksTitle.focus({ preventScroll: true });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;

    // robôs preenchem o campo escondido: finge sucesso e não envia nada
    if (form.elements.website && form.elements.website.value) { showThanks(); return; }

    const data = validate();
    if (!data) return;

    sending = true;
    formErro.hidden = true;
    button.disabled = true;
    submitWrap.classList.add("is-sending");        // mantém o brinde na tela durante o envio

    try {
      await Promise.all([send(data), new Promise((r) => setTimeout(r, MIN_TOAST_TIME))]);
      showThanks();
    } catch (err) {
      console.error(err);
      formErro.textContent = "Não foi possível enviar agora. Confira sua conexão e tente novamente.";
      formErro.hidden = false;
      button.disabled = false;
      submitWrap.classList.remove("is-sending");
      sending = false;
    }
  });
})();
