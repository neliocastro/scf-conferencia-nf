// Parser CSV mínimo (RFC 4180): respeita campos entre aspas com vírgulas e aspas
// internas escapadas (""), sem depender de bibliotecas externas para o caminho CSV
// (o formato real de entrada do livro fiscal), evitando qualquer inferência de tipo
// automática que faria números/códigos perderem zeros à esquerda ou virarem number.

export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;
  let i = 0;

  const normalizado = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  while (i < normalizado.length) {
    const c = normalizado[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (normalizado[i + 1] === '"') {
          campo += '"';
          i += 2;
          continue;
        }
        dentroDeAspas = false;
        i += 1;
        continue;
      }
      campo += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      linha.push(campo);
      campo = "";
      i += 1;
      continue;
    }
    if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
      i += 1;
      continue;
    }
    campo += c;
    i += 1;
  }

  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => !(l.length === 1 && l[0].trim() === ""));
}
