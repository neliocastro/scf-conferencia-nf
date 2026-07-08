"use client";

import { useState } from "react";

interface ResultadoTextoProps {
  texto: string;
}

export default function ResultadoTexto({ texto }: ResultadoTextoProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="resultado-texto">
      <div className="resultado-texto__cabecalho">
        <strong>Texto para envio ao cliente</strong>
        <button type="button" onClick={copiar}>
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <textarea readOnly value={texto} rows={24} />
    </div>
  );
}
