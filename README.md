# Arquivo Geral do Ministerio da Magia — W&W RPG Catalog

Aplicacao web de catalogacao, consulta rapida e exportacao de recursos para o sistema **Wands & Wizards RPG (W&W)**, estruturada em quatro arquivos departamentais independentes:

1. **D.R.C.C.M. — Animais e Criaturas Magicas** (92 especies catalogadas com retratos, atributos, habilidades de combate e prontuario de injurias)
2. **C.E.F. — Grande Compendio de Feiticos** (210 encantamentos catalogados com pronuncia, nivel 1 a 7, categoria magica, pericia de conjuracao e condicao aplicada)
3. **Compendio de Herbologia e Botanica Magica** (44 plantas magicas classificadas por raridade, nivel de herbologia, CD de manejo e usos alquimicos)
4. **Catalogo Alquimico de Pocoes** (166 compostos, elixires, antidotos e venenos com CD de preparo, tempo de fermentacao, via de administracao e ingredientes)

---

## Guia de Consulta da API

Para integrar este catalogo a fichas de personagem (como o **WWRPG-Ficha**), bots ou ferramentas externas, consulte o documento dedicado:

- **[Guia de Consulta da API (`API_GUIDE.md`)](./API_GUIDE.md)**: Documentacao completa dos endpoints HTTP estaticos (`indice.json` e `itens/{id}.json`), funcoes do modulo ES6 (`js/services/database.js`), exemplos em JavaScript/`curl` e esquemas JSON de todas as quatro colecoes.

---

## Arquitetura de Desempenho e Carregamento Individual

O sistema opera com carregamento em duas camadas (Two-Tier Lazy Loading) e otimizacoes de renderizacao para garantir navegacao imediata:

- **Carregamento Sob Demanda por Aba (`ensureLoaded`):** Na abertura da aplicacao, apenas o indice da aba ativa e processado. Os catalogos de Feiticos, Plantas e Pocoes sao carregados sob demanda no instante em que o usuario acessa a respectiva aba.
- **Camada 1 (Indices Leves):** Cada modulo carrega inicialmente apenas seu arquivo `indice.json`, permitindo filtragem e ordenacao instantaneas em memoria.
- **Camada 2 (Documentos Individuais com Cache em Memoria):** Ao selecionar um registro na barra lateral, a aplicacao requisita apenas o arquivo `./<categoria>/itens/<id>.json` correspondente e armazena-o em cache (`Map`) para exibicao imediata em consultas subsequentes.
- **Delegacao de Eventos e Debounce:** As listas laterais utilizam um unico listener delegado por container (`ul.record-list`) com `contain: content` no CSS e debounce de `80ms` nos campos de busca textual, evitando recriacao de listeners e reflows desnecessarios.
- **Ativos Graficos Otimizados:** As texturas de pergaminho e retratos de criaturas foram comprimidas e utilizam carregamento nativo assincrono (`loading="lazy" decoding="async"`).

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
├── API_GUIDE.md                # Guia de consulta da API e esquemas JSON
├── css/
│   ├── variables.css           # Tokens de cores, fontes e superficies dos 3 temas
│   ├── base.css                # Reset, tipografia e estilos de formulario
│   ├── layout.css              # Cabecalho, abas, grids de 2 colunas e responsividade
│   └── components.css          # Fichas completas, badges, carimbos e listas otimizadas
├── js/
│   ├── main.js                 # Inicializacao, controle de temas e carregamento sob demanda por aba
│   ├── services/
│   │   └── database.js         # Camada de dados (indices leves, itens individuais, cache e exportacao)
│   ├── controllers/
│   │   ├── TabController.js      # Navegacao entre abas e emissao do evento tab-opened
│   │   ├── CreatureController.js # Controlador de Animais Magicos (D.R.C.C.M.)
│   │   ├── SpellController.js    # Controlador de Feiticos (C.E.F.)
│   │   ├── PlantController.js    # Controlador de Plantas (Herbologia)
│   │   └── PotionController.js   # Controlador de Pocoes (Alquimia)
│   └── utils/
│       └── helpers.js          # Utilitarios de sanitizacao HTML, Base64 e exportacao JSON
├── assets/
│   ├── img/                    # Texturas de pergaminho e emblemas otimizados
│   └── animais/                # 91 ilustracoes de criaturas magicas otimizadas
├── dados/
│   ├── indice.json             # Indice leve de criaturas (92 registros)
│   ├── catalogo_criaturas.json # Pacote completo de criaturas
│   └── itens/                  # 92 arquivos JSON individuais de criaturas
├── feiticos/
│   ├── indice.json             # Indice leve de feiticos (210 registros)
│   ├── catalogo_feiticos.json  # Pacote completo de feiticos
│   └── itens/                  # 210 arquivos JSON individuais de feiticos
├── plantas/
│   ├── indice.json             # Indice leve de plantas (44 registros)
│   ├── catalogo_plantas.json   # Pacote completo de plantas
│   └── itens/                  # 44 arquivos JSON individuais de plantas
└── pocoes/
    ├── indice.json             # Indice leve de pocoes (166 registros)
    ├── catalogo_pocoes.json    # Pacote completo de pocoes
    └── itens/                  # 166 arquivos JSON individuais de pocoes
```

---

## Como Executar Localmente

Por utilizar ES6 Modules (`<script type="module">`) e requisicoes `fetch` para os arquivos JSON, sirva a pasta raiz por meio de um servidor HTTP estatico:

```bash
# Opcao 1: Node.js (npx)
npx serve .

# Opcao 2: Python 3
python -m http.server 8080
```

Em seguida, acesse `http://localhost:8080` (ou a porta indicada no terminal) pelo navegador.
