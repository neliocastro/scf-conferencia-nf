"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

interface AreaUploadProps {
  titulo: string;
  descricao: string;
  multiple: boolean;
  accept: string;
  arquivos: File[];
  onArquivosSelecionados: (arquivos: File[]) => void;
}

export default function AreaUpload({
  titulo,
  descricao,
  multiple,
  accept,
  arquivos,
  onArquivosSelecionados,
}: AreaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  function filtrarPorExtensao(lista: FileList): File[] {
    const extensoes = accept.split(",").map((e) => e.trim().toLowerCase());
    return Array.from(lista).filter((f) =>
      extensoes.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onArquivosSelecionados(filtrarPorExtensao(e.target.files));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    if (e.dataTransfer.files) onArquivosSelecionados(filtrarPorExtensao(e.dataTransfer.files));
  }

  return (
    <div
      className={`area-upload ${arrastando ? "area-upload--ativa" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <strong>{titulo}</strong>
      <span className="area-upload__descricao">{descricao}</span>
      <span className="area-upload__contador">
        {arquivos.length === 0
          ? "Nenhum arquivo selecionado"
          : `${arquivos.length} arquivo${arquivos.length > 1 ? "s" : ""} selecionado${arquivos.length > 1 ? "s" : ""}`}
      </span>
    </div>
  );
}
