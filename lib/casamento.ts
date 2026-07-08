import type {
  CTeRegistro,
  Divergencia,
  LinhaLivro,
  LivroAgregado,
  NFeRegistro,
  ResultadoReconciliacao,
} from "./tipos";
import { agruparPorChave, agruparPorFallback, chaveFallback, linhaParaAgregadoAvulso } from "./livroLoader";
import { compararCTe, compararNFe } from "./divergencias";
import { CFOPS_TRANSPORTE } from "./constantes";

export function separarLinhasPorTipo(linhas: LinhaLivro[]): {
  linhasNFe: LinhaLivro[];
  linhasCTe: LinhaLivro[];
} {
  const linhasNFe: LinhaLivro[] = [];
  const linhasCTe: LinhaLivro[] = [];
  for (const linha of linhas) {
    if (CFOPS_TRANSPORTE.has(linha.codFiscal)) {
      linhasCTe.push(linha);
    } else {
      linhasNFe.push(linha);
    }
  }
  return { linhasNFe, linhasCTe };
}

function reconciliar<T extends NFeRegistro | CTeRegistro>(
  registros: T[],
  linhasLivro: LinhaLivro[],
  comparar: (registro: T, agregado: LivroAgregado) => Divergencia[],
): ResultadoReconciliacao<T> {
  const linhasCanceladas = linhasLivro.filter((l) => l.dtCancel != null);
  const linhasAtivas = linhasLivro.filter((l) => l.dtCancel == null);

  const { agregados: porChave, semChave } = agruparPorChave(linhasAtivas);

  const registrosPorChave = new Map<string, T>();
  for (const registro of registros) registrosPorChave.set(registro.chave, registro);

  const consumidos = new Set<string>(); // chave do registro XML já casado
  const casadas: ResultadoReconciliacao<T>["casadas"] = [];
  const livroSemXml: LivroAgregado[] = [];

  for (const [chave, agregado] of porChave) {
    const registro = registrosPorChave.get(chave);
    if (registro) {
      casadas.push({ registro, agregado, origemCasamento: "chave" });
      consumidos.add(chave);
    } else {
      livroSemXml.push(agregado);
    }
  }

  const restantesPorFallback = new Map<string, T>();
  for (const registro of registros) {
    if (consumidos.has(registro.chave)) continue;
    restantesPorFallback.set(chaveFallback(registro.numero, registro.serie, registro.dataEmissao), registro);
  }

  const fallbackAgregados = agruparPorFallback(semChave);
  for (const [chaveComposta, agregado] of fallbackAgregados) {
    const registro = restantesPorFallback.get(chaveComposta);
    if (registro) {
      casadas.push({ registro, agregado, origemCasamento: "fallback" });
      consumidos.add(registro.chave);
    } else {
      livroSemXml.push(agregado);
    }
  }

  const semLivro = registros.filter((r) => !consumidos.has(r.chave));

  const cancelados: LivroAgregado[] = [];
  const { agregados: canceladosPorChave, semChave: canceladosSemChave } = agruparPorChave(linhasCanceladas);
  for (const agregado of canceladosPorChave.values()) cancelados.push(agregado);
  for (const linha of canceladosSemChave) cancelados.push(linhaParaAgregadoAvulso(linha));

  const divergencias: Divergencia[] = [];
  for (const { registro, agregado } of casadas) {
    divergencias.push(...comparar(registro, agregado));
  }

  return { casadas, semLivro, livroSemXml, cancelados, divergencias };
}

export function reconciliarNFe(
  registros: NFeRegistro[],
  linhasLivro: LinhaLivro[],
): ResultadoReconciliacao<NFeRegistro> {
  return reconciliar(registros, linhasLivro, compararNFe);
}

export function reconciliarCTe(
  registros: CTeRegistro[],
  linhasLivro: LinhaLivro[],
): ResultadoReconciliacao<CTeRegistro> {
  return reconciliar(registros, linhasLivro, compararCTe);
}
