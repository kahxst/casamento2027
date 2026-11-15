/* =========================================================
   ENVIO DA CONFIRMAÇÃO — SUPABASE
   O site pode ser hospedado no GitHub Pages (HTML/CSS/JS estáticos).
   A chave publishable é própria para uso no navegador; a segurança dos
   registros é aplicada pelas políticas RLS configuradas no Supabase.
   ========================================================= */
const SUPABASE_URL = "https://mhchlgmmiexxkgfetidn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_eCZJdqsq41T35Oy_ohsusA_EK2_l0zr";
const SUPABASE_TABLE_ENDPOINT = `${SUPABASE_URL}/rest/v1/confirmacoes`;

// Tempo mínimo (ms) que o brinde fica na tela depois do clique.
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
      if (message) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
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

  nome.addEventListener("input", () => setError(nome, nomeErro, "", "input"));
  form.querySelectorAll('input[name="presenca"]').forEach((radio) =>
    radio.addEventListener("change", () => setError(choice, presencaErro, "", "group"))
  );

  async function send(data) {
    const response = await fetch(SUPABASE_TABLE_ENDPOINT, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        nome: data.nome,
        comparecera: data.comparecera
      })
    });

    if (!response.ok) {
      let detail = "";
      try {
        const result = await response.json();
        detail = result.message || result.details || result.hint || result.code || "";
      } catch (_) {
        // Mantém a mensagem genérica se a API não retornar JSON.
      }
      console.error("Erro do Supabase:", response.status, detail);
      if (response.status === 401 || response.status === 403) {
        throw new Error("Não foi possível registrar a confirmação. Verifique a configuração de acesso do formulário.");
      }
      throw new Error("Não foi possível salvar a confirmação. Tente novamente em alguns instantes.");
    }
  }

  function showThanks() {
    thanks.hidden = false;
    document.body.style.overflow = "hidden";
    thanksTitle.focus({ preventScroll: true });
  }

  document.getElementById("novo-participante").addEventListener("click", () => {
    form.reset();
    setError(nome, nomeErro, "", "input");
    setError(choice, presencaErro, "", "group");
    formErro.hidden = true;
    button.disabled = false;
    submitWrap.classList.remove("is-sending");
    sending = false;
    thanks.hidden = true;
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
    nome.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;

    // Honeypot: robôs que preenchem o campo invisível não geram registros.
    if (form.elements.website && form.elements.website.value) { showThanks(); return; }

    const data = validate();
    if (!data) return;

    sending = true;
    formErro.hidden = true;
    button.disabled = true;
    submitWrap.classList.add("is-sending");

    try {
      await Promise.all([
        send(data),
        new Promise((resolve) => setTimeout(resolve, MIN_TOAST_TIME))
      ]);
      showThanks();
    } catch (error) {
      console.error(error);
      formErro.textContent = "Não foi possível salvar sua confirmação. Tente novamente em alguns instantes. Se o problema continuar, avise a equipe do evento.";
      formErro.hidden = false;
      button.disabled = false;
      submitWrap.classList.remove("is-sending");
      sending = false;
    }
  });
})();
