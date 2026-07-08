// Valores monetários são representados internamente em centavos (inteiro) para
// permitir comparação exata sem os problemas de arredondamento de ponto flutuante.

export function parseValorBR(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const limpo = raw.trim();
  if (limpo === "" || limpo === "-") return 0;

  const negativo = limpo.startsWith("-");
  const semSinal = negativo ? limpo.slice(1).trim() : limpo;
  const semMilhar = semSinal.replace(/\./g, "");
  const comPonto = semMilhar.replace(",", ".");
  const valor = Number.parseFloat(comPonto);
  if (Number.isNaN(valor)) return 0;

  const centavos = Math.round(valor * 100);
  return negativo ? -centavos : centavos;
}

// Campos monetários de XML de NFe/CTe usam formato decimal simples ("200.00",
// "37986.00" — ponto decimal, sem separador de milhar), diferente do formato BR do
// livro fiscal ("1.360,34"). Não usar parseValorBR para valores vindos de XML.
export function parseValorXML(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const limpo = raw.trim();
  if (limpo === "") return 0;
  const valor = Number.parseFloat(limpo);
  if (Number.isNaN(valor)) return 0;
  return Math.round(valor * 100);
}

export function formatarValorBR(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const inteiros = Math.floor(abs / 100);
  const centavosRestantes = abs % 100;
  const inteirosFormatados = inteiros.toLocaleString("pt-BR");
  const texto = `${inteirosFormatados},${centavosRestantes.toString().padStart(2, "0")}`;
  return negativo ? `-${texto}` : texto;
}

// Datas são representadas internamente como string ISO 'YYYY-MM-DD' (sem hora/fuso)
// para permitir comparação exata por igualdade de string.

export function parseDataBR(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const limpo = raw.trim();
  if (limpo === "") return null;

  const partes = limpo.split("/");
  if (partes.length !== 3) return null;
  const [mes, dia, ano] = partes;
  const mesNum = Number.parseInt(mes, 10);
  const diaNum = Number.parseInt(dia, 10);
  const anoNum = Number.parseInt(ano, 10);
  if (
    Number.isNaN(mesNum) ||
    Number.isNaN(diaNum) ||
    Number.isNaN(anoNum) ||
    mesNum < 1 ||
    mesNum > 12 ||
    diaNum < 1 ||
    diaNum > 31
  ) {
    return null;
  }

  return `${anoNum.toString().padStart(4, "0")}-${mesNum.toString().padStart(2, "0")}-${diaNum.toString().padStart(2, "0")}`;
}

// dhEmi do XML vem como "2026-06-22T09:19:36-03:00" — a data de calendário emitida
// pelo remetente é sempre o trecho antes do "T", sem necessidade de conversão de fuso.
export function parseDataISOdeXML(dhEmi: string | undefined | null): string | null {
  if (dhEmi == null) return null;
  const limpo = dhEmi.trim();
  if (limpo === "") return null;
  const [data] = limpo.split("T");
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
}

export function formatarDataBR(iso: string | null): string {
  if (iso == null) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Normaliza número de nota fiscal/série para comparação (remove zeros à esquerda e espaços).
export function normalizarNumero(raw: string | undefined | null): string {
  if (raw == null) return "";
  const limpo = raw.trim().replace(/^0+(?=\d)/, "");
  return limpo;
}
