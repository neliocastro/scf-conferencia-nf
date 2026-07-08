import type { LinhaLivro } from "./tipos";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function bucketDecendio(dia: number): 1 | 2 | 3 {
  if (dia <= 10) return 1;
  if (dia <= 20) return 2;
  return 3;
}

// Deriva "3º Decêndio de julho/2026" a partir da data (dia 1-10/11-20/21-fim) mais
// frequente entre as linhas do livro fiscal, para tolerar datas isoladas fora do
// decêndio principal sem distorcer o período reportado.
export function derivarPeriodo(linhas: LinhaLivro[]): string {
  const contagem = new Map<string, number>();

  for (const linha of linhas) {
    const iso = linha.dtEntrada ?? linha.emissao;
    if (!iso) continue;
    const [anoStr, mesStr, diaStr] = iso.split("-");
    const dia = Number.parseInt(diaStr, 10);
    const chave = `${anoStr}-${mesStr}-${bucketDecendio(dia)}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }

  if (contagem.size === 0) return "Decêndio não identificado";

  let chaveMaisFrequente = "";
  let maiorContagem = -1;
  for (const [chave, total] of contagem) {
    if (total > maiorContagem) {
      maiorContagem = total;
      chaveMaisFrequente = chave;
    }
  }

  const [ano, mes, bucket] = chaveMaisFrequente.split("-");
  const nomeMes = MESES[Number.parseInt(mes, 10) - 1] ?? mes;
  return `${bucket}º Decêndio de ${nomeMes}/${ano}`;
}
