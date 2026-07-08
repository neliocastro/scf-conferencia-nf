# Conferência de Notas Fiscais — SCF Contabilidade

Ferramenta web para conferir, por decêndio, se os dados das notas fiscais recebidas em XML
(NFe de entrada e CTe de transporte) batem com o que foi registrado no livro fiscal
(CSV ou XLSX), gerando um texto pronto para enviar ao cliente.

## Arquitetura

- **Next.js (App Router) + TypeScript**, 100% client-side.
- **Sem backend**: todos os XML/CSV são lidos e comparados no navegador do usuário via File API.
  Nada é enviado a um servidor — os dados fiscais do cliente nunca saem da máquina.
- Isso contorna o limite de tamanho de requisição das funções serverless do Vercel (o volume é de
  ~800 arquivos por decêndio) e mantém o custo de hospedagem em zero (site estático).
- Extração determinística (sem IA): XML lido com `DOMParser` nativo, CSV com parser próprio,
  XLSX com [SheetJS](https://sheetjs.com). Valores monetários são tratados em centavos (inteiro)
  para comparação exata, sem erro de ponto flutuante.

## Como usar

1. Selecione (ou arraste) os XML de NFe, os XML de CTe e o arquivo do livro fiscal (`.csv`/`.xlsx`).
2. Clique em **Processar**.
3. Copie o texto gerado e envie ao cliente.

## Regras de conferência

- **Casamento** por chave de acesso (`chNFe`/`chCTe` = `CHAVE_NFE`); para linhas do livro sem chave,
  fallback por número do documento + série + data de emissão.
- Uma mesma nota pode ocupar várias linhas no livro (por CFOP/alíquota) — os valores são **somados**
  por chave antes de comparar com o total do XML.
- Linhas com `DT_CANCEL` preenchido são **excluídas** da conferência (reportadas à parte).
- CTe é conferido contra as linhas do livro cujo CFOP é de transporte (**1353, 1360, 2353** —
  configurável em `lib/constantes.ts`).
- Comparação de campos **exata** (sem tolerância): data de emissão, valor contábil, CFOP, ICMS, IPI
  e base de cálculo.

## Estrutura

| Caminho | Responsabilidade |
|---|---|
| `lib/numerosBr.ts` | Parsing de valores BR (`1.360,34`) e de XML (`200.00`); datas |
| `lib/parserNFe.ts` / `lib/parserCTe.ts` | Extração dos campos dos XML |
| `lib/livroLoader.ts` | Carga do CSV/XLSX, descarte do rodapé, agrupamento por chave |
| `lib/casamento.ts` | Motor de reconciliação (chave + fallback, separação NFe/CTe) |
| `lib/divergencias.ts` | Comparação campo a campo |
| `lib/periodo.ts` | Deriva o rótulo do decêndio a partir das datas |
| `lib/emailTexto.ts` | Monta o texto final do e-mail |
| `app/page.tsx` | Tela única (upload → processamento → resultado) |

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção (estático)
npm run lint
```

## Deploy no Vercel

Projeto Next.js estático padrão — basta conectar o repositório no Vercel; não requer variáveis de
ambiente nem configuração de runtime.
