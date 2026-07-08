import * as XLSX from "xlsx";
import type { LinhaLivro, LivroAgregado } from "./tipos";
import { parseValorBR, parseDataBR, normalizarNumero } from "./numerosBr";
import { parseCsv } from "./csv";
import { lerTexto, lerBuffer } from "./lerArquivo";

type Celula = string | number | Date | null | undefined;

const CABECALHOS_ESPERADOS = [
  "DT_ENTRADA",
  "NOTA_FISCAL",
  "SERIE",
  "COD_FISCAL",
  "VLR_CONTABIL",
  "BASE_ICMS",
  "ICMS_TRIBUT",
  "IPI_TRIBUT",
  "DT_CANCEL",
  "EMISSAO",
  "CHAVE_NFE",
] as const;

function celulaTexto(v: Celula): string {
  if (v == null) return "";
  return String(v).trim();
}

function celulaCentavos(v: Celula): number {
  if (typeof v === "number") return Math.round(v * 100);
  return parseValorBR(celulaTexto(v));
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function celulaDataISO(v: Celula): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    return `${v.getUTCFullYear().toString().padStart(4, "0")}-${pad2(v.getUTCMonth() + 1)}-${pad2(v.getUTCDate())}`;
  }
  if (typeof v === "string") return parseDataBR(v);
  return null;
}

async function lerLinhasCsv(arquivo: File): Promise<Celula[][]> {
  const texto = await lerTexto(arquivo);
  return parseCsv(texto);
}

async function lerLinhasXlsx(arquivo: File): Promise<Celula[][]> {
  const buffer = await lerBuffer(arquivo);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const planilha = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Celula[]>(planilha, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
}

function montarIndiceCabecalho(cabecalho: Celula[]): Map<string, number> {
  const indice = new Map<string, number>();
  cabecalho.forEach((valor, i) => {
    const chave = celulaTexto(valor).toUpperCase();
    if (chave) indice.set(chave, i);
  });
  return indice;
}

function linhaEhRodapeOuVazia(linha: Celula[], idx: Map<string, number>): boolean {
  const dtEntradaIdx = idx.get("DT_ENTRADA");
  const dtEntrada = dtEntradaIdx != null ? celulaTexto(linha[dtEntradaIdx]).toLowerCase() : "";
  if (dtEntrada === "total") return true;

  const notaIdx = idx.get("NOTA_FISCAL");
  const cfopIdx = idx.get("COD_FISCAL");
  const nota = notaIdx != null ? celulaTexto(linha[notaIdx]) : "";
  const cfop = cfopIdx != null ? celulaTexto(linha[cfopIdx]) : "";
  if (!nota && !cfop) return true;

  return linha.every((c) => celulaTexto(c) === "");
}

export interface ResultadoCargaLivro {
  linhas: LinhaLivro[];
  avisos: string[];
}

export async function carregarLivro(arquivo: File): Promise<ResultadoCargaLivro> {
  const ehXlsx = /\.xlsx$/i.test(arquivo.name);
  const todasLinhas = ehXlsx ? await lerLinhasXlsx(arquivo) : await lerLinhasCsv(arquivo);
  return processarLinhas(todasLinhas);
}

// Caminho puro (sem I/O de arquivo), usado pelo carregamento de CSV e por testes.
export function carregarLivroDeTexto(texto: string): ResultadoCargaLivro {
  return processarLinhas(parseCsv(texto));
}

function processarLinhas(todasLinhas: Celula[][]): ResultadoCargaLivro {
  if (todasLinhas.length === 0) {
    return { linhas: [], avisos: ["Arquivo do livro fiscal está vazio."] };
  }

  const idx = montarIndiceCabecalho(todasLinhas[0]);
  const faltando = CABECALHOS_ESPERADOS.filter((c) => !idx.has(c));
  const avisos: string[] = [];
  if (faltando.length > 0) {
    avisos.push(`Colunas não encontradas no livro fiscal: ${faltando.join(", ")}.`);
  }

  const linhas: LinhaLivro[] = [];
  let rodapeIgnorado = 0;

  for (let i = 1; i < todasLinhas.length; i++) {
    const linha = todasLinhas[i];
    if (linhaEhRodapeOuVazia(linha, idx)) {
      rodapeIgnorado++;
      continue;
    }

    const pega = (col: (typeof CABECALHOS_ESPERADOS)[number]) => {
      const i2 = idx.get(col);
      return i2 != null ? linha[i2] : undefined;
    };

    const chaveNfe = celulaTexto(pega("CHAVE_NFE"));

    linhas.push({
      linhaOrigem: i + 1,
      dtEntrada: celulaDataISO(pega("DT_ENTRADA")),
      emissao: celulaDataISO(pega("EMISSAO")),
      notaFiscal: celulaTexto(pega("NOTA_FISCAL")),
      serie: celulaTexto(pega("SERIE")),
      codFiscal: celulaTexto(pega("COD_FISCAL")),
      vlrContabil: celulaCentavos(pega("VLR_CONTABIL")),
      baseIcms: celulaCentavos(pega("BASE_ICMS")),
      icmsTribut: celulaCentavos(pega("ICMS_TRIBUT")),
      ipiTribut: celulaCentavos(pega("IPI_TRIBUT")),
      dtCancel: celulaDataISO(pega("DT_CANCEL")),
      chaveNfe: chaveNfe || null,
    });
  }

  if (rodapeIgnorado > 0) {
    avisos.push(`${rodapeIgnorado} linha(s) ignorada(s) por não representarem notas (ex.: linha de totais).`);
  }

  return { linhas, avisos };
}

export function agruparPorChave(linhas: LinhaLivro[]): {
  agregados: Map<string, LivroAgregado>;
  semChave: LinhaLivro[];
} {
  const agregados = new Map<string, LivroAgregado>();
  const semChave: LinhaLivro[] = [];

  for (const linha of linhas) {
    if (!linha.chaveNfe) {
      semChave.push(linha);
      continue;
    }

    const existente = agregados.get(linha.chaveNfe);
    if (!existente) {
      agregados.set(linha.chaveNfe, {
        chaveNfe: linha.chaveNfe,
        notaFiscal: linha.notaFiscal,
        serie: linha.serie,
        emissao: linha.emissao,
        dtEntrada: linha.dtEntrada,
        vlrContabil: linha.vlrContabil,
        baseIcms: linha.baseIcms,
        icmsTribut: linha.icmsTribut,
        ipiTribut: linha.ipiTribut,
        cfops: linha.codFiscal ? [linha.codFiscal] : [],
        cancelado: linha.dtCancel != null,
        linhasOrigem: [linha.linhaOrigem],
      });
      continue;
    }

    existente.vlrContabil += linha.vlrContabil;
    existente.baseIcms += linha.baseIcms;
    existente.icmsTribut += linha.icmsTribut;
    existente.ipiTribut += linha.ipiTribut;
    if (linha.codFiscal && !existente.cfops.includes(linha.codFiscal)) {
      existente.cfops.push(linha.codFiscal);
    }
    existente.cancelado = existente.cancelado || linha.dtCancel != null;
    existente.linhasOrigem.push(linha.linhaOrigem);
  }

  return { agregados, semChave };
}

// Chave de fallback para linhas sem CHAVE_NFE: número do documento + série + data de
// emissão (a data sozinha pode colidir entre documentos diferentes emitidos no mesmo dia).
export function chaveFallback(notaFiscal: string, serie: string, emissao: string | null): string {
  return `${normalizarNumero(notaFiscal)}|${normalizarNumero(serie)}|${emissao ?? ""}`;
}

export function agruparPorFallback(linhas: LinhaLivro[]): Map<string, LivroAgregado> {
  const agregados = new Map<string, LivroAgregado>();

  for (const linha of linhas) {
    const chave = chaveFallback(linha.notaFiscal, linha.serie, linha.emissao);
    const existente = agregados.get(chave);
    if (!existente) {
      agregados.set(chave, linhaParaAgregadoAvulso(linha));
      continue;
    }

    existente.vlrContabil += linha.vlrContabil;
    existente.baseIcms += linha.baseIcms;
    existente.icmsTribut += linha.icmsTribut;
    existente.ipiTribut += linha.ipiTribut;
    if (linha.codFiscal && !existente.cfops.includes(linha.codFiscal)) {
      existente.cfops.push(linha.codFiscal);
    }
    existente.linhasOrigem.push(linha.linhaOrigem);
  }

  return agregados;
}

export function linhaParaAgregadoAvulso(linha: LinhaLivro): LivroAgregado {
  return {
    chaveNfe: linha.chaveNfe,
    notaFiscal: linha.notaFiscal,
    serie: linha.serie,
    emissao: linha.emissao,
    dtEntrada: linha.dtEntrada,
    vlrContabil: linha.vlrContabil,
    baseIcms: linha.baseIcms,
    icmsTribut: linha.icmsTribut,
    ipiTribut: linha.ipiTribut,
    cfops: linha.codFiscal ? [linha.codFiscal] : [],
    cancelado: linha.dtCancel != null,
    linhasOrigem: [linha.linhaOrigem],
  };
}
