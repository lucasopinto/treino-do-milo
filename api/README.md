# API do Treino do Milo (Fase 2)

FastAPI + SQLAlchemy + Alembic. Guarda os dados da "casa", sincroniza os celulares e manda os lembretes de saída por Web Push.

A documentação interativa fica em **`/docs`**, com todos os endpoints, exemplos e a opção de testar pelo navegador. Ela fica, por exemplo, em http://localhost:8000/docs ou em `https://<sua-api>.onrender.com/docs`.

## Endpoints

| Método | Caminho | Para quê | Autenticação |
|---|---|---|---|
| GET | `/health` | A API está no ar (não acorda o banco) | — |
| GET | `/health/db` | A API e o banco estão no ar | — |
| POST | `/households` | Cria uma casa e devolve o token deste aparelho e um código de convite | — |
| POST | `/households/join` | Entra numa casa com o código (máx. 10 tentativas a cada 10 min por IP) | — |
| POST | `/households/invites` | Gera um código novo (vale uma vez, por 24 h) | token |
| GET | `/households/me` | Dados da casa e lista de aparelhos | token |
| PATCH | `/devices/me` | Renomeia este aparelho | token |
| DELETE | `/devices/{id}` | Remove um aparelho (ou sai da casa). Se o último sair, a casa é apagada do servidor | token |
| POST | `/sync/push` | Envia registros criados ou editados (até 500 por vez) | token |
| GET | `/sync/pull?since=N` | Recebe o que mudou depois do `seq` N (páginas de 500) | token |
| GET | `/push/vapid-public-key` | Chave pública para o app se inscrever no push | — |
| POST/DELETE | `/push/subscribe` | Liga ou desliga os avisos neste aparelho | token |
| POST | `/push/test` | Manda um aviso de teste para este aparelho | token |
| POST | `/cron/tick` | Chamado a cada minuto pelo cron; envia os avisos que chegaram na hora | cabeçalho `X-Cron-Secret` |

O token vai no cabeçalho `Authorization: Bearer <token>`. O servidor guarda só o hash dele.

### Como a sincronização decide

- Cada registro do app tem `updatedAt` e `deviceId`. Para o mesmo registro, **vence o `updatedAt` maior**. Se empatar, vence o `deviceId` maior. É a mesma regra de `web/src/domain/merge.ts`, e os casos em [`shared/merge-cases.json`](../shared/merge-cases.json) rodam nos testes dos dois lados.
- Cada gravação aceita recebe um número `seq` crescente da casa, e os aparelhos pedem "o que mudou depois do N". Assim, um celular com relógio errado não faz o outro perder mudanças.
- Um `updatedAt` mais de 5 minutos no futuro (relógio adiantado) é trocado por "agora", e o app recebe a versão corrigida.
- Se o aparelho manda uma edição mais velha do que a do servidor, ela não entra e o app recebe a versão do servidor (`corrections`).
- Exclusões viajam como `deletedAt` preenchido.

### Por que o `/cron/tick` não acorda o banco

O banco grátis do Neon dorme depois de ~5 min sem uso e o plano dá 100 horas de computação por mês. Um tick por minuto consultando o banco o deixaria acordado o mês inteiro (~186 h). Por isso a agenda de saídas fica **em memória** e só é relida quando muda: configurações sincronizadas, inscrições ou aparelhos. O banco só é consultado quando há um aviso para mandar.

## Rodar no computador

Precisa do Python 3.14.

```bash
cd api
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt     # no Linux/Mac: .venv/bin/python
.venv/Scripts/python -m alembic upgrade head                    # cria o banco SQLite (milo.db)
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

> **Windows com Controle de Aplicativos Inteligente:** ele bloqueia as partes compiladas do SQLAlchemy. Instale assim:
> `DISABLE_SQLALCHEMY_CEXT=1 .venv/Scripts/python -m pip install --no-binary sqlalchemy -r requirements-dev.txt`
> O driver do PostgreSQL também é bloqueado, então no computador use o SQLite, que é o padrão. Os testes no PostgreSQL rodam no GitHub Actions.

Para testar os avisos no computador, crie `api/.env` a partir de `.env.example` e gere as chaves com `python -m app.tools.vapid`.

Com a API rodando, o app em `npm run dev` já aponta para `http://localhost:8000` (está em `web/.env.development`).

### Testes

```bash
cd api
.venv/Scripts/python -m pytest
```

Os testes cobrem:
- criar e entrar na casa, convites, limite de tentativas, remover aparelho;
- sincronização: o mais recente vence, correções, paginação, casas separadas, relógio adiantado;
- agenda dos lembretes e dedupe;
- um envio de Web Push **real** para um serviço local, conferindo a criptografia (aes128gcm) e a assinatura VAPID;
- migrações iguais aos modelos.

No CI os mesmos testes rodam também num PostgreSQL 17.

## Publicar (grátis): Render + Neon + cron-job.org

Limites dos planos grátis conferidos em novembro de 2026:
- **Render:** 750 h/mês, o que dá para 1 serviço ligado o mês todo, e dorme após 15 min sem acesso.
- **Neon:** 100 h de computação e 1 GB por projeto.
- **cron-job.org:** grátis, pode chamar a cada minuto.

### 1. Banco no Neon
1. Crie uma conta em https://neon.com e um projeto, com **região AWS US East (N. Virginia)**, a mesma do Render.
2. Em **Connect**, copie a *connection string* (`postgresql://…?sslmode=require`).

### 2. Chaves do Web Push
No computador, dentro de `api/`:
```bash
.venv/Scripts/python -m app.tools.vapid
```
Guarde as duas linhas. Gere uma vez só: se trocar as chaves, cada celular precisa ligar os avisos de novo.

### 3. API no Render
1. Crie uma conta em https://render.com e conecte o GitHub.
2. **New → Blueprint** e escolha o repositório `treino-do-milo`. Ele lê o [`render.yaml`](../render.yaml).
3. Preencha as variáveis:
   - `MILO_DATABASE_URL`: a URL do Neon;
   - `MILO_VAPID_PUBLIC_KEY` e `MILO_VAPID_PRIVATE_KEY`: as chaves geradas no passo 2;
   - `MILO_VAPID_SUBJECT`: `mailto:` mais o seu e-mail.
   - O `MILO_CRON_SECRET` é gerado sozinho. Copie o valor dele depois, em **Environment**.
4. Espere o deploy. Abra `https://<nome>.onrender.com/health/db`: deve aparecer `{"status":"ok","db":"ok"}`.

### 4. Cron a cada minuto (cron-job.org)
1. Crie uma conta em https://cron-job.org → **Create cronjob**.
2. URL: `https://<nome>.onrender.com/cron/tick`, execução **a cada 1 minuto**.
3. Em **Advanced**: método **POST** e cabeçalho `X-Cron-Secret` com o valor de `MILO_CRON_SECRET`.
4. Salve e confira no histórico que as respostas são `200`.

Isso também mantém a API acordada, então o app não espera ~1 min pelo servidor.

### 5. Ligar o app à API
No GitHub, no repositório: **Settings → Secrets and variables → Actions → Variables → New repository variable**:
- Name: `API_URL`
- Value: `https://<nome>.onrender.com` (sem barra no fim)

Depois rode de novo o workflow **Publicar no GitHub Pages** (Actions → Run workflow) para o app ser gerado com esse endereço.

### 6. Nos celulares
1. No primeiro celular: **Mais → Casa compartilhada → Criar casa**. Aparece um código.
2. No segundo: **Mais → Casa compartilhada → Entrar com um código**.
3. Em cada um: **Ligar avisos neste celular** e depois **Testar**.

## Rodar com Docker (opcional)

```bash
docker build -t treino-do-milo-api api
docker run -p 8000:8000 --env-file api/.env treino-do-milo-api
```
A imagem aplica as migrações ao subir. Sem `MILO_DATABASE_URL`, usa SQLite dentro do contêiner, e os dados se perdem ao recriá-lo.
