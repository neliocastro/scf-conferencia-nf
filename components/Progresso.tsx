interface ProgressoProps {
  mensagem: string;
  atual: number;
  total: number;
}

export default function Progresso({ mensagem, atual, total }: ProgressoProps) {
  const percentual = total > 0 ? Math.round((atual / total) * 100) : 0;

  return (
    <div className="progresso">
      <div className="progresso__spinner" aria-hidden="true" />
      <p>{mensagem}</p>
      {total > 0 && (
        <>
          <div className="progresso__barra">
            <div className="progresso__barra-preenchida" style={{ width: `${percentual}%` }} />
          </div>
          <span className="progresso__contador">
            {atual} / {total}
          </span>
        </>
      )}
    </div>
  );
}
