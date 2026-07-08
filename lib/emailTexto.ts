import type { CampoDivergencia, CTeRegistro, Divergencia, NFeRegistro, ResultadoReconciliacao } from "./tipos";

const ROTULO_CAMPO: Record<CampoDivergencia, string> = {
  data: "Data",
  valorContabil: "Valor Contábil",
  cfop: "CFOP",
  icms: "ICMS",
  ipi: "IPI",
  baseCalculo: "Base de Cálculo",
};

function formatarDivergenciasPorNota(divergencias: Divergencia[]): string {
  const porNota = new Map<string, Divergencia[]>();
  for (const d of divergencias) {
    const lista = porNota.get(d.notaFiscal) ?? [];
    lista.push(d);
    porNota.set(d.notaFiscal, lista);
  }

  const partes: string[] = [];
  for (const [nota, lista] of porNota) {
    const campos = lista
      .map((d) => `${ROTULO_CAMPO[d.campo]}: XML ${d.valorXml} x Livro ${d.valorLivro}`)
      .join("; ");
    partes.push(`NF ${nota} (${campos})`);
  }
  return partes.join("; ");
}

function tituloDecendio(periodo: string): string {
  const match = periodo.match(/^(\d)º Decêndio de (\w+)\/(\d+)$/);
  if (!match) return periodo;
  const [, numero, mes, ano] = match;
  return `${numero}º Decêndio – ${mes.charAt(0).toUpperCase()}${mes.slice(1)}/${ano}`;
}

function fraseStatus(totalProcessado: number, semLivro: number): string {
  if (semLivro === 0) return "todas as notas foram encontradas no livro";
  return `${semLivro} nota${semLivro > 1 ? "s" : ""} não foi(ram) encontrada(s) no livro`;
}

export function gerarTextoEmail(
  periodo: string,
  nfe: ResultadoReconciliacao<NFeRegistro>,
  cte: ResultadoReconciliacao<CTeRegistro>,
): string {
  const totalNFe = nfe.casadas.length + nfe.semLivro.length;
  const totalCTe = cte.casadas.length + cte.semLivro.length;
  const totalLivroSemXml = nfe.livroSemXml.length + cte.livroSemXml.length;

  const divergenciasNFe = formatarDivergenciasPorNota(nfe.divergencias);
  const divergenciasCTe = formatarDivergenciasPorNota(cte.divergencias);

  const pendentesCTe = cte.semLivro.map((r) => r.numero).join(", ");

  const linhas: string[] = [];
  linhas.push(`Assunto: Análise de Divergências – NFe, CTe e Livro Caixa | ${tituloDecendio(periodo)}`);
  linhas.push("");
  linhas.push("Prezado Cliente,");
  linhas.push("");
  linhas.push(`Segue análise do ${periodo}.`);
  linhas.push("");
  linhas.push(`XML de Entrada – ${totalNFe} notas – ${fraseStatus(totalNFe, nfe.semLivro.length)}.`);
  if (divergenciasNFe) {
    linhas.push(`Divergências encontradas: ${divergenciasNFe}.`);
  }
  linhas.push("");

  if (cte.semLivro.length === 0) {
    linhas.push(`XML de CTe – ${totalCTe} notas – ${fraseStatus(totalCTe, cte.semLivro.length)}.`);
  } else {
    linhas.push(
      `XML de CTe – ${totalCTe} notas – ${fraseStatus(totalCTe, cte.semLivro.length)}. Segue relação das CTe pendentes:`,
    );
    linhas.push("");
    linhas.push(pendentesCTe);
  }
  if (divergenciasCTe) {
    linhas.push("");
    linhas.push(`Divergências encontradas: ${divergenciasCTe}.`);
  }
  linhas.push("");

  linhas.push(
    `Obs.: Temos (${totalLivroSemXml.toString().padStart(2, "0")}) nota(s) no livro que está(ão) sem o XML.`,
  );
  linhas.push("");
  linhas.push("Ficamos à disposição para esclarecer qualquer dúvida.");
  linhas.push("");
  linhas.push("Atenciosamente,");
  linhas.push("");
  linhas.push("SCF Contabilidade");

  return linhas.join("\n");
}
