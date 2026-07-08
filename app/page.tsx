"use client";

import { useState } from "react";
import AreaUpload from "@/components/AreaUpload";
import Progresso from "@/components/Progresso";
import ResultadoTexto from "@/components/ResultadoTexto";
import { parseNFeArquivos } from "@/lib/parserNFe";
import { parseCTeArquivos } from "@/lib/parserCTe";
import { carregarLivro } from "@/lib/livroLoader";
import { reconciliarNFe, reconciliarCTe, separarLinhasPorTipo } from "@/lib/casamento";
import { derivarPeriodo } from "@/lib/periodo";
import { gerarTextoEmail } from "@/lib/emailTexto";
import type { ErroParse } from "@/lib/tipos";

type Estado = "idle" | "processando" | "concluido" | "erro";

interface Resultado {
  periodo: string;
  texto: string;
  avisos: string[];
  errosParse: ErroParse[];
}

export default function Home() {
  const [arquivosNFe, setArquivosNFe] = useState<File[]>([]);
  const [arquivosCTe, setArquivosCTe] = useState<File[]>([]);
  const [arquivoLivro, setArquivoLivro] = useState<File | null>(null);

  const [estado, setEstado] = useState<Estado>("idle");
  const [mensagem, setMensagem] = useState("");
  const [progressoAtual, setProgressoAtual] = useState(0);
  const [progressoTotal, setProgressoTotal] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const podeProcessar = arquivoLivro != null && (arquivosNFe.length > 0 || arquivosCTe.length > 0);

  async function processar() {
    if (!arquivoLivro) return;

    setEstado("processando");
    setErro(null);
    setResultado(null);

    try {
      const totalXml = arquivosNFe.length + arquivosCTe.length;
      setProgressoTotal(totalXml);
      setProgressoAtual(0);
      setMensagem("Lendo notas XML...");

      const { registros: nfeRegistros, erros: errosNFe } = await parseNFeArquivos(arquivosNFe, (p) =>
        setProgressoAtual(p),
      );
      const { registros: cteRegistros, erros: errosCTe } = await parseCTeArquivos(arquivosCTe, (p) =>
        setProgressoAtual(arquivosNFe.length + p),
      );

      setMensagem("Lendo livro fiscal...");
      const { linhas, avisos } = await carregarLivro(arquivoLivro);

      setMensagem("Comparando XML com o livro fiscal...");
      const { linhasNFe, linhasCTe } = separarLinhasPorTipo(linhas);
      const resultadoNFe = reconciliarNFe(nfeRegistros, linhasNFe);
      const resultadoCTe = reconciliarCTe(cteRegistros, linhasCTe);

      const periodo = derivarPeriodo(linhas);
      const texto = gerarTextoEmail(periodo, resultadoNFe, resultadoCTe);

      setResultado({
        periodo,
        texto,
        avisos,
        errosParse: [...errosNFe, ...errosCTe],
      });
      setEstado("concluido");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEstado("erro");
    }
  }

  function reiniciar() {
    setArquivosNFe([]);
    setArquivosCTe([]);
    setArquivoLivro(null);
    setResultado(null);
    setErro(null);
    setEstado("idle");
  }

  return (
    <main className="pagina">
      <h1>Conferência de Notas Fiscais</h1>
      <p className="subtitulo">
        Envie os XML de NFe e CTe recebidos e o livro fiscal do decêndio para gerar o texto de
        conferência pronto para enviar ao cliente. Nada é enviado a um servidor — todo o
        processamento acontece aqui no navegador.
      </p>

      {estado !== "processando" && (
        <section className="areas-upload">
          <AreaUpload
            titulo="XML de NFe (entrada)"
            descricao="Selecione ou arraste os arquivos .xml das NFe recebidas"
            multiple
            accept=".xml"
            arquivos={arquivosNFe}
            onArquivosSelecionados={setArquivosNFe}
          />
          <AreaUpload
            titulo="XML de CTe"
            descricao="Selecione ou arraste os arquivos .xml dos CTe recebidos"
            multiple
            accept=".xml"
            arquivos={arquivosCTe}
            onArquivosSelecionados={setArquivosCTe}
          />
          <AreaUpload
            titulo="Livro fiscal"
            descricao="Selecione o arquivo .csv ou .xlsx do livro fiscal do decêndio"
            multiple={false}
            accept=".csv,.xlsx"
            arquivos={arquivoLivro ? [arquivoLivro] : []}
            onArquivosSelecionados={(arquivos) => setArquivoLivro(arquivos[0] ?? null)}
          />
        </section>
      )}

      {estado !== "processando" && estado !== "concluido" && (
        <button className="botao-processar" type="button" disabled={!podeProcessar} onClick={processar}>
          Processar
        </button>
      )}

      {estado === "processando" && (
        <Progresso mensagem={mensagem} atual={progressoAtual} total={progressoTotal} />
      )}

      {estado === "erro" && erro && (
        <div className="aviso aviso--erro">
          <strong>Não foi possível concluir a conferência.</strong>
          <p>{erro}</p>
        </div>
      )}

      {estado === "concluido" && resultado && (
        <>
          <ResultadoTexto texto={resultado.texto} />

          {(resultado.avisos.length > 0 || resultado.errosParse.length > 0) && (
            <div className="aviso">
              <strong>Observações do processamento</strong>
              <ul>
                {resultado.avisos.map((a, i) => (
                  <li key={`aviso-${i}`}>{a}</li>
                ))}
                {resultado.errosParse.map((e, i) => (
                  <li key={`erro-${i}`}>
                    {e.arquivo}: {e.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button className="botao-processar botao-processar--secundario" type="button" onClick={reiniciar}>
            Iniciar nova conferência
          </button>
        </>
      )}
    </main>
  );
}
