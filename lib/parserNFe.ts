import type { ErroParse, NFeRegistro } from "./tipos";
import { parseValorXML, parseDataISOdeXML } from "./numerosBr";
import { parseXml, getTexto, getPrimeiroElemento } from "./xmlUtils";
import { lerTexto } from "./lerArquivo";

export function parseNFeXml(texto: string, arquivo: string): NFeRegistro {
  const doc = parseXml(texto);

  const chave = getTexto(doc, "chNFe");
  if (!chave) {
    throw new Error("chave de acesso (chNFe) não encontrada");
  }

  const icmsTot = getPrimeiroElemento(doc, "ICMSTot");
  if (!icmsTot) {
    throw new Error("bloco total/ICMSTot não encontrado");
  }

  const cfops = new Set<string>();
  for (const el of Array.from(doc.getElementsByTagName("CFOP"))) {
    const valor = el.textContent?.trim();
    if (valor) cfops.add(valor);
  }

  return {
    chave,
    dataEmissao: parseDataISOdeXML(getTexto(doc, "dhEmi")),
    numero: getTexto(doc, "nNF") ?? "",
    serie: getTexto(doc, "serie") ?? "",
    cfops: Array.from(cfops),
    vBC: parseValorXML(getTexto(icmsTot, "vBC")),
    vICMS: parseValorXML(getTexto(icmsTot, "vICMS")),
    vIPI: parseValorXML(getTexto(icmsTot, "vIPI")),
    vProd: parseValorXML(getTexto(icmsTot, "vProd")),
    vNF: parseValorXML(getTexto(icmsTot, "vNF")),
    cStat: getTexto(doc, "cStat") ?? "",
    arquivo,
  };
}

export async function parseNFeArquivos(
  arquivos: File[],
  onProgresso?: (processados: number) => void,
): Promise<{ registros: NFeRegistro[]; erros: ErroParse[] }> {
  const registros: NFeRegistro[] = [];
  const erros: ErroParse[] = [];

  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i];
    try {
      const texto = await lerTexto(arquivo);
      registros.push(parseNFeXml(texto, arquivo.name));
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
