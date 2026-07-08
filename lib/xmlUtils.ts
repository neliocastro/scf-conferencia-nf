// Helpers pequenos para navegar XML de NFe/CTe via DOMParser. Como esses documentos
// usam namespace default (sem prefixo), getElementsByTagName pelo nome local funciona
// normalmente no navegador.

export function parseXml(texto: string): Document {
  const doc = new DOMParser().parseFromString(texto, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("XML mal formado");
  }
  return doc;
}

export function getTexto(raiz: Document | Element, tag: string): string | null {
  const el = raiz.getElementsByTagName(tag)[0];
  const texto = el?.textContent?.trim();
  return texto ? texto : null;
}

export function getPrimeiroElemento(raiz: Document | Element, tag: string): Element | null {
  return raiz.getElementsByTagName(tag)[0] ?? null;
}
