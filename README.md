# Comitê de Crédito CrediBrás

Operações de crédito do cooperado, em Google Apps Script com a planilha como banco de dados.
Segue o *Padrão para sistemas internos em Apps Script* e o *Guia de estilo Portal Verde*.

## O caminho da operação

```
Atendente ──enviar──> Análise ──concluir──> Gerente ──votar──> Diretoria ──aprovar──> Liberação (atendente)
   ▲  (Rascunho)         │  (Em análise)     │ (Com o gerente)    │ (Na diretoria)         (Aprovada → Liberada)
   └──── Pendente ◄──────┘                   │                    ├──> Reprovada (fim)
                  análise devolve      ◄─────┘ gerente devolve     └──> devolve ao gerente
Cancelada: a agência desistiu (dá para reativar → volta a Rascunho)
```

| Etapa | Quem | O que faz |
|---|---|---|
| Solicitação | atendente (`usuario`) | cooperado, CPF/CNPJ, **número da operação na mesa de negócios**, modalidade, valor, prazo, finalidade, **checklist** (SPC/Serasa, SCR, cadastro, renda, documentos), **avalista** e **garantias** |
| Análise | `analista` | marca **Ok / Não ok**: capacidade de pagamento, restrições, endividamento (SCR), garantias, documentação; nível de risco, recomendação e parecer. Pode devolver ao atendente (Pendente) |
| Gerente | `gerente` | inclui o **IAP**, vota (favorável/desfavorável) e envia à diretoria. Pode devolver para a análise |
| Diretoria | `diretoria` | aprova, reprova ou devolve ao gerente |
| Liberação | atendente da agência | data da liberação, nº do contrato e observação |

Regra da Matriz: Matriz atua em todas as agências; 001 a 004 só na sua.

## Arquivos

| Arquivo | O que é |
|---|---|
| `Code.gs` | servidor (colar no editor do Apps Script) |
| `app.html` | tela (no editor, criar um arquivo HTML chamado **app**) |
| `testes/` | testes com planilha simulada (não vão para o Apps Script) |

## Instalar

1. Crie uma planilha Google e abra **Extensões › Apps Script**.
2. Cole o `Code.gs` e crie o arquivo HTML **app** com o conteúdo do `app.html`.
3. Rode **`setup`** e autorize. Você vira dev da Matriz; as abas e os tipos de usuário são criados.
4. **Implantar › Nova implantação › App da Web** — Executar como: **Eu**; Quem pode acessar: **Qualquer pessoa no domínio**.
5. Abra o link `/exec` e confira o rodapé: *Comitê de Crédito · Versão 1 · Publicada em …*.
6. Na aba **Usuários**, cadastre atendentes, analistas, gerentes e diretoria.

## Testes

```bash
node testes/servidor.test.js
```

```bash
node testes/tela.test.js
```

O teste da tela usa o Chromium do Playwright. Se o CDN do Font Awesome estiver bloqueado, aponte `FA_LOCAL` para um `all.min.js` 6.5.2 local.

## Testar sem o Apps Script

```bash
node demo/montar.js
```

```bash
cd demo && python3 -m http.server 8080
```

Abra `http://localhost:8080`. O `Code.gs` roda no próprio navegador com uma planilha simulada (guardada no navegador),
já com pessoas e operações de exemplo. A faixa amarela embaixo, à esquerda, troca a pessoa conectada; **Recomeçar** volta
aos dados de exemplo. Depois de mudar o `Code.gs` ou o `app.html`, rode `node demo/montar.js` de novo.
