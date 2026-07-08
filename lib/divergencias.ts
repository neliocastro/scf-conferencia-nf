import type { CampoDivergencia, CTeRegistro, Divergencia, LivroAgregado, NFeRegistro, TipoDocumento } from "./tipos";
import { formatarValorBR, formatarDataBR } from "./numerosBr";

interface Base {
  tipo: TipoDocumento;
  chave: string;
  notaFiscal: string;
}

// Divergência monetária: só é registrada se os valores diferirem. Guarda os brutos
// (centavos) para o gerador de e-mail distinguir "não escriturado" (livro = 0).
function divMonetaria(
  base: Base,
  campo: CampoDivergencia,
  brutoXml: number,
  brutoLivro: number,
): Divergencia | null {
  if (brutoXml === brutoLivro) return null;
  return {
    ...base,
    campo,
    valorXml: formatarValorBR(brutoXml),
    valorLivro: formatarValorBR(brutoLivro),
    brutoXml,
    brutoLivro,
  };
}

function divData(base: Base, xml: string | null, livro: string | null): Divergencia | null {
  if (xml === livro) return null;
  return {
    ...base,
    campo: "data",
    valorXml: formatarDataBR(xml),
    valorLivro: formatarDataBR(livro),
    brutoXml: null,
    brutoLivro: null,
  };
}

function divCfop(base: Base, cfopsXml: string[], cfopsLivro: string[]): Divergencia | null {
  const xmlUnico = cfopsXml.length === 1 ? cfopsXml[0] : null;
  const livroUnico = cfopsLivro.length === 1 ? cfopsLivro[0] : null;
  if (xmlUnico != null && livroUnico != null && xmlUnico === livroUnico) return null;

  return {
    ...base,
    campo: "cfop",
    valorXml: cfopsXml.length > 0 ? cfopsXml.join("/") : "(vazio)",
    valorLivro: cfopsLivro.length > 0 ? cfopsLivro.join("/") : "(vazio)",
    brutoXml: null,
    brutoLivro: null,
  };
}

export function compararNFe(registro: NFeRegistro, agregado: LivroAgregado): Divergencia[] {
  const base: Base = { tipo: "NFe", chave: registro.chave, notaFiscal: registro.numero };
  return [
    divData(base, registro.dataEmissao, agregado.emissao),
    divMonetaria(base, "valorContabil", registro.vNF, agregado.vlrContabil),
    divCfop(base, registro.cfops, agregado.cfops),
    divMonetaria(base, "icms", registro.vICMS, agregado.icmsTribut),
    divMonetaria(base, "ipi", registro.vIPI, agregado.ipiTribut),
    divMonetaria(base, "baseCalculo", registro.vBC, agregado.baseIcms),
  ].filter((d): d is Divergencia => d !== null);
}

export function compararCTe(registro: CTeRegistro, agregado: LivroAgregado): Divergencia[] {
  const base: Base = { tipo: "CTe", chave: registro.chave, notaFiscal: registro.numero };
  return [
    divData(base, registro.dataEmissao, agregado.emissao),
    divMonetaria(base, "valorContabil", registro.vTPrest, agregado.vlrContabil),
    divCfop(base, registro.cfop ? [registro.cfop] : [], agregado.cfops),
    divMonetaria(base, "icms", registro.vICMS ?? 0, agregado.icmsTribut),
    divMonetaria(base, "baseCalculo", registro.vBC ?? 0, agregado.baseIcms),
  ].filter((d): d is Divergencia => d !== null);
}
