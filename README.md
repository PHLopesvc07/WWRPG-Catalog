# Arquivo Geral do Ministerio da Magia — W&W RPG Catalog

Aplicacao web de catalogacao, consulta rapida e exportacao de recursos para o sistema **Wands & Wizards RPG (W&W)**, conectada diretamente ao **Cloud Firestore** e estruturada em quatro arquivos departamentais independentes:

1. **D.R.C.C.M. — Animais e Criaturas Magicas** (92 especies armazenadas no Firestore com retratos embutidos em Base64, atributos, habilidades de combate e prontuario de injurias)
2. **C.E.F. — Grande Compendio de Feiticos** (210 encantamentos armazenados no Firestore com pronuncia, nivel 1 a 7, categoria magica, pericia de conjuracao e condicao aplicada)
3. **Compendio de Herbologia e Botanica Magica** (44 plantas magicas armazenadas no Firestore classificadas por raridade, nivel de herbologia, CD de manejo e usos alquimicos)
4. **Catalogo Alquimico de Pocoes** (166 compostos, elixires, antidotos e venenos armazenados no Firestore com CD de preparo, tempo de fermentacao, via de administracao e ingredientes)

---

## Aplicativo Movel Android (.apk)

A versao compilada e instalavel para dispositivos Android esta disponivel na release oficial do repositorio com rastreamento automatico de atualizacoes:

- **Download Direto (.apk):** [WWcatalog.apk (Release v1.0.2)](https://github.com/PHLopesvc07/WWRPG-Catalog/releases/download/v1.0.2/WWcatalog.apk)
- **Pagina da Release:** [Release v1.0.2 no GitHub](https://github.com/PHLopesvc07/WWRPG-Catalog/releases/tag/v1.0.2)

A aplicacao mobile oferece:
- Rastreamento automatico de releases via API do GitHub com notificacao e download integrado de novas versoes.
- Navegacao otimizada nativa com Bottom Navigation Bar e Bottom Sheet modal para fichas.
- Consulta direta e em tempo real ao Cloud Firestore (`wwcatalog-10546`) com cache multi-camadas offline.

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
├── index.html                  # Interface principal com os 4 espacos de catalogo e formularios
├── README.md                   # Documentacao geral do projeto
├── API_GUIDE.md                # Guia de consulta da API Cloud Firestore e esquemas JSON
├── css/
│   ├── variables.css           # Tokens de cores, fontes e superficies dos 3 temas
│   ├── base.css                # Reset, tipografia e estilos de formulario
│   ├── layout.css              # Cabecalho, abas, grids de 2 colunas e responsividade
│   └── components.css          # Fichas completas, badges, carimbos e listas otimizadas
├── js/
│   ├── main.js                 # Inicializacao, controle de temas e carregamento sob demanda por aba
│   ├── services/
│   │   ├── firebaseConfig.js   # Configuracao do projeto Cloud Firestore (wwcatalog-10546)
│   │   └── database.js         # Cliente REST Cloud Firestore (indices, itens individuais e escrita)
│   ├── controllers/
│   │   ├── TabController.js      # Navegacao entre abas e emissao do evento tab-opened
│   │   ├── CreatureController.js # Controlador de Animais Magicos (D.R.C.C.M.)
│   │   ├── SpellController.js    # Controlador de Feiticos (C.E.F.)
│   │   ├── PlantController.js    # Controlador de Plantas (Herbologia)
│   │   └── PotionController.js   # Controlador de Pocoes (Alquimia)
│   └── utils/
│       └── helpers.js          # Utilitarios de sanitizacao HTML, Base64 e exportacao JSON
└── assets/
    └── img/                    # Texturas de pergaminho e emblemas de interface do Ministerio
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
