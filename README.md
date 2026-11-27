# Equipe de Desenvolvimento

O projeto Arquivo Geral do Ministério da Magia — W&W RPG Catalog foi desenvolvido por uma equipe de quatro integrantes, responsáveis pela concepção, desenvolvimento e estruturação do ecossistema de catalogação.

**Integrantes:**

- Erick Joshua Revollo
- Pedro Henrique Lopes Vilela Coelho
- Tiago Bondezan Bazani
- Yuri Shinnishi de Queiroz Rossi

## Guias de Uso e Documentação

- **[Guia Simples de Navegacao (`NAVIGATION_GUIDE.md`)](./NAVIGATION_GUIDE.md)**: Manual básico de navegação pelo software.
- **[Guia de Consulta da API (`API_GUIDE.md`)](./API_GUIDE.md)**: Documentacao dos endpoints REST do Cloud Firestore (`_indexes/{colecao}` e `{colecao}/{id}`), funcoes do modulo ES6 (`js/services/database.js`), exemplos em JavaScript/`curl` e esquemas JSON de todas as quatro colecoes.

---

## Como Executar

### Aplicação Web (React)
```bash
# Entrar no diretorio web e iniciar o servidor de desenvolvimento
npm run dev:web
# ou diretamente dentro de web:
cd web && npm run dev

# Compilar para producao
npm run build:web
```

### Aplicação Móvel (React Native)
```bash
# Iniciar o empacotador Metro do React Native
npm run start:mobile
# ou diretamente dentro de mobile-rn:
cd mobile-rn && npm start
```

---

## Aplicativo Móvel Android (.apk)

A versão compilada e instalável para dispositivos Android esta disponível na release oficial do repositorio com rastreamento automatico de atualizações:

- **Download Direto (.apk):** [WWcatalog.apk (Release v1.2.0)](https://github.com/PHLopesvc07/WWRPG-Catalog/releases/download/v1.2.0/WWcatalog.apk)
- **Pagina da Release:** [Release v1.2.0 no GitHub](https://github.com/PHLopesvc07/WWRPG-Catalog/releases/tag/v1.2.0)

A aplicação mobile oferece:
- Rastreamento automatico de releases via API do GitHub com notificacao e download integrado de novas versoes.
- Navegacao otimizada nativa com Bottom Navigation Bar e Bottom Sheet modal para fichas.
- Consulta direta e em tempo real ao Cloud Firestore (`wwcatalog-10546`) com cache multi-camadas offline.
- Bundles autonomos executaveis para operacao direta (sem bloqueio de CORS em navegadores locais ou WebView Android).

---

## Guias de Uso e Documentacao

- **[Guia Simples de Navegacao (`NAVIGATION_GUIDE.md`)](./NAVIGATION_GUIDE.md)**: Manual pratico explicando como alternar entre abas, utilizar filtros, ordenar itens e navegar na versao web e no aplicativo movel Android.
- **[Guia de Consulta da API (`API_GUIDE.md`)](./API_GUIDE.md)**: Documentacao completa dos endpoints REST do Cloud Firestore (`_indexes/{colecao}` e `{colecao}/{id}`), funcoes do modulo ES6 (`js/services/database.js`), exemplos em JavaScript/`curl` e esquemas JSON de todas as quatro colecoes.

---

## Arquitetura Cloud Firestore e Carregamento Individual

Nenhum arquivo JSON de catalogo ou imagem de criatura fica armazenado localmente no codigo-fonte; todos os dados sao puxados sob demanda do **Cloud Firestore** (`wwcatalog-10546`):
---

## Estrutura de Diretorios

```text
WWcatalog/
├── package.json                # Scripts unificados de build e desenvolvimento
├── web/                        # Aplicacao Web em React (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── components/         # Componentes React modulares (Header, TabsNav, Archives, Forms)
├── mobile-rn/                  # Aplicacao Movel em React Native
│   ├── package.json
│   ├── app.json
│   ├── index.js
│   └── src/
│       ├── App.js              # Ponto de entrada nativo com ThemeProvider e modais
│       ├── screens/            # Telas nativas (Creatures, Spells, Plants, Potions)
│       ├── components/         # BottomNav, DetailModal
│       └── theme/              # Contexto de temas (Pergaminho, Noturno, Terminal)
├── shared/                     # Logica central compartilhada entre Web e Mobile
│   ├── services/
│   │   ├── cacheStore.js       # Motor de cache persistente da API (IndexedDB, localStorage, Nativo e AsyncStorage)
│   │   ├── database.js         # Cliente REST Cloud Firestore com Stale-While-Revalidate
│   │   ├── firebaseConfig.js   # Configuracao oficial wwcatalog-10546
│   │   └── updater.js          # Rastreamento de releases na API do GitHub
│   ├── data/
│   │   └── fallbackData.js     # 512 registros embutidos para contingencia offline estrita
│   └── utils/
│       └── helpers.js          # Sanitizacao, Base64 e exportacao JSON
├── android-app/                # Pacote Android nativo compilado (APK v1.2.0)
├── assets/                     # Recursos visuais oficiais do Ministerio da Magia
└── WWcatalog.apk               # Instalador executavel oficial para dispositivos Android
```

---

## Como Executar Localmente

Por utilizar ES6 Modules (`<script type="module">`), sirva a pasta raiz por meio de um servidor HTTP estatico:

```bash
# Opcao 1: Node.js (npx)
npx serve .

# Opcao 2: Python 3
python -m http.server 8080
```

Em seguida, acesse `http://localhost:8080` (ou a porta indicada no terminal) pelo navegador.
