# Guia de Consulta da API do Catalogo (Cloud Firestore) — W&W RPG

Este documento descreve como consultar programaticamente os dados do **Arquivo Geral do Ministerio da Magia (WWRPG-Catalog)** diretamente no banco de dados **Cloud Firestore** a partir de aplicacoes externas (como fichas de personagem, roladores de dados, bots ou paineis do mestre) ou dentro do proprio ecossistema web do projeto.

---

## 1. Arquitetura de Consulta em Duas Camadas (Two-Tier Firestore API)

Todos os registros do catalogo (incluindo os retratos das criaturas magicas em Base64) estao armazenados no banco de dados Cloud Firestore do projeto `wwcatalog-10546`. Para garantir respostas rapidas e baixo consumo de banda, a consulta e dividida em duas camadas:

1. **Camada 1 — Colecao de Indices Leves (`_indexes/{colecao}`):** Contem um unico documento por categoria (`creatures`, `spells`, `plants`, `potions`) com a lista resumida de todos os itens (`id`, nome, nivel/classificacao e metadados de filtro), sem incluir descricoes longas ou imagens em Base64. Ideal para preencher listas de selecao, autocompletar buscas e filtrar em memoria com apenas 1 leitura no Firestore.
2. **Camada 2 — Documentos Individuais (`{colecao}/{id}`):** Contem a ficha completa de um unico item identificado pelo seu `id` (incluindo `fotoBase64` para criaturas e plantas). Deve ser requisitado sob demanda apenas quando o usuario ou sistema selecionar um registro especifico.

---

## 2. Endpoints REST do Cloud Firestore

**URL Base da API:**
```text
https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents
```

### 2.1. Endpoints de Indices Leves (Camada 1)

| Categoria | Metodo | Endpoint REST |
| :--- | :--- | :--- |
| Animais e Criaturas (92) | `GET` | `https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents/_indexes/creatures` |
| Feiticos (210) | `GET` | `https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents/_indexes/spells` |
| Plantas Magicas (44) | `GET` | `https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents/_indexes/plants` |
| Pocoes Alquimicas (166) | `GET` | `https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents/_indexes/potions` |

### 2.2. Endpoints de Documentos Individuais (Camada 2)

| Categoria | Metodo | Endpoint REST | Exemplo de `{id}` |
| :--- | :--- | :--- | :--- |
| Criatura Individual | `GET` | `.../documents/creatures/{id}` | `acromantula`, `basilisk`, `niffler` |
| Feitico Individual | `GET` | `.../documents/spells/{id}` | `feitico_expelliarmus`, `feitico_lumos` |
| Planta Individual | `GET` | `.../documents/plants/{id}` | `planta_ditamno`, `planta_mandragora` |
| Pocao Individual | `GET` | `.../documents/potions/{id}` | `pocao_pocao_wiggenweld`, `pocao_felix_felicis` |

---

## 3. Exemplos Praticos de Consulta

### 3.1. Consulta via Modulo ES6 Interno (`js/services/database.js`)

Dentro do projeto ou em aplicacoes que importem o servico `database.js`, a conversao do formato REST do Firestore para objetos JavaScript nativos e o cache em memoria sao feitos automaticamente:

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

// 1. Carregar o indice leve da colecao direto do Firestore (_indexes/creatures)
const indiceCriaturas = await fetchCatalogIndex(COLLECTIONS.CREATURES);

// 2. Carregar um unico item completo pelo ID (inclui fotoBase64 da criatura)
const acromantula = await fetchItemById(COLLECTIONS.CREATURES, "acromantula");
console.log(acromantula.nome, acromantula.classificacao, acromantula.fotoBase64);

// 3. Carregar multiplos itens completos sob demanda
const pacoteFeiticos = await fetchItemsByIds(COLLECTIONS.SPELLS, [
    "feitico_expelliarmus",
    "feitico_lumos"
]);
```

### 3.2. Consulta Externa Independente via `fetch` (JavaScript Puro)

Caso deseje consultar a API diretamente a partir de outro repositorio (como o **WWRPG-Ficha**), basta um parser simples para desembrulhar o formato tipado da API REST v1 do Firestore (`stringValue`, `integerValue`, `arrayValue`, `mapValue`):

```javascript
const FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents";

function fromFirestoreValue(valObj) {
    if (!valObj || typeof valObj !== "object") return null;
    if ("nullValue" in valObj) return null;
    if ("booleanValue" in valObj) return Boolean(valObj.booleanValue);
    if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
    if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
    if ("stringValue" in valObj) return valObj.stringValue;
    if ("arrayValue" in valObj) return (valObj.arrayValue.values || []).map(fromFirestoreValue);
    if ("mapValue" in valObj) {
        const out = {};
        for (const [k, v] of Object.entries(valObj.mapValue.fields || {})) {
            out[k] = fromFirestoreValue(v);
        }
        return out;
    }
    return null;
}

function fromFirestoreDoc(docJson) {
    if (!docJson || !docJson.fields) return null;
    const out = {};
    for (const [k, v] of Object.entries(docJson.fields)) {
        out[k] = fromFirestoreValue(v);
    }
    return out;
}

// 1. Consultar indice leve de uma colecao ("creatures" | "spells" | "plants" | "potions")
async function consultarIndiceFirestore(colecao) {
    const res = await fetch(`${FIRESTORE_URL}/_indexes/${colecao}`);
    if (!res.ok) throw new Error(`Erro ao consultar indice: ${res.status}`);
    const doc = fromFirestoreDoc(await res.json());
    return doc?.items || [];
}

// 2. Consultar ficha completa de um item individual pelo ID
async function consultarItemFirestore(colecao, id) {
    const res = await fetch(`${FIRESTORE_URL}/${colecao}/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Item nao encontrado: ${res.status}`);
    return fromFirestoreDoc(await res.json());
}
```

### 3.3. Consulta via `curl` (Linha de Comando)

```bash
# Consultar o indice leve de feiticos no Firestore
curl -s "https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents/_indexes/spells"

# Consultar um feitico individual pelo ID
curl -s "https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents/spells/feitico_expelliarmus"

# Consultar uma criatura individual (com imagem Base64 embutida) pelo ID
curl -s "https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents/creatures/acromantula"
```

---

## 4. Esquemas de Dados (JSON Convertido do Firestore)

### 4.1. Criaturas Magicas (`creatures`)

**Item no Indice (`_indexes/creatures -> items[]`):**
```json
{
  "id": "acromantula",
  "nome": "Acromantula (Acromântula)",
  "classificacao": "XXXXX",
  "licenca": "Não permitido",
  "porte": "Enorme",
  "tamanho": "4,5 metros de envergadura",
  "peso": "180 kg",
  "locomocao": "Terrestres",
  "velocidade": "5.5m",
  "interacao": "Agressivo",
  "tipo": "Consciente",
  "origem": "Artificial"
}
```

**Documento Individual (`creatures/{id}`):**
```json
{
  "id": "acromantula",
  "nome": "Acromantula (Acromântula)",
  "classificacao": "XXXXX",
  "licenca": "Não permitido",
  "porte": "Enorme",
  "tamanho": "4,5 metros de envergadura",
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
  "fotoUrl": "",
  "fotoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

---

### 4.2. Feiticos (`spells`)

**Item no Indice (`_indexes/spells -> items[]`):**
```json
{
  "id": "feitico_expelliarmus",
  "name": "Expelliarmus",
  "pronuncia": "eks-pe-li-AR-mus",
  "cat": "Charme",
  "lvl": "2",
  "tipo": "Ataque",
  "condicao": "(C) Desarmado"
}
```

**Documento Individual (`spells/{id}`):**
```json
{
  "id": "feitico_expelliarmus",
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

### 4.3. Plantas Magicas (`plants`)

**Item no Indice (`_indexes/plants -> items[]`):**
```json
{
  "id": "planta_ditamno",
  "nome": "Ditamno (Dittany)",
  "categoria": "Popular",
  "nivel": "1",
  "manejo_cd": 10
}
```

**Documento Individual (`plants/{id}`):**
```json
{
  "id": "planta_ditamno",
  "nome": "Ditamno (Dittany)",
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

### 4.4. Pocoes (`potions`)

**Item no Indice (`_indexes/potions -> items[]`):**
```json
{
  "id": "pocao_pocao_wiggenweld",
  "nome": "Poção Wiggenweld",
  "tipo": "Poção Curativa",
  "nivel": "1",
  "dificuldade_cd": 12,
  "tempo_preparo": "45 minutos",
  "administracao": "Ingestão"
}
```

**Documento Individual (`potions/{id}`):**
```json
{
  "id": "pocao_pocao_wiggenweld",
  "nome": "Poção Wiggenweld",
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
