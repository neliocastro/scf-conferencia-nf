import type { CTeRegistro, ErroParse } from "./tipos";
import { parseValorXML, parseDataISOdeXML } from "./numerosBr";
import { parseXml, getTexto, getPrimeiroElemento } from "./xmlUtils";
import { lerTexto } from "./lerArquivo";

// A tag filha de <ICMS> varia por CST (ver amostras reais). Cada variante nomeia os
// campos de base de cálculo/imposto de forma diferente; variantes isentas/Simples
// Nacional não têm base/imposto.
const VARIANTES_ICMS: Record<string, { base: string | null; imposto: string | null }> = {
  ICMS00: { base: "vBC", imposto: "vICMS" },
  ICMS20: { base: "vBC", imposto: "vICMS" },
  ICMS45: { base: null, imposto: null },
  ICMS60: { base: "vBCSTRet", imposto: "vICMSSTRet" },
  ICMS90: { base: "vBC", imposto: "vICMS" },
  ICMSOutraUF: { base: "vBCOutraUF", imposto: "vICMSOutraUF" },
  ICMSSN: { base: null, imposto: null },
};

function extrairIcms(doc: Document): { variante: string | null; vBC: number | null; vICMS: number | null } {
  const icmsEl = getPrimeiroElemento(doc, "ICMS");
  const variantEl = icmsEl?.children[0] ?? null;
  if (!icmsEl || !variantEl) {
    return { variante: null, vBC: null, vICMS: null };
  }

  const variante = variantEl.tagName;
  const conhecida = VARIANTES_ICMS[variante];

  if (conhecida) {
    if (conhecida.base == null || conhecida.imposto == null) {
      return { variante, vBC: null, vICMS: null };
    }
    return {
      variante,
      vBC: parseValorXML(getTexto(variantEl, conhecida.base)),
      vICMS: parseValorXML(getTexto(variantEl, conhecida.imposto)),
    };
  }

  // Variante não catalogada: procura genericamente a primeira tag que começa com
  // "vBC" e a primeira que começa com "vICMS" dentro do bloco.
  const filhos = Array.from(variantEl.children);
  const baseEl = filhos.find((el) => el.tagName.startsWith("vBC"));
  const impostoEl = filhos.find((el) => el.tagName.startsWith("vICMS"));

  return {
    variante,
    vBC: baseEl ? parseValorXML(baseEl.textContent) : null,
    vICMS: impostoEl ? parseValorXML(impostoEl.textContent) : null,
  };
}

export function parseCTeXml(texto: string, arquivo: string): CTeRegistro {
  const doc = parseXml(texto);

  const chave = getTexto(doc, "chCTe");
  if (!chave) {
    throw new Error("chave de acesso (chCTe) não encontrada");
  }

  const { variante, vBC, vICMS } = extrairIcms(doc);

  return {
    chave,
    dataEmissao: parseDataISOdeXML(getTexto(doc, "dhEmi")),
    numero: getTexto(doc, "nCT") ?? "",
    serie: getTexto(doc, "serie") ?? "",
    cfop: getTexto(doc, "CFOP") ?? "",
    vTPrest: parseValorXML(getTexto(doc, "vTPrest")),
    vRec: parseValorXML(getTexto(doc, "vRec")),
    icmsVariante: variante,
    vBC,
    vICMS,
    cStat: getTexto(doc, "cStat") ?? "",
    arquivo,
  };
}

export async function parseCTeArquivos(
  arquivos: File[],
  onProgresso?: (processados: number) => void,
): Promise<{ registros: CTeRegistro[]; erros: ErroParse[] }> {
  const registros: CTeRegistro[] = [];
  const erros: ErroParse[] = [];

  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i];
    try {
      const texto = await lerTexto(arquivo);
      registros.push(parseCTeXml(texto, arquivo.name));
    } catch (e) {
      erros.push({
        arquivo: arquivo.name,
        mensagem: e instanceof Error ? e.message : String(e),
      });
    }
    onProgresso?.(i + 1);
  }

  return { registros, erros };
}
