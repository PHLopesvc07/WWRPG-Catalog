# 📜 Arquivo Geral do Ministério da Magia — W&W RPG Catalog

Aplicação web modular de catalogação, consulta rápida, filtragem avançada e exportação oficial de registros para o sistema de RPG de mesa **Witches & Wizards (W&W)**.

Projetada com **Arquitetura de Carregamento Individual Sob Demanda (Two-Tier Lazy Loading)** para garantir inicialização instantânea mesmo com mais de **512 registros oficiais** e dezenas de ilustrações.

---

## 🏛️ Os 4 Espaços de Catálogo Ministerial

O sistema contempla espaços dedicados de **Arquivo de Consulta** e **Registro / Importação em Massa** para cada um dos 4 pilares do sistema W&W RPG:

### 1. 🐾 Catálogo de Animais & Criaturas Mágicas (D.R.C.C.M.) — *92 Espécies Oficiais*
* **Identificação Ministerial:** Espécie Mágica, Classificação do Ministério (`X`, `XX`, `XXX`, `XXXX`, `XXXXX`, `XX-XXXX`), Licença exigida (`Comum`, `Magizoologista`, `Não permitido`), Porte (`Pequeno`, `Médio`, `Grande`, `Enorme`), Tamanho/Peso adulto, Origem (`Natural`, `Artificial`), Locomoção (`Terrestres`, `Aéreos`, `Aquáticos`, `Aquaéros`), **Velocidade de Ação**, Interação (`Pacífico`, `Agressivo`) e Tipo (`Simples`, `Neutro`, `Consciente`, `Bestial`).
* **Atributos Físicos e Animais (`-5` a `+10`):** `Corpo`, `Destreza`, `Vitalidade`, `Instinto`, `Carisma`, `Inteligência` e `Sabedoria`.
* **Habilidades Especiais de Combate & Instinto:** Quatro categorias táticas (`⚔️ Dano`, `🛡️ Reação`, `🌪️ Ambiente` e `✨ Extra`) com nome, fórmula de rolagem/CD e descrição mecânica.
* **Prontuário Médico-Veterinário:** Limites de Injúria `Leve`, `Média`, `Pesada` e condições customizadas.
* **Galeria de Retratos (`assets/animais/`):** Ilustrações carregadas individualmente (`loading="lazy"`) apenas quando a criatura é selecionada.

### 2. 🪄 Grande Compêndio de Feitiçaria (C.E.F.) — *210 Feitiços Oficiais*
* **Dados Catalogados:** Nome do Encantamento (`name`), Pronúncia Fonética (`pronuncia`), Categoria Mágica (`Charme`, `Transfiguração`, `Azaração`, `Maldição Menor`, `Maldição`, `Contrafeitiço`, `Cura`), Nível de Dificuldade (`1` a `7`), Natureza (`Ataque`, `Proteção`, `Cura`, `Utilitário`, `Contrafeitiço`), **Condição Aplicada (`condicao`, ex: `(C) Desarmado`)** e Descrição completa (`desc`).
* **Mapeamento Automático de Perícia (W&W):** Associa automaticamente a categoria do feitiço à perícia de conjuração correspondente na ficha de personagem (`Prática`, `Transfiguração`, `DCAT`, `Dificuldade/Lógica`, `Cura`).

### 3. 🌿 Compêndio de Herbologia & Botânica Mágica — *44 Plantas Oficiais*
* **Dados Catalogados:** Nome Popular / Inglês / Científico (`nome`), Disponibilidade Ministerial (`Popular` ou `Difícil de Adquirir`), Nível de Herbologia (`1` a `7`), Dificuldade de Manejo e Colheita (`CD`), Descrição Morfológica (`descricao`) e Peculiaridades Técnicas (`peculiaridades`: EPIs exigidos, mecânica/efeito imediato, uso alquímico e classificação de sementes).

### 4. ⚗️ Catálogo Alquímico de Poções — *166 Compostos Oficiais*
* **Dados Catalogados:** Nome (`nome`), Classificação (`Poção`, `Elixir`, `Antídoto`, `Veneno`, `Filtro do Amor`, `Solução`, `Pomada`, `Pasta`, `Tônico`, `Gás Alquímico`), Nível Alquímico (`1` a `7`), Parâmetros de Sistema (`sistema.dificuldade_cd`, `sistema.tempo_preparo`, `sistema.duracao`, `sistema.administracao`), Efeito Mecânico (`efeito`), Ingredientes do Caldeirão (`ingredientes`), Características Físicas/Aroma/Lore (`descricao`) e Metadados de Referência (`meta`).

---

## ⚡ Arquitetura de Carregamento Individual (Alta Performance)

Para evitar o download pesado de coleções inteiras na abertura da página, o serviço [`js/services/database.js`](./js/services/database.js) implementa o carregamento em duas camadas (**Two-Tier On-Demand Loading**):

1. **Camada 1 — Índice Leve (`fetchCatalogIndex`):**
   * Ao abrir qualquer catálogo, o sistema lê apenas o documento de resumo (`indice.json` e índice remoto), contendo somente os campos necessários para a listagem lateral e filtros (`id`, `nome`/`name`, `classificacao`/`lvl`/`categoria`/`tipo`).
   * A renderização e filtragem de centenas de itens ocorrem em **menos de 10 ms**.
2. **Camada 2 — Carregamento Individual Sob Demanda (`fetchItemById`):**
   * A ficha completa de um item (descrições extensas, habilidades, ingredientes, prontuário veterinário e imagem) é requisitada **individualmente apenas quando o usuário clica no item desejado**, sendo armazenada em um cache em memória (`Map`) para releitura instantânea (`0 ms`).

---

## 📂 Estrutura de Diretórios

```text
WWcatalog/
├── index.html                      # Interface principal com os 4 espaços de catálogo
├── README.md                       # Documentação oficial do sistema
├── assets/
│   └── animais/                    # 91 retratos individuais de criaturas mágicas (carregamento lazy)
├── css/
│   ├── variables.css               # Paleta de cores de pergaminho, selos e tipografia
│   ├── base.css                    # Reset e regras tipográficas globais
│   ├── layout.css                  # Grids responsivos e navegação departamental
│   └── components.css              # Fichas ministeriais, cartões de habilidade e selos
├── js/
│   ├── main.js                     # Inicialização dos 4 controladores de catálogo
│   ├── controllers/
│   │   ├── TabController.js        # Alternância entre os 8 painéis (4 Arquivos + 4 Registros)
│   │   ├── CreatureController.js   # CRUD, filtros e carregamento individual de Animais (D.R.C.C.M.)
│   │   ├── SpellController.js      # CRUD, filtros e carregamento individual de Feitiços (C.E.F.)
│   │   ├── PlantController.js      # CRUD, filtros e carregamento individual de Plantas (Herbologia)
│   │   └── PotionController.js     # CRUD, filtros e carregamento individual de Poções (Alquimia)
│   ├── services/
│   │   ├── firebaseConfig.js       # Configuração interna de conexão com o banco de dados
│   │   └── database.js             # Camada de persistência e carregamento individual sob demanda
│   └── utils/
│       └── helpers.js              # Sanitização, compressão de imagens via Canvas e exportação JSON
├── dados/
│   ├── indice.json                 # Índice leve das 92 criaturas mágicas
│   ├── catalogo_criaturas.json     # Compêndio completo de criaturas
│   └── itens/                      # 92 arquivos JSON individuais (<id>.json)
├── feiticos/
│   ├── indice.json                 # Índice leve dos 210 feitiços
│   ├── indice_feiticos.json        # Compêndio completo de feitiços
│   └── itens/                      # 210 arquivos JSON individuais (<id>.json)
├── plantas/
│   ├── indice.json                 # Índice leve das 44 plantas mágicas
│   ├── indice_plantas.json         # Compêndio completo de herbologia
│   └── itens/                      # 44 arquivos JSON individuais (<id>.json)
└── pocoes/
    ├── indice.json                 # Índice leve das 166 poções alquímicas
    ├── indice_pocoes.json          # Compêndio completo de poções
    └── itens/                      # 166 arquivos JSON individuais (<id>.json)
```

---

## 🚀 Como Executar Localmente

Por utilizar módulos nativos do JavaScript (`ES6 Modules`) e requisições `fetch` para carregamento individual de arquivos JSON, abra o diretório utilizando qualquer servidor HTTP estático:

1. **VS Code (Live Server):** Clique em *"Go Live"* na barra inferior com o `index.html` aberto.
2. **Python:**
   ```bash
   python -m http.server 8080
   ```
   E acesse `http://localhost:8080` no navegador.
