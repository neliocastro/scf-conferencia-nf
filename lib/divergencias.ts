import type { CTeRegistro, Divergencia, LivroAgregado, NFeRegistro } from "./tipos";
import { formatarValorBR, formatarDataBR } from "./numerosBr";

function compararCfop(cfopsXml: string[], cfopsLivro: string[]): { valorXml: string; valorLivro: string } | null {
  const xmlUnico = cfopsXml.length === 1 ? cfopsXml[0] : null;
  const livroUnico = cfopsLivro.length === 1 ? cfopsLivro[0] : null;

  if (xmlUnico != null && livroUnico != null && xmlUnico === livroUnico) return null;

  return {
    valorXml: cfopsXml.length > 0 ? cfopsXml.join("/") : "(vazio)",
    valorLivro: cfopsLivro.length > 0 ? cfopsLivro.join("/") : "(vazio)",
  };
}

export function compararNFe(registro: NFeRegistro, agregado: LivroAgregado): Divergencia[] {
  const divergencias: Divergencia[] = [];
  const base = { tipo: "NFe" as const, chave: registro.chave, notaFiscal: registro.numero };

  if (registro.dataEmissao !== agregado.emissao) {
    divergencias.push({
      ...base,
      campo: "data",
      valorXml: formatarDataBR(registro.dataEmissao),
      valorLivro: formatarDataBR(agregado.emissao),
    });
  }

  if (registro.vNF !== agregado.vlrContabil) {
    divergencias.push({
      ...base,
      campo: "valorContabil",
      valorXml: formatarValorBR(registro.vNF),
      valorLivro: formatarValorBR(agregado.vlrContabil),
    });
  }

  const cfopDiff = compararCfop(registro.cfops, agregado.cfops);
  if (cfopDiff) divergencias.push({ ...base, campo: "cfop", ...cfopDiff });

  if (registro.vICMS !== agregado.icmsTribut) {
    divergencias.push({
      ...base,
      campo: "icms",
      valorXml: formatarValorBR(registro.vICMS),
      valorLivro: formatarValorBR(agregado.icmsTribut),
    });
  }

  if (registro.vIPI !== agregado.ipiTribut) {
    divergencias.push({
      ...base,
      campo: "ipi",
      valorXml: formatarValorBR(registro.vIPI),
      valorLivro: formatarValorBR(agregado.ipiTribut),
    });
  }

  if (registro.vBC !== agregado.baseIcms) {
    divergencias.push({
      ...base,
      campo: "baseCalculo",
      valorXml: formatarValorBR(registro.vBC),
      valorLivro: formatarValorBR(agregado.baseIcms),
    });
  }

  return divergencias;
}

export function compararCTe(registro: CTeRegistro, agregado: LivroAgregado): Divergencia[] {
  const divergencias: Divergencia[] = [];
  const base = { tipo: "CTe" as const, chave: registro.chave, notaFiscal: registro.numero };

  if (registro.dataEmissao !== agregado.emissao) {
    divergencias.push({
      ...base,
      campo: "data",
      valorXml: formatarDataBR(registro.dataEmissao),
      valorLivro: formatarDataBR(agregado.emissao),
    });
  }

  if (registro.vTPrest !== agregado.vlrContabil) {
    divergencias.push({
      ...base,
      campo: "valorContabil",
      valorXml: formatarValorBR(registro.vTPrest),
      valorLivro: formatarValorBR(agregado.vlrContabil),
    });
  }

  const cfopDiff = compararCfop(registro.cfop ? [registro.cfop] : [], agregado.cfops);
  if (cfopDiff) divergencias.push({ ...base, campo: "cfop", ...cfopDiff });

  const vIcmsXml = registro.vICMS ?? 0;
  if (vIcmsXml !== agregado.icmsTribut) {
    divergencias.push({
      ...base,
      campo: "icms",
      valorXml: formatarValorBR(vIcmsXml),
      valorLivro: formatarValorBR(agregado.icmsTribut),
    });
  }

  const vBcXml = registro.vBC ?? 0;
  if (vBcXml !== agregado.baseIcms) {
    divergencias.push({
      ...base,
      campo: "baseCalculo",
      valorXml: formatarValorBR(vBcXml),
      valorLivro: formatarValorBR(agregado.baseIcms),
    });
  }

  return divergencias;
}
