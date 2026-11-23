# Equipe de Desenvolvimento

O projeto Arquivo Geral do Ministério da Magia — W&W RPG Catalog foi desenvolvido por uma equipe de quatro integrantes, responsáveis pela concepção, desenvolvimento e estruturação do ecossistema de catalogação.

**Integrantes:**

Erick Joshua Revollo
Pedro Henrique Lopes Vilela Coelho
Tiago Bondezan Bazani
Yuri Shinnishi de Queiroz Rossi

# Arquivo Geral do Ministerio da Magia — W&W RPG Catalog (React & React Native)

Aplicacao oficial de catalogacao, consulta rapida e exportacao de recursos para o sistema **Wands & Wizards RPG (W&W)**, conectada diretamente ao **Cloud Firestore** e agora modernizada com **React** (Web) e **React Native** (Mobile), estruturada em quatro arquivos departamentais independentes:

1. **D.R.C.C.M. — Animais e Criaturas Magicas** (92 especies armazenadas no Firestore com retratos embutidos em Base64, atributos, habilidades de combate e prontuario de injurias)
2. **C.E.F. — Grande Compendio de Feiticos** (210 encantamentos armazenados no Firestore com pronuncia, nivel 1 a 7, categoria magica, pericia de conjuracao e condicao aplicada)
3. **Compendio de Herbologia e Botanica Magica** (44 plantas magicas armazenadas no Firestore classificadas por raridade, nivel de herbologia, CD de manejo e usos alquimicos)
4. **Catalogo Alquimico de Pocoes** (166 compostos, elixires, antidotos e venenos armazenados no Firestore com CD de preparo, tempo de fermentacao, via de administracao e ingredientes)

---

## Arquitetura Moderna (React & React Native)

O ecossistema foi estruturado para compartilhamento de regras de negocio e resiliencia de dados:

- **`web/` (React + Vite)**: Aplicacao web completa em componentes React modulares, com gerenciamento reativo de estado, filtros instantaneos, modais de cadastro e suporte integral aos tres temas ministeriais (Pergaminho Claro, Noturno e Terminal Tatico).
- **`mobile-rn/` (React Native)**: Aplicacao movel nativa em React Native utilizando `FlatList` de alta performance, Bottom Sheet modais, Bottom Navigation Bar nativa e alternador de temas.
- **`shared/` (Modulo Compartilhado)**: Servico central de dados (`database.js`), fallback offline de 512 registros (`fallbackData.js`), configuracoes do Firebase (`firebaseConfig.js`) e rastreador de releases no GitHub (`updater.js`).

---

## Como Executar

### Aplicacao Web (React)
```bash
# Entrar no diretorio web e iniciar o servidor de desenvolvimento
npm run dev:web
# ou diretamente dentro de web:
cd web && npm run dev

# Compilar para producao
npm run build:web
```

### Aplicacao Movel (React Native)
```bash
# Iniciar o empacotador Metro do React Native
npm run start:mobile
# ou diretamente dentro de mobile-rn:
cd mobile-rn && npm start
```

---

## Aplicativo Movel Android (.apk)

A versao compilada e instalavel para dispositivos Android esta disponivel na release oficial do repositorio com rastreamento automatico de atualizacoes:

- **Download Direto (.apk):** [WWcatalog.apk (Release v1.1.0)](https://github.com/PHLopesvc07/WWRPG-Catalog/releases/download/v1.1.0/WWcatalog.apk)
- **Pagina da Release:** [Release v1.1.0 no GitHub](https://github.com/PHLopesvc07/WWRPG-Catalog/releases/tag/v1.1.0)

A aplicacao mobile oferece:
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

- **Carregamento Sob Demanda por Aba (`ensureLoaded`):** Na abertura da aplicacao, apenas o indice da aba ativa e requisitado ao Firestore. Os catalogos de Feiticos, Plantas e Pocoes sao consultados no momento em que o usuario abre a respectiva aba.
- **Camada 1 (Indices Leves em `_indexes/{colecao}`):** Cada modulo consulta inicialmente apenas o documento de indice leve da sua colecao no Firestore, permitindo filtragem e ordenacao instantaneas em memoria sem trafegar descricoes longas ou imagens Base64.
- **Camada 2 (Documentos Individuais em `{colecao}/{id}` com Cache em Memoria):** Ao clicar em um item na lista lateral, a aplicacao requisita apenas aquele documento individual no Firestore (incluindo a imagem `fotoBase64` da criatura) e o mantem em cache (`Map`) para exibicao instantanea em consultas repetidas.
- **Delegacao de Eventos e Debounce:** As listas laterais utilizam um unico listener delegado por container (`ul.record-list`) com `contain: content` no CSS e debounce de `80ms` nos campos de busca textual.

---

## Sistema Visual

A interface combina a identidade tipografica do **WWRPG-Ficha** com o guia tecnico **Ministry Bureaucracy (`design.md`)**, oferecendo tres modos de leitura persistidos em `localStorage`:

- **Modo Claro (Pergaminho Ministerial):** Textura de pergaminho classico com tipografia serifada editorial (`Playfair Display`), dados tecnicos monoespacados (`JetBrains Mono`) e carimbos datilografados (`Special Elite`).
- **Modo Escuro (Pergaminho Noturno):** Superficies escuras de alto contraste com detalhes em dourado ministerial (`#f1c40f`).
- **Modo Terminal Tatico:** Estetica inspirada em terminais governamentais (`#0B1011`), com bordas chanfradas e acentos em ouro velho (`#D4AF37`) e verde-azulado (`#4A9E8E`).

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
│   │   ├── database.js         # Cliente REST Cloud Firestore com cache multi-tier
│   │   ├── firebaseConfig.js   # Configuracao oficial wwcatalog-10546
│   │   └── updater.js          # Rastreamento de releases na API do GitHub
│   ├── data/
│   │   └── fallbackData.js     # 512 registros embutidos para inicializacao instantanea (0ms)
│   └── utils/
│       └── helpers.js          # Sanitizacao, Base64 e exportacao JSON
├── android-app/                # Pacote Android nativo compilado (APK v1.1.0)
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
