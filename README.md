# Treino do Milo

App de celular para treinar o Milo (fox terrier de pelo curto, 6 anos) com **reforço positivo**: sessões curtas, palavra marcadora "isso!", clicker, controle de xixi e cocô, progresso por comando e truque, atividade física e a regra "nada é de graça".

É um **PWA**: abre no navegador, pode ser instalado na tela de início e **funciona sem internet**. Os dados ficam guardados no próprio celular e, com a **casa compartilhada** (Fase 2), são sincronizados entre os celulares por uma API própria, que também manda os lembretes de saída com o app fechado.

- **App:** https://lucasopinto.github.io/treino-do-milo/
- **API:** veja [`api/README.md`](api/README.md) (endpoints, testes e como publicar no Render + Neon + cron-job.org)

---

## O que tem

| Tela | O que faz |
|---|---|
| **Painel** | Relógio, data, próxima saída de xixi com contagem regressiva, resumo do dia, botões rápidos, quem está usando (Lucas ou Pai) |
| **Treino** | Escolhe comando/truque e duração (5, 7, 10 min ou outro), timer grande, botões Acerto/Erro, clicker que conta acerto, aviso aos 30 s e no fim (som + vibração), dica após 3 erros seguidos, tela sempre acesa |
| **Clicker** | Botão enorme, som gerado na hora com latência mínima, 3 sons e volume |
| **Xixi** | Registro em 1 toque ("lá fora"), acidente com cômodo e lembrete do produto enzimático, agenda de saídas, lembretes, gráficos de 4 semanas e horários com mais acidentes |
| **Progresso** | 4 níveis por comando com passo a passo, critério de acerto e de avanço; sugere subir de nível com 80% em 3 sessões seguidas; truques liberados um de cada vez |
| **Atividade** | Cronômetro de passeio e brincadeira, registro manual, anel da meta diária |
| **Nada é de graça** | Checklist diário com histórico de 4 semanas |
| **Histórico / Estatísticas** | Linha do tempo com filtros; gráficos semanais e mensais; Lucas × Pai |
| **Casa compartilhada** | Criar casa ou entrar com código de convite, lista de celulares, sincronização automática, avisos de saída com o app fechado (Web Push) |
| **Configurações** | Nome e foto, treinadores, refeições e saídas, meta, sons, tema, backup/importação em JSON, dados de exemplo |

---

## Rodar no computador

Precisa do **Node.js 22.18 ou mais novo** (recomendado: 24).

```bash
cd web
npm install
npm run dev
```

Abra http://localhost:5173. Para ver os gráficos cheios, vá em **Mais → Configurações → Dados de exemplo → Carregar**.

Para abrir no celular na mesma rede Wi-Fi: `npm run dev:host` e acesse o endereço "Network" que aparecer. Isso serve para olhar as telas; **instalar o app e funcionar offline exige HTTPS**, então para isso use o GitHub Pages (abaixo).

### Testes

```bash
cd web
npm test            # roda uma vez
npm run test:watch  # fica rodando enquanto você edita
npm run typecheck   # checa os tipos do TypeScript
```

Os testes cobrem as regras de negócio: agenda e lembretes de saída, sequência sem acidentes, timer (pausa, aviso de 30 s, fim, 3 erros seguidos), critério de avanço de nível, regra dos truques, estatísticas, checklist, linha do tempo, backup (exportar, importar, mesclar) e os dados de exemplo.

### Gerar o build

```bash
cd web
npm run build      # gera web/dist
npm run preview    # serve o build em http://localhost:4173
```

> **Windows (Git Bash):** se for gerar o build para o GitHub Pages localmente, use `MSYS_NO_PATHCONV=1 BASE_PATH=/treino-do-milo/ npm run build`. Sem o `MSYS_NO_PATHCONV=1`, o Git Bash troca `/treino-do-milo/` por um caminho do disco. No PowerShell: `$env:BASE_PATH='/treino-do-milo/'; npm run build`. O deploy automático não precisa disso.

---

## Publicar no GitHub Pages (grátis)

O repositório já tem o workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que testa, gera o build e publica a cada `push` na `main`.

1. Crie um repositório no GitHub chamado `treino-do-milo` (pode ser privado só em planos pagos; no gratuito, o Pages exige repositório público).
2. No computador:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/treino-do-milo.git
   git push -u origin main
   ```
3. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Acompanhe em **Actions**. Quando ficar verde, o app estará em `https://SEU-USUARIO.github.io/treino-do-milo/`.

Se der outro nome ao repositório, o endereço muda junto (o workflow ajusta sozinho).

---

## Instalar no celular

### Android (Chrome)

1. Abra o endereço do app no **Chrome**.
2. Toque no menu **⋮** → **Instalar app** (ou **Adicionar à tela inicial**).
3. Abra pelo ícone. Na primeira vez, toque em **Ativar avisos de saída** na tela Xixi e permita as notificações.

### iPhone (Safari)

1. Abra o endereço no **Safari** (precisa ser o Safari).
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.
3. Abra **pelo ícone** (não pelo Safari). Só assim as notificações funcionam (iOS 16.4 ou mais novo).
4. Na tela Xixi, toque em **Ativar avisos de saída**.

### Usar os mesmos dados nos dois celulares

Precisa da API publicada (passo a passo em [`api/README.md`](api/README.md#publicar-grátis-render--neon--cron-joborg)).

1. No celular A: **Mais → Casa compartilhada → Criar casa**. Aparece um código de 6 letras, que vale uma vez por 24 h.
2. No celular B: **Mais → Casa compartilhada → Entrar com um código**.
3. Nos dois: **Ligar avisos neste celular** e depois **Testar**.

Os registros que já estavam em cada celular são juntados, sem perder nada. Depois disso:
- o app sincroniza sozinho: ao abrir, ao voltar para ele, depois de cada registro e a cada minuto com o app aberto;
- sem internet, tudo fica guardado e é enviado depois;
- se o mesmo registro for editado nos dois celulares, vale a edição mais recente.

Sem a API, dá para juntar os dados por backup: em **Mais → Configurações → Backup → Enviar backup** no celular A, e **Importar → Juntar** no celular B.

---

## Limitações conhecidas (Fase 1)

**Lembretes e notificações**
- **Com a casa compartilhada e os avisos ligados**, o servidor manda o lembrete com o app fechado. Ele pode chegar com até ~1 min de atraso, que é o intervalo do cron. Se o celular ficar mais de 15 min sem sinal, aquele aviso é descartado.
- **Sem os avisos do servidor**, quem avisa é o próprio app, que precisa estar aberto ou ter sido minimizado há pouco. No Android o aviso pode atrasar com o app minimizado. No iPhone, na prática só funciona com o app aberto.
- **iPhone:** as notificações exigem o app **instalado na tela de início**, a partir do iOS 16.4.
- Se a notificação do sistema for negada, o app ainda avisa com **alerta na tela + som + vibração** quando estiver aberto.
- Quando os avisos do servidor estão ligados, o aviso interno do app fica desligado naquele celular, para não avisar duas vezes. Se o servidor cair, aquele celular fica sem lembrete até ele voltar.

**Som, vibração e tela acesa**
- **Vibração não existe no iPhone** (o Safari não oferece). Lá o retorno é por som e animação.
- No iPhone, com a **chave de silencioso** ligada, os sons do app podem não tocar.
- O som só é liberado depois do **primeiro toque** na tela (regra dos navegadores).
- **Tela acesa (Wake Lock):** funciona no Chrome do Android e no Safari a partir do iOS 16.4; no app instalado no iPhone, de forma confiável a partir do iOS 18.4. Se não houver suporte, a tela pode apagar durante a sessão (a sessão continua contando certo, porque o timer usa o relógio).

**Dados e sincronização**
- **Sem casa compartilhada**, os dados ficam **só no celular**. Se o app for desinstalado, os dados do navegador forem limpos ou (no iPhone) o app ficar semanas sem uso, o sistema pode apagar tudo. Faça backup de vez em quando. Com a casa, uma cópia fica no servidor.
- **Conflito é por registro inteiro:** vale a última edição. Se você e seu pai marcarem itens **diferentes** do checklist do mesmo dia **sem internet**, ao sincronizar fica só a marcação mais recente. Com internet isso não acontece, porque cada marcação é enviada em segundos.
- As configurações (nome, foto, agenda, sons, meta) são **da casa**: mudar num celular muda no outro.
- O app confia no relógio do celular para decidir a edição mais recente. Um relógio adiantado mais de 5 min é corrigido pelo servidor; um relógio atrasado pode fazer uma edição perder para uma mais antiga.
- O cronômetro de atividade e a sessão em andamento ficam no próprio aparelho: se você trocar de celular no meio, eles não vão junto.
- **Planos grátis:**
  - O Render suspende a API se a conta passar de 750 h no mês. Com 1 serviço, isso não acontece.
  - O Neon suspende o banco se passar de 100 h de computação. A API foi feita para o banco dormir quando ninguém está usando.
  - Os limites dos planos podem mudar. Se a API ficar fora do ar, o app continua funcionando no celular e sincroniza quando ela voltar.
- O limite de tentativas de código de convite fica em memória: reinicia quando a API reinicia.

**Outros**
- No Windows com o *Controle de Aplicativos Inteligente* ligado, alguns binários do Vite 8 são bloqueados. Por isso o projeto usa Vite 7 e o Rollup em WebAssembly (`overrides` no `package.json`). Não afeta o app nem o deploy.
- Pelo mesmo motivo, no Windows a API usa o SQLAlchemy em Python puro e o SQLite (veja [`api/README.md`](api/README.md)). No servidor, que roda Linux, nada disso se aplica.
- `npm audit` aponta avisos em dependências de **build** do gerador do service worker (workbox-build). Elas não vão para o app publicado.

---

## Estrutura

```
treino-do-milo/
├─ .github/workflows/
│  ├─ deploy.yml                  # testa, gera build e publica o app no GitHub Pages
│  └─ api.yml                     # testa a API (SQLite e PostgreSQL) e monta a imagem Docker
├─ render.yaml                    # blueprint do Render para a API
├─ shared/merge-cases.json        # casos da regra "o mais recente vence", testados no app e na API
├─ api/                           # Fase 2: FastAPI + SQLAlchemy + Alembic (veja api/README.md)
│  ├─ app/                        # rotas, modelos, sincronização, Web Push, agenda dos lembretes
│  ├─ alembic/                    # migrações do banco
│  └─ tests/                      # pytest
└─ web/
   ├─ public/                     # ícones, sw-extra.js (cliques em notificação; push na Fase 2)
   └─ src/
      ├─ app/                     # rotas, layout, barra inferior
      ├─ components/              # botões, cards, folha inferior, anel/barra de progresso, gráficos
      ├─ content/skills.ts        # comandos e truques: níveis, passo a passo, critérios
      ├─ db/                      # banco (Dexie), gravação, backup
      ├─ domain/                  # regras de negócio puras + testes (*.test.ts)
      ├─ features/                # uma pasta por tela
      ├─ hooks/                   # dados ao vivo, relógio, quem treina, tela acesa
      ├─ lib/                     # som, vibração, notificações, tema, imagem
      ├─ sync/                    # Fase 2: cliente da API, motor de sincronização, Web Push
      └─ seed/demo.ts             # dados de exemplo
```

**Decisões técnicas**
- Todo registro tem `id` (UUID), `createdAt`, `updatedAt`, `deletedAt` (exclusão lógica) e `deviceId`. Isso permite mesclar backups hoje e sincronizar na Fase 2 com a mesma regra ("o mais recente vence").
- O timer da sessão é uma máquina de estados pura baseada no **horário de término**, não em somar segundos: não atrasa se o celular desacelerar o app.
- O clicker dispara no `pointerdown` (o `click` chega 50 a 300 ms atrasado no celular), com um único `AudioContext` preparado no primeiro toque.
- Endereços com `#/` (HashRouter) para funcionar no GitHub Pages e offline sem configurar servidor.
- **Sincronização offline-first:** o app grava sempre no celular. Na sincronização, envia os registros que este aparelho editou depois do último envio e recebe tudo que o servidor gravou depois do último `seq`. Uma edição sempre ganha `updatedAt` maior que a versão que ela editou, mesmo com o relógio atrasado.

---

## Testes de tudo

```bash
cd web && npm test                         # app: regras de negócio e sincronização com dois "celulares"
cd api && .venv/Scripts/python -m pytest   # API: casa, sincronização, lembretes, Web Push
```
