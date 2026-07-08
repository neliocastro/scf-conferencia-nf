import type {
  CampoDivergencia,
  CTeRegistro,
  Divergencia,
  NFeRegistro,
  ResultadoReconciliacao,
} from "./tipos";
import { ehCampoMonetario } from "./tipos";

const NOME_ESCRITORIO = "SCF Contabilidade";

// Rótulos completos (usados em cabeçalhos de seção).
const ROTULO_CAMPO: Record<CampoDivergencia, string> = {
  data: "Data",
  valorContabil: "Valor Contábil",
  cfop: "CFOP",
  icms: "ICMS",
  ipi: "IPI",
  baseCalculo: "Base de Cálculo",
};

// Rótulos curtos (usados nas linhas detalhadas por nota).
const ROTULO_CAMPO_CURTO: Record<CampoDivergencia, string> = {
  data: "Data",
  valorContabil: "Valor Contábil",
  cfop: "CFOP",
  icms: "ICMS",
  ipi: "IPI",
  baseCalculo: "Base Cálc.",
};

// Ordem estável de exibição dos campos numa linha detalhada.
const ORDEM_CAMPOS: CampoDivergencia[] = [
  "valorContabil",
  "cfop",
  "icms",
  "baseCalculo",
  "ipi",
  "data",
];

function ordenarNumeros(numeros: string[]): string[] {
  return [...numeros].sort((a, b) => {
    const na = Number.parseInt(a, 10);
    const nb = Number.parseInt(b, 10);
    if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
    return na - nb;
  });
}

interface GruposDivergencia {
  // Notas cuja única divergência é um imposto/valor não escriturado (livro = 0),
  // agrupadas por campo.
  naoEscriturado: Map<CampoDivergencia, Divergencia[]>;
  // Notas cuja única divergência é CFOP, agrupadas pelo par (XML, Livro).
  cfopPorPadrao: Map<string, { xml: string; livro: string; notas: string[] }>;
  // Demais notas (múltiplas divergências, ou uma divergência que não se encaixa acima).
  especificos: Map<string, Divergencia[]>;
}

function agruparDivergencias(divergencias: Divergencia[]): GruposDivergencia {
  const porNota = new Map<string, Divergencia[]>();
  for (const d of divergencias) {
    const lista = porNota.get(d.notaFiscal) ?? [];
    lista.push(d);
    porNota.set(d.notaFiscal, lista);
  }

  const grupos: GruposDivergencia = {
    naoEscriturado: new Map(),
    cfopPorPadrao: new Map(),
    especificos: new Map(),
  };

  for (const [nota, lista] of porNota) {
    if (lista.length === 1) {
      const d = lista[0];
      const naoEscriturado =
        ehCampoMonetario(d.campo) && d.brutoLivro === 0 && d.brutoXml !== 0;

      if (naoEscriturado) {
        const atual = grupos.naoEscriturado.get(d.campo) ?? [];
        atual.push(d);
        grupos.naoEscriturado.set(d.campo, atual);
        continue;
      }
      if (d.campo === "cfop") {
        const padrao = `${d.valorXml}|${d.valorLivro}`;
        const atual = grupos.cfopPorPadrao.get(padrao) ?? { xml: d.valorXml, livro: d.valorLivro, notas: [] };
        atual.notas.push(nota);
        grupos.cfopPorPadrao.set(padrao, atual);
        continue;
      }
    }
    grupos.especificos.set(nota, lista);
  }

  return grupos;
}

function renderBlocosDivergencia(divergencias: Divergencia[]): string[] {
  const grupos = agruparDivergencias(divergencias);
  const linhas: string[] = [];

  // 1) Impostos/valores não escriturados no livro (agrupados por campo).
  for (const campo of ORDEM_CAMPOS) {
    const lista = grupos.naoEscriturado.get(campo);
    if (!lista || lista.length === 0) continue;
    linhas.push("");
    linhas.push(`Divergência de ${ROTULO_CAMPO[campo]} (valor não escriturado no livro):`);
    const ordenadas = [...lista].sort((a, b) => {
      const na = Number.parseInt(a.notaFiscal, 10);
      const nb = Number.parseInt(b.notaFiscal, 10);
      return Number.isNaN(na) || Number.isNaN(nb) ? a.notaFiscal.localeCompare(b.notaFiscal) : na - nb;
    });
    for (const d of ordenadas) {
      linhas.push(`- NF ${d.notaFiscal}: XML R$ ${d.valorXml} x Livro R$ ${d.valorLivro}`);
    }
  }

  // 2) CFOP com padrão idêntico (colapsado numa lista de números).
  for (const { xml, livro, notas } of grupos.cfopPorPadrao.values()) {
    linhas.push("");
    linhas.push(`Divergência de CFOP (mesmo padrão em todas as notas abaixo: XML ${xml} x Livro ${livro}):`);
    linhas.push(ordenarNumeros(notas).join(", "));
  }

  // 3) Divergências específicas por nota (múltiplos campos ou casos mistos).
  if (grupos.especificos.size > 0) {
    linhas.push("");
    linhas.push("Divergências de Valor Contábil / ICMS / Base de Cálculo / CFOP (valores específicos por nota):");
    const notasOrdenadas = ordenarNumeros([...grupos.especificos.keys()]);
    for (const nota of notasOrdenadas) {
      const lista = grupos.especificos.get(nota)!;
      const partes = ORDEM_CAMPOS.filter((c) => lista.some((d) => d.campo === c)).map((campo) => {
        const d = lista.find((x) => x.campo === campo)!;
        return `${ROTULO_CAMPO_CURTO[campo]} XML ${d.valorXml} x Livro ${d.valorLivro}`;
      });
      linhas.push(`- NF ${nota}: ${partes.join(" | ")}`);
    }
  }

  return linhas;
}

function tituloDecendio(periodo: string): string {
  const match = periodo.match(/^(\d)º Decêndio de (\w+)\/(\d+)$/);
  if (!match) return periodo;
  const [, numero, mes, ano] = match;
  return `${numero}º Decêndio – ${mes.charAt(0).toUpperCase()}${mes.slice(1)}/${ano}`;
}

// Renderiza a seção de um tipo de documento: linha-resumo, lista de pendentes (não
// encontradas no livro) e os blocos de divergência.
function renderSecao(
  rotulo: "Entrada" | "CTe",
  total: number,
  pendentes: string[],
  divergencias: Divergencia[],
): string[] {
  const linhas: string[] = [];

  if (pendentes.length === 0) {
    linhas.push(`XML de ${rotulo} – ${total} notas – todas as notas foram encontradas no livro.`);
  } else {
    const plural = pendentes.length > 1;
    linhas.push(
      `XML de ${rotulo} – ${total} notas – ${pendentes.length} nota${plural ? "s" : ""} não ${plural ? "foram encontradas" : "foi encontrada"} no livro:`,
    );
    for (const numero of ordenarNumeros(pendentes)) {
      linhas.push(`- ${numero}`);
    }
  }

  linhas.push(...renderBlocosDivergencia(divergencias));
  return linhas;
}

export function gerarTextoEmail(
  periodo: string,
  nfe: ResultadoReconciliacao<NFeRegistro>,
  cte: ResultadoReconciliacao<CTeRegistro>,
): string {
  const totalNFe = nfe.casadas.length + nfe.semLivro.length;
  const totalCTe = cte.casadas.length + cte.semLivro.length;
  const totalLivroSemXml = nfe.livroSemXml.length + cte.livroSemXml.length;

  const linhas: string[] = [];
  linhas.push(`Assunto: Análise de Divergências – NFe, CTe e Livro Caixa | ${tituloDecendio(periodo)}`);
  linhas.push("");
  linhas.push("Prezado Cliente,");
  linhas.push("");
  linhas.push(`Segue análise do ${periodo}.`);
  linhas.push("");

  linhas.push(...renderSecao("Entrada", totalNFe, nfe.semLivro.map((r) => r.numero), nfe.divergencias));
  linhas.push("");
  linhas.push(...renderSecao("CTe", totalCTe, cte.semLivro.map((r) => r.numero), cte.divergencias));
  linhas.push("");

  const plural = totalLivroSemXml !== 1;
  linhas.push(
    `Obs.: Temos (${totalLivroSemXml.toString().padStart(2, "0")}) nota${plural ? "s" : ""} no livro sem o XML correspondente.`,
  );
  linhas.push("");
  linhas.push("Ficamos à disposição para esclarecer qualquer dúvida.");
  linhas.push("");
  linhas.push("Atenciosamente,");
  linhas.push(NOME_ESCRITORIO);

  return linhas.join("\n");
}
