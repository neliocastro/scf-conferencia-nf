// Leitura de arquivos com re-tentativas. Necessário porque arquivos em armazenamento
// em nuvem (Google Drive, OneDrive) podem estar "somente online": o navegador dispara
// NotReadableError quando o arquivo ainda não foi materializado localmente. Uma nova
// tentativa após um pequeno atraso costuma ter sucesso, pois o download terminou nesse
// intervalo.

const TENTATIVAS_PADRAO = 3;
const ATRASO_BASE_MS = 400;

function ehErroDeLeitura(e: unknown): boolean {
  return e instanceof DOMException && (e.name === "NotReadableError" || e.name === "NotFoundError");
}

export function mensagemErroLeitura(nome: string, e: unknown): string {
  if (ehErroDeLeitura(e)) {
    return `Não foi possível ler o arquivo "${nome}". Se os arquivos estiverem no Google Drive ou outro armazenamento em nuvem, copie-os para uma pasta local do computador (ex.: Downloads) antes de enviar — arquivos "somente online" podem falhar na leitura.`;
  }
  const detalhe = e instanceof Error ? e.message : String(e);
  return `Não foi possível ler o arquivo "${nome}": ${detalhe}`;
}

async function comRetry<T>(
  nome: string,
  ler: () => Promise<T>,
  tentativas: number,
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await ler();
    } catch (e) {
      ultimoErro = e;
      const podeRetentar = ehErroDeLeitura(e) && i < tentativas - 1;
      if (!podeRetentar) break;
      await new Promise((r) => setTimeout(r, ATRASO_BASE_MS * (i + 1)));
    }
  }
  throw new Error(mensagemErroLeitura(nome, ultimoErro));
}

export function lerTexto(arquivo: File, tentativas = TENTATIVAS_PADRAO): Promise<string> {
  return comRetry(arquivo.name, () => arquivo.text(), tentativas);
}

export function lerBuffer(arquivo: File, tentativas = TENTATIVAS_PADRAO): Promise<ArrayBuffer> {
  return comRetry(arquivo.name, () => arquivo.arrayBuffer(), tentativas);
}
