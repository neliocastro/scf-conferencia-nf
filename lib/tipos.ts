// Valores monetários em centavos (inteiro). Datas como string ISO 'YYYY-MM-DD' ou null.

export interface NFeRegistro {
  chave: string;
  dataEmissao: string | null;
  numero: string;
  serie: string;
  cfops: string[];
  vBC: number;
  vICMS: number;
  vIPI: number;
  vProd: number;
  vNF: number;
  cStat: string;
  arquivo: string;
}

export interface CTeRegistro {
  chave: string;
  dataEmissao: string | null;
  numero: string;
  serie: string;
  cfop: string;
  vTPrest: number;
  vRec: number;
  icmsVariante: string | null;
  vBC: number | null;
  vICMS: number | null;
  cStat: string;
  arquivo: string;
}

export interface ErroParse {
  arquivo: string;
  mensagem: string;
}

export interface LinhaLivro {
  linhaOrigem: number;
  dtEntrada: string | null;
  emissao: string | null;
  notaFiscal: string;
  serie: string;
  codFiscal: string;
  vlrContabil: number;
  baseIcms: number;
  icmsTribut: number;
  ipiTribut: number;
  dtCancel: string | null;
  chaveNfe: string | null;
}

export interface LivroAgregado {
  chaveNfe: string | null;
  notaFiscal: string;
  serie: string;
  emissao: string | null;
  dtEntrada: string | null;
  vlrContabil: number;
  baseIcms: number;
  icmsTribut: number;
  ipiTribut: number;
  cfops: string[];
  cancelado: boolean;
  linhasOrigem: number[];
}

export type TipoDocumento = "NFe" | "CTe";

export type CampoDivergencia =
  | "data"
  | "valorContabil"
  | "cfop"
  | "icms"
  | "ipi"
  | "baseCalculo";

export interface Divergencia {
  tipo: TipoDocumento;
  chave: string;
  notaFiscal: string;
  campo: CampoDivergencia;
  valorXml: string;
  valorLivro: string;
  // Valores brutos em centavos para campos monetários (null para cfop/data). Usados
  // para detectar "valor não escriturado no livro" (brutoLivro === 0, brutoXml !== 0).
  brutoXml: number | null;
  brutoLivro: number | null;
}

export function ehCampoMonetario(campo: CampoDivergencia): boolean {
  return campo === "valorContabil" || campo === "icms" || campo === "ipi" || campo === "baseCalculo";
}

export interface NotaCasada<T extends NFeRegistro | CTeRegistro> {
  registro: T;
  agregado: LivroAgregado;
  origemCasamento: "chave" | "fallback";
}

export interface ResultadoReconciliacao<T extends NFeRegistro | CTeRegistro> {
  casadas: NotaCasada<T>[];
  semLivro: T[];
  livroSemXml: LivroAgregado[];
  cancelados: LivroAgregado[];
  divergencias: Divergencia[];
}

export interface ResultadoCompleto {
  periodo: string;
  nfe: ResultadoReconciliacao<NFeRegistro>;
  cte: ResultadoReconciliacao<CTeRegistro>;
  errosParse: ErroParse[];
  avisosLivro: string[];
}
