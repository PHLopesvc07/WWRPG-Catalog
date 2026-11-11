# Guia de Consulta da API do Catalogo — W&W RPG

Este documento descreve como consultar programaticamente os dados do **Arquivo Geral do Ministerio da Magia (WWRPG-Catalog)** a partir de aplicacoes externas (como fichas de personagem, roladores de dados, bots ou paineis do mestre) ou dentro do proprio ecossistema web do projeto.

---

## 1. Arquitetura de Consulta em Duas Camadas (Two-Tier API)

Para garantir respostas rapidas e baixo consumo de banda, o catalogo disponibiliza os dados em tres formatos de acesso HTTP estatico (JSON):

1. **Camada 1 — Indices Leves (`indice.json`):** Contem apenas os metadados essenciais de cada registro (`id`, nome, nivel/classificacao e tags de filtro). Ideal para preencher listas de selecao, autocompletar buscas e aplicar filtros sem baixar textos longos.
2. **Camada 2 — Documentos Individuais (`itens/{id}.json`):** Contem a ficha completa de um unico item identificado pelo seu `id` (slug). Deve ser requisitado apenas quando o usuario ou sistema selecionar um item especifico.
3. **Pacotes Completos (`catalogo_*.json`):** Contem todos os registros completos de uma categoria em um unico arquivo, util para sincronizacao offline ou backup integral.

---

## 2. Endpoints HTTP (JSON Estatico)

Substitua `{BASE_URL}` pela URL onde o catalogo esta hospedado (por exemplo, `https://phlopesvc07.github.io/WWRPG-Catalog` ou `http://localhost:8080`).

### 2.1. Animais e Criaturas Magicas (92 registros)

| Finalidade | Metodo | Endpoint |
| :--- | :--- | :--- |
| Indice leve de criaturas | `GET` | `{BASE_URL}/dados/indice.json` |
| Ficha individual de criatura | `GET` | `{BASE_URL}/dados/itens/{id}.json` |
| Pacote completo de criaturas | `GET` | `{BASE_URL}/dados/catalogo_criaturas.json` |

- **Exemplo de ID (`{id}`):** `acromantula-acromantula`, `basilisk-basilisco`, `niffler-pelucio`.

### 2.2. Feiticos e Encantamentos (210 registros)

| Finalidade | Metodo | Endpoint |
| :--- | :--- | :--- |
| Indice leve de feiticos | `GET` | `{BASE_URL}/feiticos/indice.json` |
| Ficha individual de feitico | `GET` | `{BASE_URL}/feiticos/itens/{id}.json` |
| Pacote completo de feiticos | `GET` | `{BASE_URL}/feiticos/catalogo_feiticos.json` |

- **Exemplo de ID (`{id}`):** `expelliarmus`, `lumos`, `expecto-patronum`.

### 2.3. Plantas Magicas e Herbologia (44 registros)

| Finalidade | Metodo | Endpoint |
| :--- | :--- | :--- |
| Indice leve de plantas | `GET` | `{BASE_URL}/plantas/indice.json` |
| Ficha individual de planta | `GET` | `{BASE_URL}/plantas/itens/{id}.json` |
| Pacote completo de plantas | `GET` | `{BASE_URL}/plantas/catalogo_plantas.json` |

- **Exemplo de ID (`{id}`):** `ditamno-dittany-origanum-dictamnus`, `mandragora-mandrake-mandragora-officinarum`.

### 2.4. Pocoes e Compostos Alquimicos (166 registros)

| Finalidade | Metodo | Endpoint |
| :--- | :--- | :--- |
| Indice leve de pocoes | `GET` | `{BASE_URL}/pocoes/indice.json` |
| Ficha individual de pocao | `GET` | `{BASE_URL}/pocoes/itens/{id}.json` |
| Pacote completo de pocoes | `GET` | `{BASE_URL}/pocoes/catalogo_pocoes.json` |

- **Exemplo de ID (`{id}`):** `pocao-wiggenweld-wiggenweld-potion`, `pocao-polissuco-polyjuice-potion`, `felix-felicis`.

---

## 3. Exemplos Praticos de Consulta

### 3.1. Consulta Externa via `fetch` (JavaScript / Browser / Node.js)

```javascript
const BASE_URL = "https://phlopesvc07.github.io/WWRPG-Catalog";

/**
 * 1. Busca o indice leve de uma categoria para listar ou filtrar opcoes
 * @param {"dados" | "feiticos" | "plantas" | "pocoes"} pasta
 */
async function consultarIndice(pasta) {
    const response = await fetch(`${BASE_URL}/${pasta}/indice.json`);
    if (!response.ok) {
        throw new Error(`Falha ao consultar indice (${response.status})`);
    }
    return await response.json();
}

/**
 * 2. Busca o documento completo de um unico item pelo seu ID
 * @param {"dados" | "feiticos" | "plantas" | "pocoes"} pasta
 * @param {string} id
 */
async function consultarItemPorId(pasta, id) {
    const response = await fetch(`${BASE_URL}/${pasta}/itens/${encodeURIComponent(id)}.json`);
    if (!response.ok) {
        throw new Error(`Item "${id}" nao encontrado (${response.status})`);
    }
    return await response.json();
}

// Exemplo de uso: buscar todos os feiticos de Nivel 1 e carregar o primeiro
async function exemploDeUso() {
    const indiceFeiticos = await consultarIndice("feiticos");
    const nivel1 = indiceFeiticos.filter(item => String(item.lvl) === "1");

    if (nivel1.length > 0) {
        const feiticoCompleto = await consultarItemPorId("feiticos", nivel1[0].id);
        console.log("Ficha completa do feitico:", feiticoCompleto);
    }
}
```

### 3.2. Consulta via `curl` (Linha de Comando)

```bash
# Consultar o indice de pocoes
curl -s https://phlopesvc07.github.io/WWRPG-Catalog/pocoes/indice.json

# Consultar um feitico especifico pelo ID
curl -s https://phlopesvc07.github.io/WWRPG-Catalog/feiticos/itens/expelliarmus.json

# Consultar uma criatura especifica pelo ID
curl -s https://phlopesvc07.github.io/WWRPG-Catalog/dados/itens/acromantula-acromantula.json
```

### 3.3. Consulta Interna via Modulo ES6 (`js/services/database.js`)

Dentro do proprio projeto, utilize as funcoes exportadas pelo servico de dados:

```javascript
import {
    COLLECTIONS,
    fetchCatalogIndex,
    fetchItemById,
    fetchItemsByIds
} from "./js/services/database.js";

// Colecoes disponiveis:
// COLLECTIONS.CREATURES ("creatures")
// COLLECTIONS.SPELLS    ("spells")
// COLLECTIONS.PLANTS    ("plants")
// COLLECTIONS.POTIONS   ("potions")

// 1. Carregar o indice leve da colecao
const indice = await fetchCatalogIndex(COLLECTIONS.SPELLS);

// 2. Carregar um unico item completo pelo ID (com cache em memoria)
const expelliarmus = await fetchItemById(COLLECTIONS.SPELLS, "expelliarmus");

// 3. Carregar multiplos itens completos sob demanda (ex.: para exportacao)
const pacote = await fetchItemsByIds(COLLECTIONS.SPELLS, ["expelliarmus", "lumos"]);
```

---

## 4. Esquemas de Dados (JSON Schemas)

### 4.1. Criaturas Magicas (`dados`)

**Item no Indice (`dados/indice.json`):**
```json
{
  "id": "acromantula-acromantula",
  "nome": "Acromantula (Acromântula)",
  "classificacao": "XXXXX",
  "licenca": "Não permitido",
  "porte": "Enorme",
  "locomocao": "Terrestres",
  "velocidade": "5.5m",
  "interacao": "Agressivo",
  "tipo": "Consciente",
  "origem": "Artificial",
  "fotoUrl": "./assets/animais/Acromantula.jpg"
}
```

**Documento Individual (`dados/itens/{id}.json`):**
```json
{
  "id": "acromantula-acromantula",
  "nome": "Acromantula (Acromântula)",
  "classificacao": "XXXXX",
  "licenca": "Não permitido",
  "porte": "Enorme",
  "tamanho": "4,5 metros de envergadura de pernas",
  "peso": "180 kg",
  "origem": "Artificial",
  "locomocao": "Terrestres",
  "velocidade": "5.5m",
  "interacao": "Agressivo",
  "tipo": "Consciente",
  "atributos": {
    "corpo": 4,
    "destreza": 3,
    "vitalidade": 4,
    "instinto": 4,
    "carisma": -2,
    "inteligencia": 2,
    "sabedoria": 2
  },
  "habilidades": {
    "dano": { "nome": "Pinças Venenosas", "rolagem": "2d8 + Corpo", "desc": "..." },
    "reacao": { "nome": "Salto Aracnídeo", "rolagem": "1d30 + Destreza", "desc": "..." },
    "ambiente": { "nome": "Teia Abobadada", "rolagem": "CD 20 + Instinto", "desc": "..." },
    "extra": { "nome": "Visão de Oito Olhos", "rolagem": "Passivo", "desc": "..." }
  },
  "injurias": {
    "leve": { "atual": 0, "max": 4 },
    "media": { "atual": 0, "max": 3 },
    "pesada": { "atual": 0, "max": 2 },
    "especificas": []
  },
  "descricao": "Aranha monstruosa de oito olhos capaz de fala humana...",
  "fotoUrl": "./assets/animais/Acromantula.jpg",
  "fotoBase64": ""
}
```

---

### 4.2. Feiticos (`feiticos`)

**Item no Indice (`feiticos/indice.json`):**
```json
{
  "id": "expelliarmus",
  "name": "Expelliarmus",
  "pronuncia": "eks-pe-li-AR-mus",
  "cat": "Charme",
  "lvl": "2",
  "tipo": "Ataque",
  "condicao": "(C) Desarmado"
}
```

**Documento Individual (`feiticos/itens/{id}.json`):**
```json
{
  "id": "expelliarmus",
  "name": "Expelliarmus",
  "pronuncia": "eks-pe-li-AR-mus",
  "pronunciation": "eks-pe-li-AR-mus",
  "cat": "Charme",
  "lvl": "2",
  "tipo": "Ataque",
  "condicao": "(C) Desarmado",
  "desc": "Força o alvo a soltar o que estiver segurando (geralmente a varinha)..."
}
```

---

### 4.3. Plantas Magicas (`plantas`)

**Item no Indice (`plantas/indice.json`):**
```json
{
  "id": "ditamno-dittany-origanum-dictamnus",
  "nome": "Ditamno (Dittany / Origanum dictamnus)",
  "categoria": "Popular",
  "nivel": "1",
  "manejo_cd": 10
}
```

**Documento Individual (`plantas/itens/{id}.json`):**
```json
{
  "id": "ditamno-dittany-origanum-dictamnus",
  "nome": "Ditamno (Dittany / Origanum dictamnus)",
  "categoria": "Popular",
  "nivel": "1",
  "manejo_cd": 10,
  "manejo": "Colheita simples de folhas frescas.",
  "efeito": "Cicatrização acelerada de feridas recentes.",
  "uso_alquimico": "Poção Wiggenweld, Essência de Ditamno.",
  "classificacao_ministerial": "Artigo Comerciável Livre",
  "descricao": "Planta herbácea de poderoso efeito regenerativo...",
  "peculiaridades": "• Nível de Herbologia: Nível 1.\n• Manejo e Colheita: CD 10...",
  "fotoBase64": ""
}
```

---

### 4.4. Pocoes (`pocoes`)

**Item no Indice (`pocoes/indice.json`):**
```json
{
  "id": "pocao-wiggenweld-wiggenweld-potion",
  "nome": "Poção Wiggenweld (Wiggenweld Potion)",
  "tipo": "Poção Curativa",
  "nivel": 1,
  "dificuldade_cd": 12,
  "tempo_preparo": "45 minutos",
  "administracao": "Ingestão"
}
```

**Documento Individual (`pocoes/itens/{id}.json`):**
```json
{
  "id": "pocao-wiggenweld-wiggenweld-potion",
  "nome": "Poção Wiggenweld (Wiggenweld Potion)",
  "tipo": "Poção Curativa",
  "nivel": 1,
  "nível": 1,
  "efeito": "Restaura vigor físico, cura ferimentos leves e reverte o Sono Encantado.",
  "ingredientes": "Casca de Wiggentree, Ditamno, Muco de Verme-Cego...",
  "descricao": "Líquido verde-esmeralda luminoso de odor mentolado...",
  "descrição": "Líquido verde-esmeralda luminoso de odor mentolado...",
  "sistema": {
    "tempo_preparo": "45 minutos",
    "duracao": "Instantâneo",
    "dificuldade_cd": 12,
    "administracao": "Ingestão"
  },
  "meta": {
    "nome_original": "Wiggenweld Potion",
    "wiki": "https://harrypotter.fandom.com/wiki/Wiggenweld_Potion"
  }
}
```
