/* =========================================================
   CONFIGURAÇÃO — é só aqui que você precisa mexer
   ========================================================= */

// Chave Pix que recebe os presentes.
// Chave de CELULAR precisa começar com +55 (ex.: +5511967236352).
// CPF/CNPJ: só os números. E-mail: o próprio e-mail. Chave aleatória: o código inteiro.
const PIX_KEY = "+5511967236352";

// Nome e cidade que aparecem no Pix (sem acentos; até 25 e 15 letras).
const PIX_NAME = "KAMILA E EWERTON";
const PIX_CITY = "SUZANO";

// Valores permitidos (em reais).
const MIN_VALUE = 60;
const MAX_VALUE = 50000;

/* =========================================================
   Pix "copia e cola" (BR Code) + QR Code
   ========================================================= */
function tlv(id, value) {
  return id + String(value.length).padStart(2, "0") + value;
}

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido pelo padrão do Banco Central.
function crc16(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function plainAscii(text, max) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, " ").trim().toUpperCase().slice(0, max);
}

function buildPix(cents) {
  const amount = Math.floor(cents / 100) + "." + String(cents % 100).padStart(2, "0");
  const account = tlv("00", "br.gov.bcb.pix") + tlv("01", PIX_KEY.trim());
  const body =
    tlv("00", "01") +                       // versão do formato
    tlv("01", "11") +                       // QR estático
    tlv("26", account) +                    // conta Pix (chave)
    tlv("52", "0000") +                     // categoria
    tlv("53", "986") +                      // moeda: real
    tlv("54", amount) +                     // valor
    tlv("58", "BR") +
    tlv("59", plainAscii(PIX_NAME, 25)) +
    tlv("60", plainAscii(PIX_CITY, 15)) +
    tlv("62", tlv("05", "***")) +           // identificador da transação (livre)
    "6304";
  return body + crc16(body);
}

function renderQr(container, text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), quiet = 4, size = n + quiet * 2;
  let path = "";
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.isDark(r, c)) { c++; continue; }
      const start = c;
      while (c < n && qr.isDark(r, c)) c++;
      path += `M${start + quiet} ${r + quiet}h${c - start}v1h-${c - start}z`;
    }
  }
  container.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true">` +
    `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#1f1d18"/></svg>`;
}

/* =========================================================
   Tela
   ========================================================= */
(function gift() {
  const form = document.getElementById("escolha");
  const fieldset = form.querySelector(".amounts");
  const radios = [...form.querySelectorAll('input[name="valor"]')];
  const otherBox = document.getElementById("outro-campo");
  const other = document.getElementById("outro");
  const money = otherBox.querySelector(".money");
  const error = document.getElementById("valor-erro");
  const pay = document.getElementById("pagamento");
  const codeBox = document.getElementById("pix-codigo");
  const copyBtn = document.getElementById("copiar");
  const copyText = document.getElementById("copiar-texto");
  const payValue = document.getElementById("pay-valor");

  const brl = (cents) => "R$ " + (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function setError(message, target) {
    error.textContent = message || "";
    error.hidden = !message;
    fieldset.dataset.invalid = message && target === "group" ? "true" : "false";
    money.dataset.invalid = message && target === "other" ? "true" : "false";
  }

  // máscara em reais: digitou 7000 -> 70,00
  other.addEventListener("input", () => {
    const digits = other.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 8);
    other.value = digits ? (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
    setError("");
  });

  radios.forEach((r) => r.addEventListener("change", () => {
    const isOther = r.checked && r.value === "outro";
    otherBox.hidden = !isOther;
    if (isOther) other.focus();
    setError("");
  }));

  function chosenCents() {
    const sel = radios.find((r) => r.checked);
    if (!sel) return { error: "Escolha um valor para continuar.", target: "group" };
    if (sel.value !== "outro") return { cents: parseInt(sel.value, 10) * 100 };
    const cents = parseInt(other.value.replace(/\D/g, "") || "0", 10);
    if (!cents) return { error: "Digite o valor do presente.", target: "other" };
    if (cents < MIN_VALUE * 100) return { error: `O valor mínimo é ${brl(MIN_VALUE * 100)}.`, target: "other" };
    if (cents > MAX_VALUE * 100) return { error: `O valor máximo é ${brl(MAX_VALUE * 100)}.`, target: "other" };
    return { cents };
  }

  function formatKey(key) {
    const m = key.match(/^\+55(\d{2})(\d{5})(\d{4})$/);
    return m ? `(${m[1]}) ${m[2]}-${m[3]}` : key;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = chosenCents();
    if (result.error) {
      setError(result.error, result.target);
      (result.target === "other" ? other : radios[0]).focus();
      return;
    }
    const code = buildPix(result.cents);
    payValue.textContent = brl(result.cents);
    document.getElementById("pay-chave").textContent = formatKey(PIX_KEY);
    codeBox.value = code;
    renderQr(document.getElementById("qr"), code);

    form.hidden = true;
    pay.hidden = false;
    copyText.textContent = "Copiar código";
    window.scrollTo({ top: 0 });
    payValue.setAttribute("tabindex", "-1");
    payValue.focus({ preventScroll: true });
  });

  async function copy() {
    let ok = false;
    try { await navigator.clipboard.writeText(codeBox.value); ok = true; }
    catch (e) {
      codeBox.focus(); codeBox.select(); codeBox.setSelectionRange(0, 99999);
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    }
    copyText.textContent = ok ? "Código copiado!" : "Selecione e copie o código";
    setTimeout(() => { copyText.textContent = "Copiar código"; }, 2600);
  }
  copyBtn.addEventListener("click", copy);
  codeBox.addEventListener("focus", () => codeBox.select());

  document.getElementById("outro-valor").addEventListener("click", () => {
    pay.hidden = true;
    form.hidden = false;
    window.scrollTo({ top: 0 });
    (radios.find((r) => r.checked) || radios[0]).focus({ preventScroll: true });
  });
})();
