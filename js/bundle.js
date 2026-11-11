(function() {
    'use strict';
    console.log('[W&W Catalog] Inicializando Catálogo Ministerial (Standalone Bundle)...');

    /**
 * UTILITÁRIOS GERAIS — MINISTÉRIO DA MAGIA (W&W RPG)
 */
function sanitizeFilename(name) {
    if (!name) return `registro_${Date.now()}`;
    return String(name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase() || `registro_${Date.now()}`;
}

/**
 * Converte arquivo de imagem para Base64 redimensionando via Canvas (máx. 640px)
 * para garantir carregamento rápido e compatibilidade com o limite de 1 MiB por documento do Firestore.
 */
function fileToBase64(file, maxDimension = 640, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onload = e => {
            const dataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                try {
                    let { width, height } = img;
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL("image/jpeg", quality));
                } catch {
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}
function exportJson(dataObj, baseName) {
    const safeName = sanitizeFilename(baseName);
    const jsonString = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `${safeName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
}
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

    /**
 * SERVIÇO DE RASTREAMENTO AUTOMÁTICO DE RELEASES NO GITHUB
 * Verifica periodicamente a API do repositório para detectar novas versões do catálogo
 * e notificar o usuário com botão de download direto do .apk.
 */

const REPO_OWNER = "PHLopesvc07";
const REPO_NAME = "WWRPG-Catalog";
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const CURRENT_APP_VERSION = "1.0.3";

/**
 * Compara duas versões em formato semver (ex: "v1.0.1" e "v1.0.0")
 * Retorna true se target for maior que current.
 */
function isNewerVersion(targetTag, currentTag) {
    if (!targetTag) return false;
    const cleanTarget = targetTag.replace(/^v/i, "").trim();
    const cleanCurrent = currentTag.replace(/^v/i, "").trim();

    const tParts = cleanTarget.split(".").map(n => parseInt(n, 10) || 0);
    const cParts = cleanCurrent.split(".").map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(tParts.length, cParts.length); i++) {
        const t = tParts[i] || 0;
        const c = cParts[i] || 0;
        if (t > c) return true;
        if (t < c) return false;
    }
    return false;
}
async function checkForAppUpdates(currentVersion = CURRENT_APP_VERSION) {
    try {
        const res = await fetch(GITHUB_API_URL, {
            headers: {
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!res.ok) {
            return { hasUpdate: false };
        }

        const data = await res.json();
        const latestTag = data.tag_name || "";
        const hasUpdate = isNewerVersion(latestTag, currentVersion);

        // Procura asset com terminação .apk
        const apkAsset = (data.assets || []).find(a => (a.name || "").toLowerCase().endsWith(".apk"));
        const downloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

        return {
            hasUpdate,
            currentVersion,
            latestVersion: latestTag,
            releaseName: data.name || latestTag,
            releaseNotes: data.body || "",
            downloadUrl,
            publishedAt: data.published_at
        };
    } catch {
        return { hasUpdate: false };
    }
}

    /**
 * CONFIGURAÇÃO DE CONEXÃO — MINISTÉRIO DA MAGIA (W&W RPG)
 */
const DATABASE_CONFIG = {
    projectId: "wwcatalog-10546",
    authDomain: "wwcatalog-10546.firebaseapp.com",
    storageBucket: "wwcatalog-10546.firebasestorage.app"
};

    /**
 * DADOS DE FALLBACK RESILIENTE E OFFLINE
 * Permite inicialização instantânea (0ms) mesmo sem internet.
 */
const FALLBACK_INDEXES = {
  "creatures": [
    {
      "id": "acromantula",
      "nome": "Acromantula (Acromântula)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "4.5 metros (envergadura de pernas)",
      "peso": "150 kg",
      "locomocao": "Terrestres",
      "velocidade": "4.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Artificial"
    },
    {
      "id": "ashwinder",
      "nome": "Ashwinder (Cinzal)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "1.0 metro",
      "peso": "1.2 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Simples",
      "origem": "Artificial"
    },
    {
      "id": "augurey",
      "nome": "Augurey (Agoureiro)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "60 cm",
      "peso": "2.2 kg",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 8.0m | Terrestre: 2.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "basilisk",
      "nome": "Basilisk (Basilisco)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Enorme",
      "tamanho": "15.0 metros",
      "peso": "4.0 Toneladas",
      "locomocao": "Terrestres",
      "velocidade": "3.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Artificial"
    },
    {
      "id": "bicho_papao",
      "nome": "Bicho-Papão (Boggart)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "Varia (Normalmente 1.6 metros)",
      "peso": "Varia (Normalmente 50 kg)",
      "locomocao": "Terrestres",
      "velocidade": "4.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Consciente",
      "origem": "Artificial"
    },
    {
      "id": "billywig",
      "nome": "Billywig (Gira-Gira)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "1.3 cm",
      "peso": "5 g",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 11.0m | Terrestre: 2.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "bowtruckle",
      "nome": "Bowtruckle (Tronquilho)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "20 cm",
      "peso": "150 g",
      "locomocao": "Terrestres",
      "velocidade": "2.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "bundimun",
      "nome": "Bundimun (Bandinho)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "15 cm",
      "peso": "450 g",
      "locomocao": "Terrestres",
      "velocidade": "1.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "centaur",
      "nome": "Centaur (Centauro)",
      "classificacao": "XXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "2.1 metros",
      "peso": "550 kg",
      "locomocao": "Terrestres",
      "velocidade": "4.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "chimera",
      "nome": "Chimera (Quimera)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Enorme",
      "tamanho": "4.5 metros",
      "peso": "1.8 Toneladas",
      "locomocao": "Terrestres",
      "velocidade": "4.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "chizpurfle",
      "nome": "Chizpurfle (Chizácaro)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "1.5 mm",
      "peso": "0.1 g",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "clabbert",
      "nome": "Clabbert (Claberto)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "1.2 metros",
      "peso": "20 kg",
      "locomocao": "Terrestres",
      "velocidade": "4.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "crup",
      "nome": "Crup (Crupe)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "50 cm",
      "peso": "12 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Artificial"
    },
    {
      "id": "dementador",
      "nome": "Dementador (Dementor)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Médio",
      "tamanho": "2.0 metros",
      "peso": "75 kg",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 6.5m | Terrestre: 1.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Artificial"
    },
    {
      "id": "demiguise",
      "nome": "Demiguise (Seminviso)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Médio",
      "tamanho": "1.4 metros",
      "peso": "45 kg",
      "locomocao": "Terrestres",
      "velocidade": "6.4m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "diricawl",
      "nome": "Diricawl (Oraqui-Oralá)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "70 cm",
      "peso": "12 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "doxy",
      "nome": "Doxy (Fada Mordente), Por Vezes Chamadas De Biting Fairy",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "15 cm",
      "peso": "120 g",
      "locomocao": "Terrestres",
      "velocidade": "1.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "dragao_barriga_de_ferro_ucraniano",
      "nome": "Dragão - Barriga-de-Ferro Ucraniano (Ukrainian Ironbelly)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Enorme",
      "tamanho": "22.0 metros",
      "peso": "6.0 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 5.0m | Terrestre: 1.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_chifres_longos_romeno",
      "nome": "Dragão - Chifres-Longos Romeno (Romanian Longhorn)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "14.0 metros",
      "peso": "3.5 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 6.5m | Terrestre: 1.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_dente_de_vibora_peruano",
      "nome": "Dragão - Dente-de-Víbora Peruano (Peruvian Vipertooth)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Médio",
      "tamanho": "4.5 metros",
      "peso": "800 kg",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 11.0m | Terrestre: 2.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_dorso_cristado_noruegues",
      "nome": "Dragão - Dorso-Cristado Norueguês (Norwegian Ridgeback)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "12.0 metros",
      "peso": "2.8 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 8.0m | Terrestre: 2.2m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_focinho_curto_sueco",
      "nome": "Dragão - Focinho-Curto Sueco (Swedish Short-Snout)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "11.0 metros",
      "peso": "2.5 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_meteoro_chines",
      "nome": "Dragão - Meteoro-Chinês (Chinese Fireball)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "15.0 metros",
      "peso": "3.2 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 8.0m | Terrestre: 2.2m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_negro_das_ilhas_hebridas",
      "nome": "Dragão - Negro das Ilhas Hébridas (Hebridean Black)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "9.0 metros",
      "peso": "2.0 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 8.0m | Terrestre: 2.2m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_olho_de_opala_antipoda",
      "nome": "Dragão - Olho-de-Opala Antípoda (Antipodean Opaleye)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "13.0 metros",
      "peso": "2.5 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_rabo_corneo_hungaro",
      "nome": "Dragão - Rabo-Córneo Húngaro (Hungarian Horntail)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Enorme",
      "tamanho": "15.0 metros",
      "peso": "4.0 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dragao_verde_gales_comum",
      "nome": "Dragão - Verde-Galês Comum (Common Welsh Green)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "10.0 metros",
      "peso": "2.2 Toneladas",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "dugbog",
      "nome": "Dugbog (Cava-Charco)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "1.2 metros",
      "peso": "28 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.2m por ação",
      "interacao": "Agressivo",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "erkling",
      "nome": "Erkling (Elfo-Da-Bavária)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Médio",
      "tamanho": "90 cm",
      "peso": "14 kg",
      "locomocao": "Terrestres",
      "velocidade": "2.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "erumpent",
      "nome": "Erumpent (Erumpente)",
      "classificacao": "XXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "4.0 metros",
      "peso": "2.0 Toneladas",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "fairy",
      "nome": "Fairy (Fada)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "12 cm",
      "peso": "50 g",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "fire_crab",
      "nome": "Fire Crab (Caranguejo-De-Fogo)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "70 cm",
      "peso": "18 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "flobberworm",
      "nome": "Flobberworm (Verme-Cego)",
      "classificacao": "X",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "25 cm",
      "peso": "400 g",
      "locomocao": "Terrestres",
      "velocidade": "0.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "fwooper",
      "nome": "Fwooper (Fiuum)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "35 cm",
      "peso": "1.1 kg",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 8.0m | Terrestre: 2.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "ghoul",
      "nome": "Ghoul (Vampiro)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "1.7 metros",
      "peso": "65 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "glumbumble",
      "nome": "Glumbumble (Besouro-Da-Melancolia)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "1.5 cm",
      "peso": "0.2 g",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 5.0m | Terrestre: 1.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "gnome",
      "nome": "Gnome (Gnomo)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "60 cm",
      "peso": "7.5 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "graphorn",
      "nome": "Graphorn (Arpéu)",
      "classificacao": "XXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "3.0 metros",
      "peso": "1.5 Toneladas",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "griffin",
      "nome": "Griffin (Grifo)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "3.2 metros",
      "peso": "650 kg",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "grindylow",
      "nome": "Grindylow (Grindylow)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "1.1 metros",
      "peso": "15 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 5.2m | Terrestre: 0.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "hippocampus",
      "nome": "Hippocampus (Hipocampo)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Grande",
      "tamanho": "2.5 metros",
      "peso": "380 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 6.4m | Terrestre: 1.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "hippogriff",
      "nome": "Hippogriff (Hipogrifo)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Grande",
      "tamanho": "2.2 metros (cernelha)",
      "peso": "600 kg",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "horklump",
      "nome": "Horklump (Tolete)",
      "classificacao": "X",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "15 cm",
      "peso": "800 g",
      "locomocao": "Terrestres",
      "velocidade": "0.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "imp",
      "nome": "Imp (Diabinho)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "20 cm",
      "peso": "1.5 kg",
      "locomocao": "Terrestres",
      "velocidade": "2.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "jarvey",
      "nome": "Jarvey (Furanzão)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "60 cm",
      "peso": "4.5 kg",
      "locomocao": "Terrestres",
      "velocidade": "2.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "jobberknoll",
      "nome": "Jobberknoll (Dedo-Duro)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "18 cm",
      "peso": "120 g",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 8.0m | Terrestre: 2.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "kappa",
      "nome": "Kappa (Kappa)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Médio",
      "tamanho": "1.1 metros",
      "peso": "18 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 6.4m | Terrestre: 1.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "kelpie",
      "nome": "Kelpie (Cavalo-Do-Lago)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "1.8 metros (cernelha)",
      "peso": "450 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 6.4m | Terrestre: 1.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "knarl",
      "nome": "Knarl (Ouriço)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "25 cm",
      "peso": "1.4 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "kneazle",
      "nome": "Kneazle (Amasso)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "80 cm",
      "peso": "9 kg",
      "locomocao": "Terrestres",
      "velocidade": "2.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "leprechaun",
      "nome": "Leprechaun (Leprechaun)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "15 cm",
      "peso": "180 g",
      "locomocao": "Terrestres",
      "velocidade": "2.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "lethifold",
      "nome": "Lethifold (Mortalha-Viva)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "2.5 metros",
      "peso": "2.0 kg (leve como tecido)",
      "locomocao": "Terrestres",
      "velocidade": "7.2m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "lobalug",
      "nome": "Lobalug (Seringa)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "30 cm",
      "peso": "1.5 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 2.8m | Terrestre: 0.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "mackled_malaclaw",
      "nome": "Mackled Malaclaw (Malagarra)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "Médio",
      "peso": "Médio",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "manticore",
      "nome": "Manticore (Manticora)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "3.0 metros",
      "peso": "450 kg",
      "locomocao": "Terrestres",
      "velocidade": "4.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "matagoti",
      "nome": "Matagoti (Matagot)",
      "classificacao": "XXX",
      "licenca": "Magizoologista",
      "porte": "Médio",
      "tamanho": "80 cm",
      "peso": "8 kg",
      "locomocao": "Terrestres",
      "velocidade": "2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "merpeople",
      "nome": "Merpeople (Sereianos)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "1.8 metros",
      "peso": "85 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 6.4m | Terrestre: 1.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "moke",
      "nome": "Moke (Briba)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "25 cm",
      "peso": "150 g",
      "locomocao": "Terrestres",
      "velocidade": "2.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "mooncalf",
      "nome": "Mooncalf (Bezerro Apaixonado)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "1.1 metros",
      "peso": "35 kg",
      "locomocao": "Terrestres",
      "velocidade": "4.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "murtlap",
      "nome": "Murtlap (Murtisco)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "60 cm",
      "peso": "6.5 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "niffler",
      "nome": "Niffler (Pelúcio)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "30 cm",
      "peso": "3.5 kg",
      "locomocao": "Terrestres",
      "velocidade": "2.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "nogtail",
      "nome": "Nogtail (Rabicurto)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "60 cm",
      "peso": "15 kg",
      "locomocao": "Terrestres",
      "velocidade": "2.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "nundu",
      "nome": "Nundu (Nundu)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Enorme",
      "tamanho": "5.0 metros",
      "peso": "2.5 Toneladas",
      "locomocao": "Terrestres",
      "velocidade": "8.0m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "obscurus",
      "nome": "Obscurus (Obscurial)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "Varia (Pode se expandir até 20 metros)",
      "peso": "Intangível (0 kg)",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 11.0m | Terrestre: 2.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Artificial"
    },
    {
      "id": "occamy",
      "nome": "Occamy (Occami)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "Varia (Corpo corrediço até 4.5 metros)",
      "peso": "Varia (Adapta-se ao espaço)",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "passaro_trovao",
      "nome": "Pássaro-Trovão (Thunderbird)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "3.5 metros (cernelha), 6.0 metros de envergadura",
      "peso": "750 kg",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 12.5m | Terrestre: 3.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "phoenix",
      "nome": "Phoenix (Fênix)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "1.2 metros",
      "peso": "15 kg",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 11.0m | Terrestre: 2.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "pixie",
      "nome": "Pixie (Diabrete)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "20 cm",
      "peso": "1.0 kg",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "plimply",
      "nome": "Plimply (Dilátex)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "25 cm",
      "peso": "1.8 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 5.2m | Terrestre: 0.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "pogrebin",
      "nome": "Pogrebin (Pogrebin)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "30 cm",
      "peso": "2.5 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "porlock",
      "nome": "Porlock (Pocotó)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "Médio",
      "peso": "Médio",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "puffskein",
      "nome": "Puffskein (Pufoso)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "25 cm",
      "peso": "1.2 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "pufoso_mini",
      "nome": "Pufoso Mini (Pygmy Puff)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "10 cm",
      "peso": "300 g",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Artificial"
    },
    {
      "id": "quintaped",
      "nome": "Quintaped (Quintípede), Também Chamado Macboon Peludo",
      "classificacao": "XXXXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "Médio",
      "peso": "Médio",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "ramora",
      "nome": "Ramora (Ramora)",
      "classificacao": "XX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "40 cm",
      "peso": "3.2 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 4.0m | Terrestre: 0.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "red_cap",
      "nome": "Red Cap (Barrte Vermelho)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "Médio",
      "peso": "Médio",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "re_em",
      "nome": "Re'Em (Rês-Ma)",
      "classificacao": "XXXX",
      "licenca": "Comum",
      "porte": "Médio",
      "tamanho": "Médio",
      "peso": "Médio",
      "locomocao": "Terrestres",
      "velocidade": "3.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "runespoor",
      "nome": "Runespoor (Farosutil)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Médio",
      "tamanho": "2.1 metros",
      "peso": "90 kg",
      "locomocao": "Terrestres",
      "velocidade": "3.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "salamander",
      "nome": "Salamander (Salamandra)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "20 cm",
      "peso": "450 g",
      "locomocao": "Terrestres",
      "velocidade": "1.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "sea_serpent",
      "nome": "Sea Serpent (Serpente Marinha)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Enorme",
      "tamanho": "35.0 metros",
      "peso": "15.0 Toneladas",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 5.2m | Terrestre: 0.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "shrake",
      "nome": "Shrake (Reque)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "30 cm",
      "peso": "2.0 kg",
      "locomocao": "Aquáticos",
      "velocidade": "Natação: 5.2m | Terrestre: 0.8m por ação",
      "interacao": "Agressivo",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "snidget",
      "nome": "Snidget (Pomorim)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Pequeno",
      "tamanho": "10 cm",
      "peso": "80 g",
      "locomocao": "Aéreos",
      "velocidade": "Voo: 12.5m | Terrestre: 3.2m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "sphinx",
      "nome": "Sphinx (Esfinge)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "2.2 metros",
      "peso": "300 kg",
      "locomocao": "Terrestres",
      "velocidade": "4.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "streeler",
      "nome": "Streeler (Lesmalenta)",
      "classificacao": "XXX",
      "licenca": "Comum",
      "porte": "Pequeno",
      "tamanho": "30 cm",
      "peso": "3.5 kg",
      "locomocao": "Terrestres",
      "velocidade": "1.0m por ação",
      "interacao": "Pacífico",
      "tipo": "Simples",
      "origem": "Natural"
    },
    {
      "id": "tebo",
      "nome": "Tebo (Tebo)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "2.0 metros",
      "peso": "650 kg",
      "locomocao": "Terrestres",
      "velocidade": "3.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "test_ralio",
      "nome": "Test Rálio (Thestral)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "2.4 metros (cernelha)",
      "peso": "800 kg",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 11.0m | Terrestre: 2.8m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "troll",
      "nome": "Troll (Trasgo)",
      "classificacao": "XXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "3.5 metros",
      "peso": "1.5 Toneladas",
      "locomocao": "Terrestres",
      "velocidade": "1.2m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "unicorn",
      "nome": "Unicorn (Unicórnio)",
      "classificacao": "XXXX",
      "licenca": "Magizoologista",
      "porte": "Grande",
      "tamanho": "1.8 metros (cernelha)",
      "peso": "400 kg",
      "locomocao": "Terrestres",
      "velocidade": "6.4m por ação",
      "interacao": "Pacífico",
      "tipo": "Consciente",
      "origem": "Natural"
    },
    {
      "id": "werwwolf",
      "nome": "Werwwolf (Lobisomem)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "1.9 metros",
      "peso": "95 kg",
      "locomocao": "Terrestres",
      "velocidade": "6.4m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Artificial"
    },
    {
      "id": "winged_horse",
      "nome": "Winged Horse (Cavalo Alado)",
      "classificacao": "XX-XXXX",
      "licenca": "Comum",
      "porte": "Grande",
      "tamanho": "2.4 metros (cernelha)",
      "peso": "800 kg",
      "locomocao": "Aquaéros",
      "velocidade": "Voo: 9.5m | Terrestre: 2.5m por ação",
      "interacao": "Pacífico",
      "tipo": "Neutro",
      "origem": "Natural"
    },
    {
      "id": "yeti",
      "nome": "Yeti (Ieti)",
      "classificacao": "XXXX",
      "licenca": "Não permitido",
      "porte": "Grande",
      "tamanho": "3.0 metros",
      "peso": "420 kg",
      "locomocao": "Terrestres",
      "velocidade": "3.5m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    },
    {
      "id": "zouwu",
      "nome": "Zouwu (Zouwu)",
      "classificacao": "XXXXX",
      "licenca": "Não permitido",
      "porte": "Enorme",
      "tamanho": "5.5 metros (comprimento)",
      "peso": "3.5 Toneladas",
      "locomocao": "Terrestres",
      "velocidade": "7.2m por ação",
      "interacao": "Agressivo",
      "tipo": "Bestial",
      "origem": "Natural"
    }
  ],
  "spells": [
    {
      "id": "feitico_abaffiato",
      "name": "Abaffiato",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "A-ba-fi-A-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_aberto",
      "name": "Aberto",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "A-BER-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_accio",
      "name": "Accio",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "A-qui-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_aguamenti",
      "name": "Aguamenti",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "A-gua-MEN-ti",
      "condicao": "(C) Encharcado"
    },
    {
      "id": "feitico_alarte_ascendere",
      "name": "Alarte Ascendere",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "A-LAR-te As-cen-DE-re",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_alohomora",
      "name": "Alohomora",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "A-lo-ho-MO-ra",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_amato_animo_animato_animagus",
      "name": "Amato Animo Animato Animagus",
      "cat": "Transfiguração",
      "lvl": "7",
      "tipo": "Utilitário",
      "pronuncia": "A-MA-to A-NI-mo A-ni-MA-to A-ni-MA-gus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_anapneo",
      "name": "Anapneo",
      "cat": "Cura",
      "lvl": "2",
      "tipo": "Cura",
      "pronuncia": "A-NAP-ne-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_animus_corpus",
      "name": "Animus Corpus",
      "cat": "Transfiguração",
      "lvl": "6",
      "tipo": "Utilitário",
      "pronuncia": "A-ni-mus COR-pus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_animus_imagio",
      "name": "Animus Imágio",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "A-ni-mus I-MA-gi-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_animus_novandi",
      "name": "Animus Novandi",
      "cat": "Transfiguração",
      "lvl": "5",
      "tipo": "Utilitário",
      "pronuncia": "A-ni-mus No-VAN-di",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_anteoculatia",
      "name": "Anteoculatia",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "An-te-o-cu-LA-ci-a",
      "condicao": "(C) Galhadas na Cabeça"
    },
    {
      "id": "feitico_aparatar_e_desaparatar",
      "name": "Aparatar e Desaparatar",
      "cat": "Charme",
      "lvl": "7",
      "tipo": "Utilitário",
      "pronuncia": "Não-verbal (Foco mental)",
      "condicao": "(C) Estrunchado"
    },
    {
      "id": "feitico_aparecium",
      "name": "Aparecium",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "A-pa-RE-ci-um",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_appare_vestigium",
      "name": "Appare Vestigium",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "A-PA-re Ves-TI-gi-um",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_aqua_eructo",
      "name": "Aqua Eructo",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "A-kua E-RUC-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_araniasortia",
      "name": "Araniasortia",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "A-ra-nha-SOR-ti-a",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_arania_exumai",
      "name": "Arania Exumai",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "A-RA-nha Eks-SU-mai",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_aresto_momentum",
      "name": "Aresto Momentum",
      "cat": "Charme",
      "lvl": "5",
      "tipo": "Proteção",
      "pronuncia": "A-RES-to Mo-MEN-tum",
      "condicao": "(C) Desacelerado"
    },
    {
      "id": "feitico_ascendio",
      "name": "Ascendio",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "As-CEN-di-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_avada_kedavra",
      "name": "Avada Kedavra",
      "cat": "Maldição",
      "lvl": "7",
      "tipo": "Ataque",
      "pronuncia": "A-VA-da Ke-DA-vra",
      "condicao": "(C) Morte Instantânea"
    },
    {
      "id": "feitico_avenseguim",
      "name": "Avenseguim",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "A-ven-SE-guim",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_avifors",
      "name": "Avifors",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "A-vi-FORS",
      "condicao": "(C) Transfigurado em Pássaro"
    },
    {
      "id": "feitico_avis",
      "name": "Avis",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "A-vis",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_azaracao_ferreteante",
      "name": "Azaração Ferreteante",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Não-verbal (Gesto de estocada)",
      "condicao": "(C) Rosto Desfigurado"
    },
    {
      "id": "feitico_baubillious",
      "name": "Baubillious",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Bau-BI-li-us",
      "condicao": "(C) Ofuscado"
    },
    {
      "id": "feitico_bombarda",
      "name": "Bombarda",
      "cat": "Maldição Menor",
      "lvl": "4",
      "tipo": "Ataque",
      "pronuncia": "Bom-BAR-da",
      "condicao": "(C) Atordoado"
    },
    {
      "id": "feitico_bombarda_maxima",
      "name": "Bombarda Maxima",
      "cat": "Maldição Menor",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "Bom-BAR-da MAK-si-ma",
      "condicao": "(C) Concussão"
    },
    {
      "id": "feitico_braquium_emendo",
      "name": "Braquium Emendo",
      "cat": "Cura",
      "lvl": "3",
      "tipo": "Cura",
      "pronuncia": "BRA-qui-um E-MEN-do",
      "condicao": "(C) Osso Remendado"
    },
    {
      "id": "feitico_calvorio",
      "name": "Calvorio",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Cal-VO-ri-o",
      "condicao": "(C) Calvo"
    },
    {
      "id": "feitico_cantis",
      "name": "Cantis",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "CAN-tis",
      "condicao": "(C) Canto Incontrolável"
    },
    {
      "id": "feitico_cara_de_lesma",
      "name": "Cara-de-lesma",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Ca-ra de Les-ma",
      "condicao": "(C) Vomitando Lesmas"
    },
    {
      "id": "feitico_carpe_retractum",
      "name": "Carpe Retractum",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "CAR-pe Re-TRAC-tum",
      "condicao": "(C) Puxado"
    },
    {
      "id": "feitico_cave_inimicum",
      "name": "Cave Inimicum",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Proteção",
      "pronuncia": "CA-ve I-ni-MI-cum",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_celescere",
      "name": "Celescere",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Se-les-CE-re",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_chamas_azuis_bluebell_flames",
      "name": "Chamas Azuis (Bluebell Flames)",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "IG-nis Se-RU-le-us",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_circumrota",
      "name": "Circumrota",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Cir-cum-RO-ta",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_cistem_aperio",
      "name": "Cistem Aperio",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "CIS-tem A-PE-ri-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_colloportus",
      "name": "Colloportus",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Co-lo-POR-tus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_colloshoo",
      "name": "Colloshoo",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Co-lo-SHU",
      "condicao": "(C) Pés Presos"
    },
    {
      "id": "feitico_colovaria",
      "name": "Colovaria",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Co-lo-VA-ri-a",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_confringo",
      "name": "Confringo",
      "cat": "Maldição",
      "lvl": "6",
      "tipo": "Ataque",
      "pronuncia": "Con-FRIN-go",
      "condicao": "(C) Queimado"
    },
    {
      "id": "feitico_confundus",
      "name": "Confundus",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Ataque",
      "pronuncia": "Con-FUN-dus",
      "condicao": "(C) Confuso"
    },
    {
      "id": "feitico_conjunctivitus",
      "name": "Conjunctivitus",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Con-junc-ti-VI-tus",
      "condicao": "(C) Conjuntivite"
    },
    {
      "id": "feitico_conjurius_army",
      "name": "Conjurius Army",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Proteção",
      "pronuncia": "Con-JU-ri-us AR-mi",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_crinus_muto",
      "name": "Crinus Muto",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "CRI-nus MU-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_crucio",
      "name": "Crucio",
      "cat": "Maldição",
      "lvl": "7",
      "tipo": "Ataque",
      "pronuncia": "CRU-ci-o",
      "condicao": "(C) Dor Insuportável"
    },
    {
      "id": "feitico_deffodio",
      "name": "Deffodio",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "De-FO-di-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_deletrius",
      "name": "Deletrius",
      "cat": "Contrafeitiço",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "De-LE-tri-us",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_densaugeo",
      "name": "Densaugeo",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Den-SAU-ge-o",
      "condicao": "(C) Dentuço"
    },
    {
      "id": "feitico_deprimo",
      "name": "Deprimo",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "De-PRI-mo",
      "condicao": "(C) Soterrado"
    },
    {
      "id": "feitico_depulso",
      "name": "Depulso",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "De-PUL-so",
      "condicao": "(C) Derrubado"
    },
    {
      "id": "feitico_desilusorio_camaninvisibilis",
      "name": "Desilusório Camaninvisibilis",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Ca-ma-nin-vi-si-BI-lis",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_dessendio",
      "name": "Dessendio",
      "cat": "Contrafeitiço",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "De-SEN-do",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_diffindo",
      "name": "Diffindo",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Di-FIN-do",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_diminuendo",
      "name": "Diminuendo",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Di-mi-nu-EN-do",
      "condicao": "(C) Encolhido"
    },
    {
      "id": "feitico_dissendium",
      "name": "Dissendium",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Di-SEN-di-um",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_draconifors",
      "name": "Draconifors",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Dra-co-ni-FORS",
      "condicao": "(C) Transfigurado em Dragão Menor"
    },
    {
      "id": "feitico_ducklifors",
      "name": "Ducklifors",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Da-cli-FORS",
      "condicao": "(C) Transfigurado em Pato"
    },
    {
      "id": "feitico_duro",
      "name": "Duro",
      "cat": "Contrafeitiço",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "DU-ro",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_ebublio",
      "name": "Ebublio",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "E-BU-bli-o",
      "condicao": "(C) Aprisionado"
    },
    {
      "id": "feitico_element_circa",
      "name": "Element circa",
      "cat": "Charme",
      "lvl": "6",
      "tipo": "Proteção",
      "pronuncia": "E-le-men-te CIR-ca",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_engorgio",
      "name": "Engorgio",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "En-GOR-gi-o",
      "condicao": "(C) Agigantado"
    },
    {
      "id": "feitico_ennervate",
      "name": "Ennervate",
      "cat": "Cura",
      "lvl": "2",
      "tipo": "Cura",
      "pronuncia": "E-ner-VA-te",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_entomorphis",
      "name": "Entomorphis",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "En-to-MOR-fis",
      "condicao": "(C) Mutação Insectóide"
    },
    {
      "id": "feitico_episkey",
      "name": "Episkey",
      "cat": "Cura",
      "lvl": "1",
      "tipo": "Cura",
      "pronuncia": "E-PIS-kei",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_epoximise",
      "name": "Epoximise",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "E-pok-si-MI-se",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_erecto",
      "name": "Erecto",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "E-REC-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_estupefaca",
      "name": "Estupefaça",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Es-tu-pe-FA-ça",
      "condicao": "(C) Desmaiado"
    },
    {
      "id": "feitico_estupore",
      "name": "Estupore",
      "cat": "Maldição Menor",
      "lvl": "4",
      "tipo": "Ataque",
      "pronuncia": "Es-tu-PO-re",
      "condicao": "(C) Atordoado"
    },
    {
      "id": "feitico_evanesco",
      "name": "Evanesco",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "E-va-NES-co",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_everte_statum",
      "name": "Everte Statum",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "E-VER-te STA-tum",
      "condicao": "(C) Arremessado"
    },
    {
      "id": "feitico_expecto_patronum",
      "name": "Expecto Patronum",
      "cat": "Charme",
      "lvl": "5",
      "tipo": "Proteção",
      "pronuncia": "Eks-PEC-to Pa-TRO-num",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_expelliarmus",
      "name": "Expelliarmus",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Eks-pe-li-AR-mus",
      "condicao": "(C) Desarmado"
    },
    {
      "id": "feitico_expulso",
      "name": "Expulso",
      "cat": "Maldição Menor",
      "lvl": "4",
      "tipo": "Ataque",
      "pronuncia": "Eks-PUL-so",
      "condicao": "(C) Arremessado"
    },
    {
      "id": "feitico_extencio",
      "name": "Extencio",
      "cat": "Charme",
      "lvl": "5",
      "tipo": "Utilitário",
      "pronuncia": "Eks-TEN-si-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_fedorinni",
      "name": "Fedorinni",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Fe-do-RI-ni",
      "condicao": "(C) Fedorento"
    },
    {
      "id": "feitico_ferula",
      "name": "Ferula",
      "cat": "Cura",
      "lvl": "1",
      "tipo": "Cura",
      "pronuncia": "FE-ru-la",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_fianto_duri",
      "name": "Fianto Duri",
      "cat": "Charme",
      "lvl": "6",
      "tipo": "Proteção",
      "pronuncia": "Fi-AN-to DU-ri",
      "condicao": "(C) Desintegrar"
    },
    {
      "id": "feitico_fidelius",
      "name": "Fidelius",
      "cat": "Charme",
      "lvl": "6",
      "tipo": "Utilitário",
      "pronuncia": "Fi-DE-li-us",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_finestra",
      "name": "Finestra",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Fi-NES-tra",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_finite_incantatem",
      "name": "Finite Incantatem",
      "cat": "Contrafeitiço",
      "lvl": "2",
      "tipo": "Proteção",
      "pronuncia": "Fi-NI-te In-can-TA-tem",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_flagrante",
      "name": "Flagrante",
      "cat": "Maldição",
      "lvl": "4",
      "tipo": "Proteção",
      "pronuncia": "Fla-GRAN-te",
      "condicao": "(C) Queimado"
    },
    {
      "id": "feitico_flagrate",
      "name": "Flagrate",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Fla-GRA-te",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_flintifors",
      "name": "Flintifors",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Flin-ti-FORS",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_flipendo",
      "name": "Flipendo",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Fli-PEN-do",
      "condicao": "(C) Derrubado"
    },
    {
      "id": "feitico_fogomaldito",
      "name": "Fogomaldito",
      "cat": "Maldição",
      "lvl": "6",
      "tipo": "Ataque",
      "pronuncia": "Fo-go-mal-DI-to (Pes-tis In-CEN-di-um)",
      "condicao": "(C) Queimadura Grave"
    },
    {
      "id": "feitico_fogus_menteo",
      "name": "Fogus Menteo",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "FO-gus Men-TE-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_fracto_strata",
      "name": "Fracto Strata",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "FRAC-to STRA-ta",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_fumos",
      "name": "Fumos",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Proteção",
      "pronuncia": "FU-mos",
      "condicao": "(C) Visão Obscurecida"
    },
    {
      "id": "feitico_fumos_duo",
      "name": "Fumos Duo",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Proteção",
      "pronuncia": "FU-mos DU-o",
      "condicao": "(C) Visão Obscurecida"
    },
    {
      "id": "feitico_furnunculus",
      "name": "Furnunculus",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Fur-NUN-cu-lus",
      "condicao": "(C) Furúnculos"
    },
    {
      "id": "feitico_geminio",
      "name": "Geminio",
      "cat": "Transfiguração",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "Ge-MI-ni-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_glacius",
      "name": "Glacius",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "GLA-ci-us",
      "condicao": "(C) Congelando"
    },
    {
      "id": "feitico_glisseo",
      "name": "Glisseo",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "GLI-se-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_harmonia_nectere_passus",
      "name": "Harmonia Nectere Passus",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "Har-MO-ni-a Nec-TE-re PAS-sus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_herbifors",
      "name": "Herbifors",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Her-bi-FORS",
      "condicao": "(C) Coberto de Flores"
    },
    {
      "id": "feitico_herbivicus",
      "name": "Herbivicus",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Her-BI-vi-cus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_homenum_revelio",
      "name": "Homenum Revelio",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "HO-me-num Re-VE-li-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_homorfo",
      "name": "Homorfo",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Ho-MOR-fo",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_illegibilus",
      "name": "Illegibilus",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "I-le-GI-bi-lus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_immobilus",
      "name": "Immobilus",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "I-MO-bi-lus",
      "condicao": "(C) Paralisado"
    },
    {
      "id": "feitico_impedimenta",
      "name": "Impedimenta",
      "cat": "Azaração",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Im-pe-di-MEN-ta",
      "condicao": "(C) Movimento Impedido"
    },
    {
      "id": "feitico_imperio",
      "name": "Imperio",
      "cat": "Maldição",
      "lvl": "7",
      "tipo": "Ataque",
      "pronuncia": "Im-PE-ri-o",
      "condicao": "(C) Controlado"
    },
    {
      "id": "feitico_impervius",
      "name": "Impervius",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Im-PER-vi-us",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_inanimatus_conjurus",
      "name": "Inanimatus Conjurus",
      "cat": "Transfiguração",
      "lvl": "5",
      "tipo": "Utilitário",
      "pronuncia": "I-na-ni-MA-tus Con-JU-rus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_incarcerous",
      "name": "Incarcerous",
      "cat": "Maldição",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "In-car-CE-rus",
      "condicao": "(C) Aprisionado"
    },
    {
      "id": "feitico_incarcerous_nerus",
      "name": "Incarcerous Nerus",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "In-car-CE-rus NE-rus",
      "condicao": "(C) Enforcado"
    },
    {
      "id": "feitico_incendio",
      "name": "Incendio",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "In-CEN-di-o",
      "condicao": "(C) Em Chamas"
    },
    {
      "id": "feitico_incendio_duo",
      "name": "Incendio Duo",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "In-CEN-di-o DU-o",
      "condicao": "(C) Em Chamas"
    },
    {
      "id": "feitico_incendio_tria",
      "name": "Incendio Tria",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Ataque",
      "pronuncia": "In-CEN-di-o TRI-a",
      "condicao": "(C) Queimadura Grave"
    },
    {
      "id": "feitico_inflatus",
      "name": "Inflatus",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "In-FLA-tus",
      "condicao": "(C) Inflado"
    },
    {
      "id": "feitico_informous",
      "name": "Informous",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "In-FOR-mus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_lacarnum_inflamari",
      "name": "Lacarnum Inflamari",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "La-CAR-num In-fla-MA-ri",
      "condicao": "(C) Em Chamas"
    },
    {
      "id": "feitico_langlock",
      "name": "Langlock",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "LANG-lok",
      "condicao": "(C) Língua Presa"
    },
    {
      "id": "feitico_lapifors",
      "name": "Lapifors",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "La-pi-FORS",
      "condicao": "(C) Transfigurado em Coelho"
    },
    {
      "id": "feitico_legilimens",
      "name": "Legilimens",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "Le-GI-li-mens",
      "condicao": "(C) Mente Invadida"
    },
    {
      "id": "feitico_levicorpus",
      "name": "Levicorpus",
      "cat": "Azaração",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Le-vi-COR-pus (Não-verbal)",
      "condicao": "(C) Suspenso"
    },
    {
      "id": "feitico_levioso",
      "name": "Levioso",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Le-vi-O-so",
      "condicao": "(C) Suspenso"
    },
    {
      "id": "feitico_liberacorpus",
      "name": "Liberacorpus",
      "cat": "Contrafeitiço",
      "lvl": "2",
      "tipo": "Cura",
      "pronuncia": "Li-be-ra-COR-pus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_locomotor",
      "name": "Locomotor",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Lo-co-MO-tor",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_locomotor_mortis",
      "name": "Locomotor Mortis",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Lo-co-MO-tor MOR-tis",
      "condicao": "(C) Pernas Coladas"
    },
    {
      "id": "feitico_locomotor_wibbly",
      "name": "Locomotor Wibbly",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Lo-co-MO-tor UIB-li",
      "condicao": "(C) Pernas de Gelatina"
    },
    {
      "id": "feitico_lumos",
      "name": "Lumos",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "LU-mos",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_lumos_duo",
      "name": "Lumos Duo",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "LU-mos DU-o",
      "condicao": "(C) Ofuscado"
    },
    {
      "id": "feitico_lumos_maxima",
      "name": "Lumos Maxima",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "LU-mos MAK-si-ma",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_lumos_solem",
      "name": "Lumos Solem",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "LU-mos SO-lem",
      "condicao": "(C) Cegado"
    },
    {
      "id": "feitico_magicus_extremos",
      "name": "Magicus Extremos",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "MA-gi-cus Eks-TRE-mos",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_maldicao_de_antonio_dolohov",
      "name": "Maldição de Antonio Dolohov",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "Não-verbal (Golpe cortante com varinha)",
      "condicao": "(C) Dano Interno Grave"
    },
    {
      "id": "feitico_melofors",
      "name": "Melofors",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Me-lo-FORS",
      "condicao": "(C) Cabeça de Abóbora"
    },
    {
      "id": "feitico_meteorolojinx_recanto",
      "name": "Meteorolojinx Recanto",
      "cat": "Contrafeitiço",
      "lvl": "3",
      "tipo": "Proteção",
      "pronuncia": "Me-te-o-ro-LO-jinks Re-CAN-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_mimblewimble",
      "name": "Mimblewimble",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "MIM-bol-UIM-bol",
      "condicao": "(C) Língua Atada"
    },
    {
      "id": "feitico_mobiliarbus",
      "name": "Mobiliarbus",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Mo-bi-li-AR-bus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_mobilicorpus",
      "name": "Mobilicorpus",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Mo-bi-li-COR-pus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_molliare",
      "name": "Molliare",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Proteção",
      "pronuncia": "Mo-li-A-re",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_morsmordre",
      "name": "Morsmordre",
      "cat": "Maldição",
      "lvl": "6",
      "tipo": "Utilitário",
      "pronuncia": "Mors-MOR-dre",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_mucus_ad_nauseam",
      "name": "Mucus ad Nauseam",
      "cat": "Maldição Menor",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "MU-cus ad NAU-se-am",
      "condicao": "(C) Coriza Incessante"
    },
    {
      "id": "feitico_multicorfors",
      "name": "Multicorfors",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Mul-ti-cor-FORS",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_mutatio_skullus",
      "name": "Mutatio Skullus",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Mu-TA-ci-o SKU-lus",
      "condicao": "(C) Crânio Deformado"
    },
    {
      "id": "feitico_nebulus",
      "name": "Nebulus",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Proteção",
      "pronuncia": "NE-bu-lus",
      "condicao": "(C) Visão Obscurecida"
    },
    {
      "id": "feitico_nox",
      "name": "Nox",
      "cat": "Contrafeitiço",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "NOKS",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_obliviate",
      "name": "Obliviate",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "O-bli-vi-A-te",
      "condicao": "(C) Amnésia Total"
    },
    {
      "id": "feitico_obscuro",
      "name": "Obscuro",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Obs-CU-ro",
      "condicao": "(C) Vendado"
    },
    {
      "id": "feitico_oppugno",
      "name": "Oppugno",
      "cat": "Maldição Menor",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "O-PUG-no",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_orbis",
      "name": "Orbis",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "OR-bis",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_orchideous",
      "name": "Orchideous",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Or-qui-DE-us",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_oscausi",
      "name": "Oscausi",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Os-CAU-si",
      "condicao": "(C) Boca Selada"
    },
    {
      "id": "feitico_pack",
      "name": "Pack",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "PEK",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_partis_temporous",
      "name": "Partis Temporous",
      "cat": "Charme",
      "lvl": "5",
      "tipo": "Utilitário",
      "pronuncia": "PAR-tis Tem-PO-rus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_pericullum",
      "name": "Pericullum",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Pe-RI-cu-lum",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_peskipiksi_pesternomi",
      "name": "Peskipiksi Pesternomi",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Pes-ki-PIK-si Pes-ter-NO-mi",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_peso_de_pena",
      "name": "Peso de Pena",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "PE-so de PE-na",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_petrificus_totalus",
      "name": "Petrificus Totalus",
      "cat": "Maldição Menor",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Pe-TRI-fi-cus To-TA-lus",
      "condicao": "(C) Petrificado"
    },
    {
      "id": "feitico_piertotum_locomotor",
      "name": "Piertotum Locomotor",
      "cat": "Transfiguração",
      "lvl": "6",
      "tipo": "Utilitário",
      "pronuncia": "Pi-er-TO-tum Lo-co-MO-tor",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_piscifors",
      "name": "Piscifors",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Pis-ci-FORS",
      "condicao": "(C) Transfigurado em Peixe"
    },
    {
      "id": "feitico_point_me_me_mostre",
      "name": "Point Me (Me Mostre)",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "POIN-ti MI (Me Mostre)",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_portus",
      "name": "Portus",
      "cat": "Transfiguração",
      "lvl": "5",
      "tipo": "Utilitário",
      "pronuncia": "POR-tus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_prior_incantato",
      "name": "Prior Incantato",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "PRI-or In-can-TA-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_protego",
      "name": "Protego",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Proteção",
      "pronuncia": "Pro-TE-go",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_protego_horribilis",
      "name": "Protego Horribilis",
      "cat": "Charme",
      "lvl": "5",
      "tipo": "Proteção",
      "pronuncia": "Pro-TE-go Hor-RI-bi-lis",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_protego_maxima",
      "name": "Protego Maxima",
      "cat": "Charme",
      "lvl": "5",
      "tipo": "Proteção",
      "pronuncia": "Pro-TE-go MAK-si-ma",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_protego_nerus",
      "name": "Protego Nerus",
      "cat": "Maldição",
      "lvl": "6",
      "tipo": "Proteção",
      "pronuncia": "Pro-TE-go NE-rus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_protego_totalum",
      "name": "Protego Totalum",
      "cat": "Charme",
      "lvl": "5",
      "tipo": "Proteção",
      "pronuncia": "Pro-TE-go To-TA-lum",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_pullus",
      "name": "Pullus",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "PU-lus",
      "condicao": "(C) Galinha"
    },
    {
      "id": "feitico_quenterralopus",
      "name": "Quenterralopus",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Quen-ter-RA-lo-pus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_quietus",
      "name": "Quietus",
      "cat": "Contrafeitiço",
      "lvl": "1",
      "tipo": "Proteção",
      "pronuncia": "Qui-E-tus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_redactum_skullus",
      "name": "Redactum Skullus",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Re-DAC-tum SKU-lus",
      "condicao": "(C) Cabeça Encolhida"
    },
    {
      "id": "feitico_reducio",
      "name": "Reducio",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Re-DU-ci-o",
      "condicao": "(C) Encolhido"
    },
    {
      "id": "feitico_reducto",
      "name": "Reducto",
      "cat": "Maldição",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Re-DUC-to",
      "condicao": "(C) Pulverizado"
    },
    {
      "id": "feitico_relaxo",
      "name": "Relaxo",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Re-LAK-so",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_reparifors",
      "name": "Reparifors",
      "cat": "Cura",
      "lvl": "2",
      "tipo": "Cura",
      "pronuncia": "Re-pa-ri-FORS",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_reparifrage",
      "name": "Reparifrage",
      "cat": "Contrafeitiço",
      "lvl": "1",
      "tipo": "Contrafeitiço",
      "pronuncia": "Re-pa-ri-FAR-ge",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_reparo",
      "name": "Reparo",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Re-PA-ro",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_repello_aparatio",
      "name": "Repello Aparatio",
      "cat": "Maldição",
      "lvl": "4",
      "tipo": "Proteção",
      "pronuncia": "Re-PE-lo A-pa-ra-CI-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_repello_inimicum",
      "name": "Repello Inimicum",
      "cat": "Maldição",
      "lvl": "6",
      "tipo": "Proteção",
      "pronuncia": "Re-PE-lo I-ni-MI-cum",
      "condicao": "(C) Desintegrado"
    },
    {
      "id": "feitico_repello_trouxatum",
      "name": "Repello Trouxatum",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Proteção",
      "pronuncia": "Re-PE-lo Trou-XA-tum",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_revellio",
      "name": "Revellio",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Re-VE-li-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_reverto",
      "name": "Reverto",
      "cat": "Contrafeitiço",
      "lvl": "4",
      "tipo": "Contrafeitiço",
      "pronuncia": "Re-VER-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_rictusempra",
      "name": "Rictusempra",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Ric-tu-SEM-pra",
      "condicao": "(C) Crise de Riso"
    },
    {
      "id": "feitico_riddikulus",
      "name": "Riddikulus",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Ri-DI-cu-lus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_salvio_hexia",
      "name": "Salvio Hexia",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Proteção",
      "pronuncia": "SAL-vi-o HEK-si-a",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_scourgify",
      "name": "Scourgify",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Eskur-ji-FAI",
      "condicao": "(C) Boca de Sabão"
    },
    {
      "id": "feitico_sectumsempra",
      "name": "Sectumsempra",
      "cat": "Maldição",
      "lvl": "6",
      "tipo": "Ataque",
      "pronuncia": "Sec-tum-SEM-pra",
      "condicao": "(C) Sangrando Profundamente"
    },
    {
      "id": "feitico_serpensortia",
      "name": "Serpensórtia",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Ser-pen-SOR-ti-a",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_silencio",
      "name": "Silencio",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Utilitário",
      "pronuncia": "Si-LEN-ci-o",
      "condicao": "(C) Silenciado"
    },
    {
      "id": "feitico_skurge",
      "name": "Skurge",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "SKUR-dji",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_sonorus",
      "name": "Sonorus",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "So-NO-rus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_specialis_revelio",
      "name": "Specialis Revelio",
      "cat": "Charme",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Spe-ci-A-lis Re-VE-li-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_speculum",
      "name": "Speculum",
      "cat": "Charme",
      "lvl": "4",
      "tipo": "Proteção",
      "pronuncia": "SPE-cu-lum",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_sponjify",
      "name": "Sponjify",
      "cat": "Transfiguração",
      "lvl": "2",
      "tipo": "Utilitário",
      "pronuncia": "Spon-JI-fai",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_sternius",
      "name": "Sternius",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "STER-ni-us",
      "condicao": "(C) Crise de Espirros"
    },
    {
      "id": "feitico_surgito",
      "name": "Surgito",
      "cat": "Contrafeitiço",
      "lvl": "4",
      "tipo": "Utilitário",
      "pronuncia": "SUR-gi-to",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_tarantallegra",
      "name": "Tarantallegra",
      "cat": "Azaração",
      "lvl": "2",
      "tipo": "Ataque",
      "pronuncia": "Ta-ran-ta-LE-gra",
      "condicao": "(C) Dança Incontrolável"
    },
    {
      "id": "feitico_tentaclifors",
      "name": "Tentaclifors",
      "cat": "Transfiguração",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "Ten-ta-cli-FORS",
      "condicao": "(C) Cabeça de Tentáculo"
    },
    {
      "id": "feitico_tergeo",
      "name": "Tergeo",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "TER-ge-o",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_titillando",
      "name": "Titillando",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Ti-ti-LAN-do",
      "condicao": "(C) Cócegas Debilitantes"
    },
    {
      "id": "feitico_transmogrify",
      "name": "Transmogrify",
      "cat": "Maldição",
      "lvl": "5",
      "tipo": "Ataque",
      "pronuncia": "Trans-mo-gri-FAI",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_tribuomnus",
      "name": "Tribuomnus",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Tri-bu-OM-nus",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_trip",
      "name": "Trip",
      "cat": "Azaração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "TRI-pi",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_tunteli_tintagel",
      "name": "Tunteli Tintagel",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Tun-TE-li Tin-ta-GEL",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_uediuosi",
      "name": "Uediuósi",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Ue-di-U-A-si",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_ventus",
      "name": "Ventus",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "VEN-tus",
      "condicao": "(C) Desequilibrado"
    },
    {
      "id": "feitico_ventus_duo",
      "name": "Ventus Duo",
      "cat": "Charme",
      "lvl": "3",
      "tipo": "Ataque",
      "pronuncia": "VEN-tus DU-o",
      "condicao": "(C) Derrubado"
    },
    {
      "id": "feitico_vera_verto",
      "name": "Vera Verto",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "VE-ra VER-to",
      "condicao": "(C) Transfigurado em Cálice"
    },
    {
      "id": "feitico_verdimillious",
      "name": "Verdimillious",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Ver-di-MI-li-us",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_vermiculus",
      "name": "Vermiculus",
      "cat": "Transfiguração",
      "lvl": "1",
      "tipo": "Ataque",
      "pronuncia": "Ver-MI-cu-lus",
      "condicao": "(C) Transfigurado em Minhoca"
    },
    {
      "id": "feitico_vermillious",
      "name": "Vermillious",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Ver-mi-LI-us",
      "condicao": "(C) Ofuscado"
    },
    {
      "id": "feitico_vipera_evanesca",
      "name": "Vipera Evanesca",
      "cat": "Contrafeitiço",
      "lvl": "2",
      "tipo": "Proteção",
      "pronuncia": "VI-pe-ra E-va-NES-ca",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_vulnera_sanentur",
      "name": "Vulnera Sanentur",
      "cat": "Cura",
      "lvl": "5",
      "tipo": "Cura",
      "pronuncia": "Vul-NE-ra Sa-NEN-tur",
      "condicao": "Nenhuma"
    },
    {
      "id": "feitico_wingardium_leviosa",
      "name": "Wingardium Leviosa",
      "cat": "Charme",
      "lvl": "1",
      "tipo": "Utilitário",
      "pronuncia": "Uin-GAR-di-um Le-vi-O-sa",
      "condicao": "Nenhuma"
    }
  ],
  "plants": [
    {
      "id": "planta_aconito_mata_lobos",
      "nome": "Acônito / Mata-Lobos (Aconite / Wolfsbane / Monkshood)",
      "categoria": "Difícil de Adquirir",
      "nivel": "5",
      "manejo_cd": 18
    },
    {
      "id": "planta_alvissareira_alihotsy",
      "nome": "Alvissareira / Alihotsy",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_ameixa_dirigivel",
      "nome": "Ameixa Dirigível (Dirigible Plum)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_arbusto_borboleta",
      "nome": "Arbusto Borboleta (Flutterby Bush)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_arbusto_de_sementes_de_fogo",
      "nome": "Arbusto de Sementes-de-Fogo (Fireseed Bush)",
      "categoria": "Difícil de Adquirir",
      "nivel": "6",
      "manejo_cd": 18
    },
    {
      "id": "planta_asfodelo",
      "nome": "Asfódelo (Asphodel / Asphodelus albus)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_beladona",
      "nome": "Beladona (Belladonna / Atropa belladonna)",
      "categoria": "Difícil de Adquirir",
      "nivel": "4",
      "manejo_cd": 16
    },
    {
      "id": "planta_bubotubera",
      "nome": "Bubotúbera (Bubotuber)",
      "categoria": "Difícil de Adquirir",
      "nivel": "4",
      "manejo_cd": 16
    },
    {
      "id": "planta_bulbo_saltador",
      "nome": "Bulbo Saltador (Bouncing Bulb)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_coclearia",
      "nome": "Cocleária (Scurvygrass / Cochlearia officinalis)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 10
    },
    {
      "id": "planta_cogumelo_saltador",
      "nome": "Cogumelo Saltador (Leaping Toadstool)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_descurainia",
      "nome": "Descurainia (Fluxweed / Descurainia sophia)",
      "categoria": "Popular",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_ditamno",
      "nome": "Ditamno (Dittany / Origanum dictamnus)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 12
    },
    {
      "id": "planta_espirradeira",
      "nome": "Espirradeira (Sneezewort / Achillea ptarmica)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_estalador_gritante",
      "nome": "Estalador Gritante (Screechsnap)",
      "categoria": "Difícil de Adquirir",
      "nivel": "4",
      "manejo_cd": 16
    },
    {
      "id": "planta_figueira_caustica_figo_seco",
      "nome": "Figueira Cáustica / Figo Seco (Shrivelfig)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 14
    },
    {
      "id": "planta_flor_guarda_chuva",
      "nome": "Flor Guarda-Chuva (Umbrella Flower)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_gengibre",
      "nome": "Gengibre (Ginger Root / Zingiber officinale)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_geranio_dentuco",
      "nome": "Gerânio Dentuço (Fanged Geranium)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_guelricho",
      "nome": "Guelricho (Gillyweed)",
      "categoria": "Difícil de Adquirir",
      "nivel": "4",
      "manejo_cd": 16
    },
    {
      "id": "planta_heleboro",
      "nome": "Heléboro (Hellebore / Helleborus niger)",
      "categoria": "Difícil de Adquirir",
      "nivel": "4",
      "manejo_cd": 16
    },
    {
      "id": "planta_hortela_pimenta",
      "nome": "Hortelã-Pimenta (Peppermint / Mentha × piperita)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_lavanda",
      "nome": "Lavanda (Lavender / Lavandula angustifolia)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_levistico",
      "nome": "Levístico (Lovage / Levisticum officinale)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 10
    },
    {
      "id": "planta_losna_absinto",
      "nome": "Losna / Absinto (Wormwood / Artemisia absinthium)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_malva_doce",
      "nome": "Malva Doce (Mallowsweet)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_mandragora",
      "nome": "Mandrágora (Mandrake / Mandragora officinarum)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 16
    },
    {
      "id": "planta_margarida",
      "nome": "Margarida (Daisy / Bellis perennis)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_mimbulus_mimbletonia",
      "nome": "Mimbulus Mimbletonia",
      "categoria": "Difícil de Adquirir",
      "nivel": "4",
      "manejo_cd": 14
    },
    {
      "id": "planta_narciso_berrador",
      "nome": "Narciso Berrador (Honking Daffodil)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_poligono_erva_de_passarinho",
      "nome": "Polígono / Erva-de-Passarinho (Knotgrass / Polygonum aviculare)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_raiz_de_cuia",
      "nome": "Raiz-de-Cuia (Gurdyroot)",
      "categoria": "Difícil de Adquirir",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_repolho_mastigador_chines",
      "nome": "Repolho Mastigador Chinês (Chinese Chomping Cabbage)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_sabugueiro_wiggen",
      "nome": "Sabugueiro Wiggen (Wiggentree)",
      "categoria": "Popular",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_salgueiro_lutador",
      "nome": "Salgueiro Lutador (Whomping Willow)",
      "categoria": "Difícil de Adquirir",
      "nivel": "6",
      "manejo_cd": 16
    },
    {
      "id": "planta_snargaluff",
      "nome": "Snargaluff",
      "categoria": "Difícil de Adquirir",
      "nivel": "6",
      "manejo_cd": 18
    },
    {
      "id": "planta_tentacula_venenosa",
      "nome": "Tentácula Venenosa (Venomous Tentacula)",
      "categoria": "Difícil de Adquirir",
      "nivel": "5",
      "manejo_cd": 18
    },
    {
      "id": "planta_tormentilha",
      "nome": "Tormentilha (Tormentil / Potentilla erecta)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_tremeluzente",
      "nome": "Tremeluzente (Flitterbloom)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_urtiga_seca",
      "nome": "Urtiga Seca (Stinging Nettle / Urtica dioica)",
      "categoria": "Popular",
      "nivel": "1",
      "manejo_cd": 10
    },
    {
      "id": "planta_vagem_pufosa",
      "nome": "Vagem Pufosa (Puffapod)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 14
    },
    {
      "id": "planta_vagem_sopoforifera",
      "nome": "Vagem Sopoforífera (Sopophorous Bean)",
      "categoria": "Difícil de Adquirir",
      "nivel": "6",
      "manejo_cd": 18
    },
    {
      "id": "planta_valeriana",
      "nome": "Valeriana (Valerian / Valeriana officinalis)",
      "categoria": "Popular",
      "nivel": "2",
      "manejo_cd": 12
    },
    {
      "id": "planta_visgo_do_diabo",
      "nome": "Visgo do Diabo (Devil's Snare)",
      "categoria": "Difícil de Adquirir",
      "nivel": "3",
      "manejo_cd": 16
    }
  ],
  "potions": [
    {
      "id": "pocao_ageing_potion",
      "nome": "Poção do Envelhecimento (Ageing Potion)",
      "tipo": "Poção",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_alihotsy_draught",
      "nome": "Poção de Alisoto / Concocto da Hilaridade (Alihotsy Draught)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão ou Inalação"
    },
    {
      "id": "pocao_amortentia",
      "nome": "Amortentia (Amortentia)",
      "tipo": "Poção (Filtro do Amor)",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "3 semanas (fervura sob fases lunares)",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_angel_s_trumpet_draught",
      "nome": "Veneno de Trombeta-de-Anjo (Angel's Trumpet Draught)",
      "tipo": "Veneno",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_antidote",
      "nome": "Antídoto Geral / Composto Purificador (Antidote)",
      "tipo": "Antídoto",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_antidote_to_common_poisons",
      "nome": "Antídoto para Venenos Comuns (Antidote to Common Poisons)",
      "tipo": "Antídoto",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 15 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_antidote_to_uncommon_poisons",
      "nome": "Antídoto para Venenos Raros (Antidote to Uncommon Poisons)",
      "tipo": "Antídoto",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_antidote_to_veritaserum",
      "nome": "Antídoto para Veritaserum (Antidote to Veritaserum)",
      "tipo": "Antídoto",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "12 horas",
      "administracao": "Ingestão (gotas sublinguais)"
    },
    {
      "id": "pocao_anti_paralysis_potion",
      "nome": "Poção Antiparalisia (Anti-Paralysis Potion)",
      "tipo": "Antídoto",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_armadillo_bile_mixture",
      "nome": "Mistura de Bílis de Tatu (Armadillo Bile Mixture)",
      "tipo": "Solução Cáustica / Ácido",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "6 horas",
      "administracao": "Arremesso (Frasco de vidro) ou Aplicação industrial"
    },
    {
      "id": "pocao_babbling_beverage",
      "nome": "Bebida da Tagarelice (Babbling Beverage)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_baneberry_potion",
      "nome": "Poção de Bagas-da-Morte (Baneberry Potion)",
      "tipo": "Veneno",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_baruffio_s_brain_elixir",
      "nome": "Elixir Cerebral de Baruffio (Baruffio's Brain Elixir)",
      "tipo": "Elixir",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "12 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_beautification_potion",
      "nome": "Poção do Embelezamento (Beautification Potion)",
      "tipo": "Poção (Cosmética)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão ou Aplicação Tópica"
    },
    {
      "id": "pocao_befuddlement_draught",
      "nome": "Poção do Desnorteamento (Befuddlement Draught)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão ou Inalação de vapores"
    },
    {
      "id": "pocao_bloodroot_poison",
      "nome": "Veneno de Raiz-de-Sangue (Bloodroot Poison)",
      "tipo": "Veneno",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "5 horas",
      "administracao": "Ingestão ou Revestimento de Lâminas"
    },
    {
      "id": "pocao_blood_replenishing_potion",
      "nome": "Poção Restauradora de Sangue (Blood-Replenishing Potion)",
      "tipo": "Poção (Medicinal)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_bruise_removal_paste",
      "nome": "Pasta Removedora de Hematomas (Bruise Removal Paste)",
      "tipo": "Pasta / Pomada",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Aplicação Tópica"
    },
    {
      "id": "pocao_bulgeye_potion",
      "nome": "Poção dos Olhos Esbugalhados (Bulgeye Potion)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_bundimun_pomade",
      "nome": "Pomada de Bandinho (Bundimun Pomade)",
      "tipo": "Pomada (Cosmética)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aplicação Tópica no Cabelo"
    },
    {
      "id": "pocao_bundimun_secretion",
      "nome": "Secreção de Bandinho (Bundimun Secretion)",
      "tipo": "Reagente Alquímico / Solvente Ácido",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "Coleta e estabilização (1 hora)",
      "administracao": "Arremesso, Banho de Objetos ou Mistura Alquímica"
    },
    {
      "id": "pocao_burning_bitterroot_balm",
      "nome": "Bálsamo Calmante de Raiz-Amarga (Burning Bitterroot Balm)",
      "tipo": "Bálsamo (Medicinal)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Aplicação Tópica"
    },
    {
      "id": "pocao_burn_healing_paste",
      "nome": "Pasta para Queimaduras (Burn-Healing Paste)",
      "tipo": "Pasta / Pomada (Medicinal)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aplicação Tópica"
    },
    {
      "id": "pocao_calming_draught",
      "nome": "Poção Calmante (Calming Draught)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_caxambu_style_borborygmus_potion",
      "nome": "Poção de Borborigmo Estilo Caxambu (Caxambu Style Borborygmus Potion)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_cheese_based_potions",
      "nome": "Poções à Base de Queijo (Cheese-Based Potions)",
      "tipo": "Alquimia Láctea / Poção Sólida",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "12 horas (cura e fermentação mágica)",
      "administracao": "Ingestão (Alimento sólido)"
    },
    {
      "id": "pocao_chelidonium_miniscula",
      "nome": "Poção de Celidônia Menor (Chelidonium Miniscula)",
      "tipo": "Veneno / Sedativo Muscular",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão ou Revestimento de Dardos"
    },
    {
      "id": "pocao_confidence_boosting_brew",
      "nome": "Tônico da Autoconfiança (Confidence Boosting Brew)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_confusing_concoction",
      "nome": "Concocto da Confusão (Confusing Concoction)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_contortion_potion",
      "nome": "Poção da Contorção (Contortion Potion)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 15 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_cough_potion",
      "nome": "Poção para Tosse (Cough Potion)",
      "tipo": "Poção (Medicinal)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_cupid_crystals",
      "nome": "Cristais de Cupido (Cupid Crystals)",
      "tipo": "Confeitaria / Filtro do Amor",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "3 horas (cristalização)",
      "administracao": "Ingestão (dissolvido em bebida ou alimento)"
    },
    {
      "id": "pocao_cure_for_boils",
      "nome": "Cura para Furúnculos (Cure for Boils)",
      "tipo": "Poção (Medicinal)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Aplicação Tópica ou Ingestão"
    },
    {
      "id": "pocao_dawdle_draught",
      "nome": "Poção da Lentidão (Dawdle Draught)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_death_cap_draught",
      "nome": "Poção de Chapéu-da-Morte (Death-Cap Draught)",
      "tipo": "Veneno",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "5 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_death_potion",
      "nome": "Poção da Morte (Death Potion)",
      "tipo": "Veneno / Poção das Trevas",
      "nivel": "7",
      "dificuldade_cd": 25,
      "tempo_preparo": "Rito de Alquimia das Trevas (1 mês)",
      "administracao": "Contato direto ou Imersão"
    },
    {
      "id": "pocao_deflating_draught",
      "nome": "Solução Desinflamatória / Poção Redutora (Deflating Draught)",
      "tipo": "Antídoto / Poção Redutora",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão ou Aplicação Tópica"
    },
    {
      "id": "pocao_developing_solution",
      "nome": "Solução Reveladora de Fotografias (Developing Solution)",
      "tipo": "Solução Mágica (Industrial)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "2 horas",
      "administracao": "Imersão de Chapas Fotográficas"
    },
    {
      "id": "pocao_dizziness_draught",
      "nome": "Poção da Tontura (Dizziness Draught)",
      "tipo": "Poção",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_dogbane_potion",
      "nome": "Poção Mata-Cães (Dogbane Potion)",
      "tipo": "Veneno / Repelente Canino",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Aspersão de Área ou Isca Ingerível"
    },
    {
      "id": "pocao_dogbreath_potion",
      "nome": "Poção do Hálito de Fogo / Respiração Ardente (Dogbreath Potion)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_doxycide",
      "nome": "Doxicida (Doxycide)",
      "tipo": "Poção (Pestilência / Spray Defensivo)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Aspersão / Spray em Cone de 3 metros"
    },
    {
      "id": "pocao_dragon_dung_fertiliser",
      "nome": "Fertilizante de Excremento de Dragão (Dragon Dung Fertiliser)",
      "tipo": "Solução Agrícola / Tônico de Herbologia",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "3 horas (fermentação)",
      "administracao": "Aplicação no Solo / Raízes"
    },
    {
      "id": "pocao_dragon_poison",
      "nome": "Veneno de Dragão (Dragon Poison)",
      "tipo": "Veneno",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "6 horas",
      "administracao": "Ingestão ou Revestimento de Lâminas"
    },
    {
      "id": "pocao_dragon_tonic",
      "nome": "Tônico para Dragões (Dragon Tonic)",
      "tipo": "Tônico (Trato de Criaturas)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão (misturado na carcaça de alimentação do dragão)"
    },
    {
      "id": "pocao_draught_of_living_death",
      "nome": "Poção do Morto-Vivo (Draught of Living Death)",
      "tipo": "Poção",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "6 horas (exige caldeirão de estanho ou prata)",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_draught_of_peace",
      "nome": "Poção da Paz (Draught of Peace)",
      "tipo": "Poção",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_drowsiness_draught",
      "nome": "Poção da Sonolência (Drowsiness Draught)",
      "tipo": "Poção",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_dr_ubbly_s_oblivious_unction",
      "nome": "Unto Desmemoriador do Dr. Ubbly (Dr Ubbly's Oblivious Unction)",
      "tipo": "Pomada (Medicinal Mental)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Aplicação Tópica"
    },
    {
      "id": "pocao_edurus_potion",
      "nome": "Poção Edurus / Pele de Rocha (Edurus Potion)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_elixir_7",
      "nome": "Elixir 7 (Elixir 7)",
      "tipo": "Elixir",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão (conta-gotas, máx 5 gotas)"
    },
    {
      "id": "pocao_elixir_of_life",
      "nome": "Elixir da Vida (Elixir of Life)",
      "tipo": "Elixir (Alquimia Suprema)",
      "nivel": "7",
      "dificuldade_cd": 25,
      "tempo_preparo": "Operação Alquímica Contínua (Requer a Pedra Filosofal)",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_elixir_to_induce_euphoria",
      "nome": "Elixir para Induzir Euforia (Elixir to Induce Euphoria)",
      "tipo": "Elixir",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_emerald_potion",
      "nome": "Poção Esmeralda / Bebida do Desespero (Emerald Potion / Drink of Despair)",
      "tipo": "Poção das Trevas / Veneno Psíquico",
      "nivel": "7",
      "dificuldade_cd": 25,
      "tempo_preparo": "Rito das Trevas Inviolável",
      "administracao": "Ingestão forçada via concha mágica"
    },
    {
      "id": "pocao_erumpent_potion",
      "nome": "Poção de Erumpente (Erumpent Potion)",
      "tipo": "Poção Volátil / Granada Alquímica",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "4 horas",
      "administracao": "Arremesso (Frasco de vidro arremessável até 9 metros)"
    },
    {
      "id": "pocao_essence_of_insanity",
      "nome": "Essência de Insanidade (Essence of Insanity)",
      "tipo": "Essência / Veneno Mental",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "5 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_everklena",
      "nome": "Everklena / O Falso Limpador (Everklena)",
      "tipo": "Solução Mágica Enganosa",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aplicação em Superfície"
    },
    {
      "id": "pocao_everlasting_elixirs",
      "nome": "Elixires Eternos (Everlasting Elixirs)",
      "tipo": "Elixir",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "Semanas a meses de infusão controlada",
      "administracao": "Ingestão ou Unção"
    },
    {
      "id": "pocao_exploding_potion",
      "nome": "Poção Explosiva (Exploding Potion)",
      "tipo": "Poção Volátil",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Arremesso"
    },
    {
      "id": "pocao_exstimulo_potion",
      "nome": "Poção Exstimulo (Exstimulo Potion)",
      "tipo": "Poção (Potencializadora)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_fake_protective_potions",
      "nome": "Poções Protetoras Falsas (Fake Protective Potions)",
      "tipo": "Poção Enganosa / Placebo",
      "nivel": "1",
      "dificuldade_cd": 10,
      "tempo_preparo": "30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_fatiguing_fusion",
      "nome": "Fusão Fatigante (Fatiguing Fusion)",
      "tipo": "Poção (Debilitante)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 15 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_felix_felicis",
      "nome": "Felix Felicis / Sorte Líquida (Felix Felicis)",
      "tipo": "Poção (Sorte Líquida)",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "6 meses",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_fergus_fungal_budge",
      "nome": "Fungicida de Fergus (Fergus Fungal Budge)",
      "tipo": "Pomada (Medicinal / Fungicida)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Aplicação Tópica"
    },
    {
      "id": "pocao_fire_breathing_potion",
      "nome": "Poção de Cuspir Fogo (Fire-Breathing Potion)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_fire_protection_potion",
      "nome": "Poção de Proteção contra o Fogo (Fire-Protection Potion)",
      "tipo": "Poção (Defensiva)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_first_love_beguiling_bubbles",
      "nome": "Bolhas Cativantes do Primeiro Amor (First Love Beguiling Bubbles)",
      "tipo": "Filtro do Amor (WonderWitch)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_flesh_eating_slug_repellent",
      "nome": "Repelente de Lesmas Carnívoras (Flesh-Eating Slug Repellent)",
      "tipo": "Solução Repelente (Pestilência)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aspersão no Solo ou Plantas"
    },
    {
      "id": "pocao_focus_potion",
      "nome": "Poção do Foco (Focus Potion)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_forgetfulness_potion",
      "nome": "Poção do Esquecimento (Forgetfulness Potion)",
      "tipo": "Poção",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_frog_parts_mixture",
      "nome": "Mistura de Partes de Sapo (Frog Parts Mixture)",
      "tipo": "Base Alquímica Composta",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Reagente de Caldeirão ou Arremesso no Solo"
    },
    {
      "id": "pocao_fungiface_potion",
      "nome": "Poção Rostocogumelo (Fungiface Potion)",
      "tipo": "Poção (Pegadinha)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_garrotting_gas",
      "nome": "Gás Garroteador (Garrotting Gas)",
      "tipo": "Gás Tóxico / Granada Alquímica",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "4 horas",
      "administracao": "Arremesso / Quebra de Ampola"
    },
    {
      "id": "pocao_germinating_potion",
      "nome": "Poção Germinadora (Germinating Potion)",
      "tipo": "Solução Botânica",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Rega de Sementes"
    },
    {
      "id": "pocao_girding_potion",
      "nome": "Poção do Vigor Físico / Cinta de Força (Girding Potion)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_grand_pepperup_potion",
      "nome": "Grande Poção Estimulante (Grand Pepperup Potion)",
      "tipo": "Poção (Medicinal Avançada)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_grand_wiggenweld_potion",
      "nome": "Grande Poção Wiggenweld (Grand Wiggenweld Potion)",
      "tipo": "Poção (Cura Avançada)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_gregory_s_unctuous_unction",
      "nome": "Unto Untuoso de Gregory (Gregory's Unctuous Unction)",
      "tipo": "Pomada (Influência Mental)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão ou Aplicação Tópica"
    },
    {
      "id": "pocao_hair_dyeing_potion",
      "nome": "Poção de Tingir Cabelos (Hair-Dyeing Potion)",
      "tipo": "Poção (Cosmética)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Aplicação Tópica no Cabelo"
    },
    {
      "id": "pocao_hair_raising_potion",
      "nome": "Poção para Arrepiar Cabelos (Hair-Raising Potion)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_hate_potion",
      "nome": "Poção do Ódio (Hate Potion)",
      "tipo": "Poção (Mental Negativa)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_healing_potion",
      "nome": "Poção de Cura Básica (Healing Potion)",
      "tipo": "Poção (Medicinal)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_heartbreak_teardrops",
      "nome": "Lágrimas do Coração Partido (Heartbreak Teardrops)",
      "tipo": "Filtro do Amor (WonderWitch)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão (misturado em bebida)"
    },
    {
      "id": "pocao_herbicide_potion",
      "nome": "Poção Herbicida (Herbicide Potion)",
      "tipo": "Poção (Agrícola / Destrutiva)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "1 hora",
      "administracao": "Aspersão ou Arremesso"
    },
    {
      "id": "pocao_hiccoughing_solution",
      "nome": "Solução do Soluço (Hiccoughing Solution)",
      "tipo": "Solução (Pegadinha)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_invigoration_draught",
      "nome": "Poção do Vigor / Concocto Revigorante (Invigoration Draught)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_invisibility_potion",
      "nome": "Poção de Invisibilidade (Invisibility Potion)",
      "tipo": "Poção",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_jawbind_potion",
      "nome": "Poção de Travar Mandíbula (Jawbind Potion)",
      "tipo": "Poção / Veneno Motor",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_kissing_concoction",
      "nome": "Concocto do Beijo (Kissing Concoction)",
      "tipo": "Filtro do Amor (WonderWitch)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_laugh_inducing_potion",
      "nome": "Poção do Riso Incontrolável (Laugh-inducing Potion)",
      "tipo": "Poção",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão ou Arremesso"
    },
    {
      "id": "pocao_laxative_potion",
      "nome": "Poção Laxante (Laxative Potion)",
      "tipo": "Poção (Pegadinha / Medicinal)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_love_potion",
      "nome": "Poção do Amor Comum (Love Potion)",
      "tipo": "Filtro do Amor",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_love_potion_antidote",
      "nome": "Antídoto para Poções do Amor (Love Potion Antidote)",
      "tipo": "Antídoto",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_madame_glossy_s_silver_polish",
      "nome": "Polidor de Prata da Madame Glossy (Madame Glossy's Silver Polish)",
      "tipo": "Solução Mágica (Limpeza)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Aplicação em Objetos de Metal"
    },
    {
      "id": "pocao_malevolent_mixture",
      "nome": "Mistura Malévola (Malevolent Mixture)",
      "tipo": "Veneno / Poção Sombria",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão ou Revestimento de Lâminas"
    },
    {
      "id": "pocao_mandrake_restorative_draught",
      "nome": "Tônico Restaurador de Mandrágora (Mandrake Restorative Draught)",
      "tipo": "Tônico / Antídoto Supremo",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "6 horas (após meses de cultivo das mandrágoras até a idade adulta)",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_manegro_potion",
      "nome": "Poção Manegro / Crescimento Capilar (Manegro Potion)",
      "tipo": "Poção (Capilar)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aplicação Tópica ou Ingestão"
    },
    {
      "id": "pocao_maxima_potion",
      "nome": "Poção Maxima (Maxima Potion)",
      "tipo": "Poção (Potencializadora)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_maximum_turbo_farts_potion",
      "nome": "Poção do Turbofumpe Máximo (Maximum Turbo Farts Potion)",
      "tipo": "Poção (Pegadinha Grotesca)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_memory_potion",
      "nome": "Poção da Memória (Memory Potion)",
      "tipo": "Poção (Cognitiva)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_moonseed_poison",
      "nome": "Veneno de Semente-da-Lua (Moonseed Poison)",
      "tipo": "Veneno",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_mopsus_potion",
      "nome": "Poção de Mopso (Mopsus Potion)",
      "tipo": "Poção (Adivinhação / Telecinese)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "5 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_mouth_itching_antidote",
      "nome": "Antídoto para Coceira na Boca (Mouth Itching Antidote)",
      "tipo": "Antídoto",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Bochecho ou Ingestão"
    },
    {
      "id": "pocao_mrs_scower_s_all_purpose_magical_mess_remover",
      "nome": "Removedor Mágico Multiuso da Sra. Skower (Mrs Skower's All-Purpose Magical Mess Remover)",
      "tipo": "Solução Mágica (Limpeza)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Aplicação em Superfície"
    },
    {
      "id": "pocao_muffling_draught",
      "nome": "Poção do Silenciamento / Concocto Abafador (Muffling Draught)",
      "tipo": "Poção / Gás Silenciador",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão ou Inalação"
    },
    {
      "id": "pocao_murtlap_essence",
      "nome": "Essência de Murtlap (Murtlap Essence)",
      "tipo": "Essência (Medicinal)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Imersão ou Aplicação Tópica"
    },
    {
      "id": "pocao_narglecide",
      "nome": "Narglicida (Narglecide)",
      "tipo": "Poção (Pestilência / Exotismo)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Aspersão em Visgos ou Roupas"
    },
    {
      "id": "pocao_noxious_poison",
      "nome": "Veneno Nocivo / Ácido Pútrido (Noxious Poison)",
      "tipo": "Veneno / Gás Corrosivo",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão ou Arremesso"
    },
    {
      "id": "pocao_oculus_potion",
      "nome": "Poção Ocular (Oculus Potion)",
      "tipo": "Poção (Oftalmológica / Medicinal)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Colírio / Gotas Oculares ou Ingestão"
    },
    {
      "id": "pocao_pepperup_elixir",
      "nome": "Elixir Estimulante (Pepperup Elixir)",
      "tipo": "Elixir (Concentrado)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão (conta-gotas, 7 a 21 gotas)"
    },
    {
      "id": "pocao_pepperup_potion",
      "nome": "Poção Estimulante / Apimentada (Pepperup Potion)",
      "tipo": "Poção (Medicinal)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_polyjuice_potion",
      "nome": "Poção Polissuco (Polyjuice Potion)",
      "tipo": "Poção (Transformação Avançada)",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "1 mês (28 dias sob ciclo lunar)",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_pomfrey_s_pick_me_up",
      "nome": "Revigorante de Madame Pomfrey (Pomfrey's Pick-Me-Up)",
      "tipo": "Tônico (Medicinal)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_pompion_potion",
      "nome": "Poção de Abóbora (Pompion Potion)",
      "tipo": "Poção (Transfiguração Temporária)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_potion_for_dreamless_sleep",
      "nome": "Poção do Sono sem Sonhos (Potion for Dreamless Sleep)",
      "tipo": "Poção (Sedativo Avançado)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_potion_no_113",
      "nome": "Poção Nº 113 (Potion № 113)",
      "tipo": "Veneno (Silenciador Letal)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "5 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_potion_no_329",
      "nome": "Poção Nº 329 (Potion No. 329)",
      "tipo": "Solução Alquímica / Preservante",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Imersão de Espécimes ou Aspersão de Limpeza"
    },
    {
      "id": "pocao_potion_no_86",
      "nome": "Poção Nº 86 (Potion № 86)",
      "tipo": "Veneno (Necrosante Severo)",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "8 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_potion_n_07",
      "nome": "Poção Nº 07 (Potion № 07)",
      "tipo": "Veneno (Experimental)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão ou Revestimento de Armas"
    },
    {
      "id": "pocao_potion_n_220",
      "nome": "Poção Nº 220 (Potion N. 220)",
      "tipo": "Poção (Hospitalar / Emergência)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_potion_of_all_potential",
      "nome": "Poção de Todo o Potencial (Potion of All Potential)",
      "tipo": "Poção (Potencializadora de Atributos)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "6 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_quodpot_solution",
      "nome": "Solução de Quodpot (Quodpot Solution)",
      "tipo": "Solução Mágica (Desaceleradora de Explosão)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Imersão de Objetos"
    },
    {
      "id": "pocao_rano_potion",
      "nome": "Poção de Rano / Poção da Aurora (Rano Potion)",
      "tipo": "Tônico (Circadiano)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão (ao alvorecer)"
    },
    {
      "id": "pocao_rat_spleen_mixture",
      "nome": "Mistura de Baço de Rato (Rat Spleen Mixture)",
      "tipo": "Base Alquímica / Solução Reagente",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Aditivo de Caldeirão"
    },
    {
      "id": "pocao_rat_tonic",
      "nome": "Tônico para Ratos (Rat Tonic)",
      "tipo": "Tônico (Trato de Animais)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "30 minutos",
      "administracao": "Ingestão (para roedores)"
    },
    {
      "id": "pocao_regeneration_potion",
      "nome": "Poção de Regeneração Corporal das Trevas (Regeneration Potion)",
      "tipo": "Poção das Trevas / Alquimia Corporal",
      "nivel": "7",
      "dificuldade_cd": 25,
      "tempo_preparo": "Ritual Complexo no Caldeirão Gigante (1 hora de rito final)",
      "administracao": "Imersão do ser rudimentar no caldeirão"
    },
    {
      "id": "pocao_regerminating_potion",
      "nome": "Poção Regerminadora (Regerminating Potion)",
      "tipo": "Solução Botânica",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Rega de Plantas"
    },
    {
      "id": "pocao_restoration_potion",
      "nome": "Poção de Restauração (Restoration Potion)",
      "tipo": "Poção (Desencantadora)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão ou Aspersão sobre o Objeto"
    },
    {
      "id": "pocao_revive_potion",
      "nome": "Poção do Despertar / Reviver (Revive Potion)",
      "tipo": "Poção (Revigorante / Despertar)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão ou Gotas no Nariz"
    },
    {
      "id": "pocao_rudimentary_body_potion",
      "nome": "Poção do Corpo Rudimentar (Rudimentary Body Potion)",
      "tipo": "Poção das Trevas",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "Preparo contínuo e diário",
      "administracao": "Ingestão periódica"
    },
    {
      "id": "pocao_scintillation_solution",
      "nome": "Solução da Cintilância / Brilho Feérico (Scintillation Solution)",
      "tipo": "Solução Mágica (Efeito Visual)",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Ingestão ou Aspersão"
    },
    {
      "id": "pocao_screaming_potion",
      "nome": "Poção dos Gritos Estridentes (Screaming Potion)",
      "tipo": "Poção (Pegadinha Sonora)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_screaming_snakes_hair_potion",
      "nome": "Poção dos Cabelos de Serpente Gritadora (Screaming Snakes Hair Potion)",
      "tipo": "Poção (Pegadinha Grotesca)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_shrinking_solution",
      "nome": "Solução para Encolher (Shrinking Solution)",
      "tipo": "Poção",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão ou Aspersão"
    },
    {
      "id": "pocao_skele_gro",
      "nome": "Esquelece / Regenerador Ósseo (Skele-Gro)",
      "tipo": "Poção (Regeneração Óssea Severa)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "8 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_sleekeazy_s_hair_potion",
      "nome": "Poção Capilar Alisadora de Sleekeazy (Sleekeazy's Hair Potion)",
      "tipo": "Poção (Cosmética Capilar)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aplicação Tópica no Cabelo"
    },
    {
      "id": "pocao_sleeping_draught",
      "nome": "Poção do Sono (Sleeping Draught)",
      "tipo": "Poção (Sedativo)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_snuffling_potion",
      "nome": "Poção do Faro Aguçado (Snuffling Potion)",
      "tipo": "Poção (Sensorial)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 15 minutos",
      "administracao": "Ingestão ou Inalação"
    },
    {
      "id": "pocao_solution_078",
      "nome": "Solução 078 (Solution 078)",
      "tipo": "Solução Alquímica (Estabilizadora)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aditivo de Caldeirão"
    },
    {
      "id": "pocao_solution_125",
      "nome": "Solução 125 (Solution 125)",
      "tipo": "Solução Alquímica (Neutralizadora de Ácidos)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aspersão ou Imersão"
    },
    {
      "id": "pocao_stamina_potion",
      "nome": "Poção de Estamina / Fôlego Inabalável (Stamina Potion)",
      "tipo": "Poção",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_star_grass_salve",
      "nome": "Unguento de Grama-Estrela (Star Grass Salve)",
      "tipo": "Pomada (Medicinal)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aplicação Tópica"
    },
    {
      "id": "pocao_strengthening_solution",
      "nome": "Solução Fortalecedora (Strengthening Solution)",
      "tipo": "Solução (Fortalecedora Avançada)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_strength_potion",
      "nome": "Poção de Força Primitiva (Strength Potion)",
      "tipo": "Poção (Primitiva)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_strong_exstimulo_potion",
      "nome": "Poção Exstimulo Forte (Strong Exstimulo Potion)",
      "tipo": "Poção (Potencializadora Avançada)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_strong_invigoration_draught",
      "nome": "Forte Poção do Vigor (Strong Invigoration Draught)",
      "tipo": "Poção (Vigor Extremo)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_stupid_potion",
      "nome": "Poção da Estupidez / Embotamento Mental (Stupid Potion)",
      "tipo": "Poção (Debilitante Mental)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_swelling_solution",
      "nome": "Solução para Inchar (Swelling Solution)",
      "tipo": "Poção / Solução Inflamatória",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 15 minutos",
      "administracao": "Ingestão, Contato Tópico ou Arremesso"
    },
    {
      "id": "pocao_ten_second_pimple_vanisher",
      "nome": "Desaparecedor de Espinhas em Dez Segundos (Ten-Second Pimple Vanisher)",
      "tipo": "Pomada (WonderWitch / Dermatológica)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Aplicação Tópica no Rosto ou Corpo"
    },
    {
      "id": "pocao_thick_golden_potion",
      "nome": "Poção Dourada (Golden Potion)",
      "tipo": "Poção (Cura Avançada)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "6 horas",
      "administracao": "Ingestão ou Unção"
    },
    {
      "id": "pocao_thunderbrew",
      "nome": "Poção Tempestuosa / Cerveja do Trovão (Thunderbrew)",
      "tipo": "Poção (Combate Tempestuoso)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_tolipan_blemish_blitzer",
      "nome": "Removedor de Manchas Tolipan (Tolipan Blemish Blitzer)",
      "tipo": "Pasta (Dermatológica)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Aplicação Tópica"
    },
    {
      "id": "pocao_tonic_for_trace_detection",
      "nome": "Tônico para Detecção do Rastro (Tonic for Trace Detection)",
      "tipo": "Tônico (Investigativo)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Ingestão ou Gotas Oculares"
    },
    {
      "id": "pocao_truth_serum",
      "nome": "Soro da Verdade Menor (Truth Serum)",
      "tipo": "Poção (Coerção Mental Menor)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "4 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_twilight_moonbeams",
      "nome": "Raios de Luar Crepuscular (Twilight Moonbeams)",
      "tipo": "Filtro do Amor (WonderWitch / Onírico)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "3 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_venomous_tentacula_juice",
      "nome": "Suco de Tentácula Venenosa (Venomous Tentacula Juice)",
      "tipo": "Veneno (Botânico Letal)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "Coleta e purificação de risco (2 horas)",
      "administracao": "Ingestão ou Revestimento de Lâminas"
    },
    {
      "id": "pocao_veritaserum",
      "nome": "Veritaserum (Veritaserum)",
      "tipo": "Poção (Soro da Verdade Supremo)",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "1 ciclo lunar completo (28 dias sob fermentação)",
      "administracao": "Ingestão (3 gotas dissolvidas em bebida)"
    },
    {
      "id": "pocao_vitamix_potion",
      "nome": "Poção Vitamix / Explosão de Energia (Vitamix Potion)",
      "tipo": "Poção (Energética)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_volubilis_potion",
      "nome": "Poção Volubilis (Volubilis Potion)",
      "tipo": "Poção (Vocal / Medicinal)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 15 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_weakness_potion",
      "nome": "Poção do Enfraquecimento (Weakness Potion)",
      "tipo": "Poção / Gás Debilitante",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "2 horas",
      "administracao": "Inalação de Vapores ou Ingestão"
    },
    {
      "id": "pocao_weedosoros",
      "nome": "Weedosoros (Weedosoros)",
      "tipo": "Veneno (Indetectável)",
      "nivel": "5",
      "dificuldade_cd": 20,
      "tempo_preparo": "5 horas",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_wideye_potion",
      "nome": "Poção dos Olhos Abertos / Poção do Despertar (Wideye Potion / Awakening Potion)",
      "tipo": "Poção (Despertar / Antidormideira)",
      "nivel": "3",
      "dificuldade_cd": 16,
      "tempo_preparo": "1 hora e 45 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_wiggenweld_potion",
      "nome": "Poção Wiggenweld (Wiggenweld Potion)",
      "tipo": "Poção (Cura & Vitalidade)",
      "nivel": "2",
      "dificuldade_cd": 14,
      "tempo_preparo": "1 hora e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_wit_sharpening_potion",
      "nome": "Poção para Aguçar a Mente (Wit-Sharpening Potion)",
      "tipo": "Poção (Cognitiva / Desobstrutora)",
      "nivel": "4",
      "dificuldade_cd": 18,
      "tempo_preparo": "2 horas e 30 minutos",
      "administracao": "Ingestão"
    },
    {
      "id": "pocao_wolfsbane_potion",
      "nome": "Poção do Acônito / Mata-Cão (Wolfsbane Potion)",
      "tipo": "Poção (Alquimia Avançada de Licantropia)",
      "nivel": "6",
      "dificuldade_cd": 22,
      "tempo_preparo": "7 dias de preparo prévio à lua cheia",
      "administracao": "Ingestão diária na semana anterior à lua cheia"
    },
    {
      "id": "pocao_wound_cleaning_potion",
      "nome": "Poção para Limpeza de Ferimentos (Wound-Cleaning Potion)",
      "tipo": "Poção / Solução Antisséptica",
      "nivel": "1",
      "dificuldade_cd": 12,
      "tempo_preparo": "45 minutos",
      "administracao": "Lavagem Tópica sobre o Ferimento"
    }
  ]
};

    /**
 * SERVIÇO DE BANCO DE DADOS E CARREGAMENTO INDIVIDUAL SOB DEMANDA (FIRESTORE)
 * Todos os índices e documentos individuais (incluindo retratos Base64 de criaturas)
 * são consultados diretamente do Cloud Firestore com cache em memória e cache local persistente
 * para proporcionar velocidade instantânea.
 */
// [bundled-import]
// [bundled-import]
// [bundled-import]
const COLLECTIONS = {
    CREATURES: "creatures",
    SPELLS: "spells",
    PLANTS: "plants",
    POTIONS: "potions"
};

const COLLECTION_PREFIX = {
    creatures: "criatura",
    spells: "feitico",
    plants: "planta",
    potions: "pocao"
};

const PROJECT_ID = DATABASE_CONFIG.projectId || "wwcatalog-10546";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_COMMIT_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

// Cache em memória para documentos individuais já abertos
const itemMemoryCache = new Map();
// Cache em memória dos índices leves por coleção
const indexMemoryCache = new Map();

/**
 * Converte valores JavaScript para o formato REST do Firestore
 */
function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === "boolean") return { booleanValue: val };
    if (typeof val === "number") {
        return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (typeof val === "string") return { stringValue: val };
    if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === "object") {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
            if (v !== undefined) fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return fields;
}

/**
 * Converte valores do formato REST do Firestore para objetos JavaScript nativos
 */
function fromFirestoreValue(valObj) {
    if (!valObj || typeof valObj !== "object") return null;
    if ("nullValue" in valObj) return null;
    if ("booleanValue" in valObj) return Boolean(valObj.booleanValue);
    if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
    if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
    if ("stringValue" in valObj) return valObj.stringValue;
    if ("timestampValue" in valObj) return valObj.timestampValue;
    if ("arrayValue" in valObj) {
        const vals = valObj.arrayValue?.values || [];
        return vals.map(fromFirestoreValue);
    }
    if ("mapValue" in valObj) {
        const fields = valObj.mapValue?.fields || {};
        const out = {};
        for (const [k, v] of Object.entries(fields)) {
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
    if (!out.id && docJson.name) {
        out.id = docJson.name.split("/").pop();
    }
    return out;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function firestoreGetDoc(collectionPath, docId) {
    try {
        const res = await fetchWithTimeout(`${FIRESTORE_BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`);
        if (!res.ok) return null;
        const json = await res.json();
        return fromFirestoreDoc(json);
    } catch {
        return null;
    }
}

async function firestoreListCollection(collectionPath) {
    const docs = [];
    let pageToken = "";
    try {
        do {
            const url = `${FIRESTORE_BASE_URL}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
            const res = await fetchWithTimeout(url, {}, 10000);
            if (!res.ok) break;
            const json = await res.json();
            const list = json.documents || [];
            for (const docJson of list) {
                const parsed = fromFirestoreDoc(docJson);
                if (parsed) docs.push(parsed);
            }
            pageToken = json.nextPageToken || "";
        } while (pageToken);
    } catch {
        // Retorna o que foi coletado
    }
    return docs;
}

async function firestoreSetDoc(collectionPath, docId, dataObj) {
    try {
        const res = await fetchWithTimeout(
            `${FIRESTORE_BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: toFirestoreFields(dataObj) })
            },
            10000
        );
        return res.ok;
    } catch {
        return false;
    }
}

async function firestoreDeleteDoc(collectionPath, docId) {
    try {
        const res = await fetchWithTimeout(
            `${FIRESTORE_BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`,
            { method: "DELETE" },
            8000
        );
        return res.ok;
    } catch {
        return false;
    }
}

async function firestoreBatchWrite(collectionPath, recordsArray) {
    try {
        const writes = recordsArray.map(rec => ({
            update: {
                name: `projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${rec.id}`,
                fields: toFirestoreFields(rec)
            }
        }));
        const res = await fetchWithTimeout(
            FIRESTORE_COMMIT_URL,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ writes })
            },
            15000
        );
        return res.ok;
    } catch {
        return false;
    }
}
async function initDatabaseConnection() {
    return true;
}
function buildItemId(collectionName, item, prefix = "") {
    if (item.id && typeof item.id === "string" && item.id.trim()) {
        return item.id.trim();
    }
    const rawName = item.nome || item.name || `item_${Date.now()}`;
    const baseName = rawName.split("(")[0].trim() || rawName;
    const clean = sanitizeFilename(baseName);
    const colPrefix = prefix || COLLECTION_PREFIX[collectionName] || "item";
    if (collectionName === COLLECTIONS.CREATURES) {
        return clean;
    }
    return clean.startsWith(`${colPrefix}_`) ? clean : `${colPrefix}_${clean}`;
}
function buildSummaryEntry(collectionName, item) {
    const id = buildItemId(collectionName, item);

    switch (collectionName) {
        case COLLECTIONS.CREATURES:
            return {
                id,
                nome: item.nome || item.name || "Espécie sem nome",
                classificacao: item.classificacao || item.classification || "XXX",
                licenca: item.licenca || item.license || "Comum",
                porte: item.porte || "Médio",
                tamanho: item.tamanho || "",
                peso: item.peso || "",
                locomocao: item.locomocao || "Terrestres",
                velocidade: item.velocidade || "",
                interacao: item.interacao || "Pacífico",
                tipo: item.tipo || "Neutro",
                origem: item.origem || "Natural"
            };

        case COLLECTIONS.SPELLS:
            return {
                id,
                name: item.name || item.nome || "Feitiço sem nome",
                cat: Array.isArray(item.cat) ? item.cat[0] : (item.cat || "Charme"),
                lvl: String(item.lvl || "1"),
                tipo: item.tipo || "Utilitário",
                pronuncia: item.pronuncia || item.pronunciation || "",
                condicao: item.condicao || "Nenhuma"
            };

        case COLLECTIONS.PLANTS:
            return {
                id,
                nome: item.nome || item.name || "Planta sem nome",
                categoria: normalizePlantCategory(item.categoria),
                nivel: String(item.nivel || extractPlantLevel(item.peculiaridades) || "1"),
                manejo_cd: Number(item.manejo_cd || extractPlantCd(item.peculiaridades) || 12)
            };

        case COLLECTIONS.POTIONS: {
            const lvl = String(item.nivel ?? item["nível"] ?? "1");
            const cd = item.sistema?.dificuldade_cd ?? item.dificuldade_cd ?? 14;
            const prep = item.sistema?.tempo_preparo ?? item.tempo_preparo ?? "1 hora";
            const admin = item.sistema?.administracao ?? item.administracao ?? "Ingestão";
            return {
                id,
                nome: item.nome || item.name || "Poção sem nome",
                tipo: item.tipo || "Poção",
                nivel: lvl,
                dificuldade_cd: Number(cd),
                tempo_preparo: prep,
                administracao: admin
            };
        }

        default:
            return { id, nome: item.nome || item.name || id };
    }
}

function normalizePlantCategory(cat) {
    if (!cat) return "Popular";
    return String(cat).toLowerCase().includes("dif") ? "Difícil de Adquirir" : "Popular";
}

function extractPlantLevel(peculiaridades = "") {
    const m = String(peculiaridades).match(/Nível de Herbologia:\s*Nível\s*(\d+)/i);
    return m ? m[1] : "1";
}

function extractPlantCd(peculiaridades = "") {
    const m = String(peculiaridades).match(/CD\s*(\d+)/i);
    return m ? Number(m[1]) : 12;
}

// Auxiliares de cache local no navegador para aceleração máxima
function getLocalCacheIndex(collectionName) {
    try {
        const raw = localStorage.getItem(`ww_idx_${collectionName}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function setLocalCacheIndex(collectionName, list) {
    try {
        localStorage.setItem(`ww_idx_${collectionName}`, JSON.stringify(list));
    } catch {
        // quota excedida ou inacessível
    }
}

function getLocalCacheItem(collectionName, id) {
    try {
        const raw = sessionStorage.getItem(`ww_doc_${collectionName}_${id}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function setLocalCacheItem(collectionName, id, data) {
    try {
        sessionStorage.setItem(`ww_doc_${collectionName}_${id}`, JSON.stringify(data));
    } catch {
        // quota excedida ou inacessível
    }
}

/**
 * 1. CARREGAMENTO RÁPIDO DO ÍNDICE DA COLEÇÃO NO FIRESTORE (Tier 1)
 */
async function fetchCatalogIndex(collectionName, forceRefresh = false) {
    // 1.1 Cache em memória ativa (0ms)
    if (!forceRefresh && indexMemoryCache.has(collectionName)) {
        return indexMemoryCache.get(collectionName);
    }

    // 1.2 Cache local persistente para inicialização imediata
    if (!forceRefresh) {
        const localCached = getLocalCacheIndex(collectionName);
        if (localCached && localCached.length > 0) {
            indexMemoryCache.set(collectionName, localCached);
            // Atualiza em background sem travar o usuário
            fetchCatalogIndex(collectionName, true).catch(() => {});
            return localCached;
        }
    }

    // 1.3 Se ainda não temos dados e não é refresh forçado, usa o fallback local embutido
    if (!forceRefresh && FALLBACK_INDEXES && Array.isArray(FALLBACK_INDEXES[collectionName]) && FALLBACK_INDEXES[collectionName].length > 0) {
        const defaultList = FALLBACK_INDEXES[collectionName].map(item => buildSummaryEntry(collectionName, item));
        indexMemoryCache.set(collectionName, defaultList);
        setLocalCacheIndex(collectionName, defaultList);
        // Sincroniza em background
        fetchCatalogIndex(collectionName, true).catch(() => {});
        return defaultList;
    }

    const summaryMap = new Map();

    try {
        // 1.4 Consulta o documento de índice leve no Firestore (_indexes/{collectionName})
        const remoteIdx = await firestoreGetDoc("_indexes", collectionName);
        if (remoteIdx && Array.isArray(remoteIdx.items)) {
            const remoteDeleted = new Set(remoteIdx.deletedIds || []);
            for (const entry of remoteIdx.items) {
                const summary = buildSummaryEntry(collectionName, entry);
                if (!remoteDeleted.has(summary.id)) {
                    summaryMap.set(summary.id, summary);
                }
            }
        } else {
            // 1.5 Fallback remoto: se o documento _indexes não existir, lista os documentos da coleção diretamente do Firestore
            const docs = await firestoreListCollection(collectionName);
            for (const doc of docs) {
                const summary = buildSummaryEntry(collectionName, doc);
                summaryMap.set(summary.id, summary);
                itemMemoryCache.set(`${collectionName}:${summary.id}`, doc);
            }
            if (summaryMap.size > 0) {
                await syncCollectionIndex(collectionName, Array.from(summaryMap.values())).catch(() => {});
            }
        }
    } catch (err) {
        console.warn(`[Catalog] Falha ao consultar índice remoto de ${collectionName}:`, err);
    }

    // Se o Firestore respondeu com itens, salva no cache e atualiza a memória
    if (summaryMap.size > 0) {
        const resultList = Array.from(summaryMap.values());
        indexMemoryCache.set(collectionName, resultList);
        setLocalCacheIndex(collectionName, resultList);
        return resultList;
    }

    // Fallback de emergência: se a rede falhou e nada foi baixado, usa o fallback local
    if (FALLBACK_INDEXES && Array.isArray(FALLBACK_INDEXES[collectionName])) {
        const defaultList = FALLBACK_INDEXES[collectionName].map(item => buildSummaryEntry(collectionName, item));
        indexMemoryCache.set(collectionName, defaultList);
        return defaultList;
    }

    return [];
}

/**
 * 2. CARREGAMENTO INDIVIDUAL DE ITEM SOB DEMANDA NO FIRESTORE (Tier 2)
 */
async function fetchItemById(collectionName, id) {
    if (!id) return null;
    const cacheKey = `${collectionName}:${id}`;

    // 1. Cache em memória para acesso repetido instantâneo (0ms)
    if (itemMemoryCache.has(cacheKey)) {
        return itemMemoryCache.get(cacheKey);
    }

    // 2. Cache em sessionStorage
    const sessionCached = getLocalCacheItem(collectionName, id);
    if (sessionCached) {
        itemMemoryCache.set(cacheKey, sessionCached);
        return sessionCached;
    }

    // 3. Busca documento individual diretamente no Cloud Firestore
    const remoteDoc = await firestoreGetDoc(collectionName, id);
    if (remoteDoc) {
        const data = { id, ...remoteDoc };
        itemMemoryCache.set(cacheKey, data);
        setLocalCacheItem(collectionName, id, data);
        return data;
    }

    return null;
}
async function fetchItemsByIds(collectionName, ids = []) {
    const promises = ids.map(id => fetchItemById(collectionName, id));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
}

async function syncCollectionIndex(collectionName, currentSummaryList, deletedIds = []) {
    await firestoreSetDoc("_indexes", collectionName, {
        updatedAt: new Date().toISOString(),
        count: currentSummaryList.length,
        items: currentSummaryList,
        deletedIds
    });
}

/**
 * 3. SALVAR ITEM INDIVIDUAL NO FIRESTORE
 */
async function saveRecord(collectionName, dataObject, prefix = "registro", options = { downloadBackup: false }) {
    const id = buildItemId(collectionName, dataObject, prefix);
    const fullRecord = {
        ...dataObject,
        id,
        updatedAt: new Date().toISOString()
    };

    const cacheKey = `${collectionName}:${id}`;
    itemMemoryCache.set(cacheKey, fullRecord);
    setLocalCacheItem(collectionName, id, fullRecord);

    const currentIndex = await fetchCatalogIndex(collectionName);
    const newSummary = buildSummaryEntry(collectionName, fullRecord);
    const existingIdx = currentIndex.findIndex(item => item.id === id);
    if (existingIdx >= 0) {
        currentIndex[existingIdx] = newSummary;
    } else {
        currentIndex.push(newSummary);
    }
    indexMemoryCache.set(collectionName, currentIndex);
    setLocalCacheIndex(collectionName, currentIndex);

    const savedToCloud = await firestoreSetDoc(collectionName, id, fullRecord);
    if (savedToCloud) {
        await syncCollectionIndex(collectionName, currentIndex);
    }

    if (options.downloadBackup) {
        downloadJsonFile(fullRecord, `${id}.json`);
    }

    return { id, record: fullRecord, savedToCloud };
}

/**
 * 4. SALVAR LOTE DE ITENS EM MASSA NO FIRESTORE
 */
async function saveBulkRecords(collectionName, dataArray, prefix = "item", onProgress = null) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error("A lista fornecida para importação em massa está vazia ou é inválida.");
    }

    const currentIndex = await fetchCatalogIndex(collectionName);
    const indexMap = new Map(currentIndex.map(item => [item.id, item]));
    const normalizedRecords = [];

    for (const rawItem of dataArray) {
        const id = buildItemId(collectionName, rawItem, prefix);
        const fullRecord = {
            ...rawItem,
            id,
            updatedAt: new Date().toISOString()
        };
        normalizedRecords.push(fullRecord);
        itemMemoryCache.set(`${collectionName}:${id}`, fullRecord);
        setLocalCacheItem(collectionName, id, fullRecord);
        indexMap.set(id, buildSummaryEntry(collectionName, fullRecord));
    }

    const updatedIndexList = Array.from(indexMap.values());
    indexMemoryCache.set(collectionName, updatedIndexList);
    setLocalCacheIndex(collectionName, updatedIndexList);

    let savedToCloud = true;
    const CHUNK_SIZE = 20;
    for (let i = 0; i < normalizedRecords.length; i += CHUNK_SIZE) {
        const chunk = normalizedRecords.slice(i, i + CHUNK_SIZE);
        const ok = await firestoreBatchWrite(collectionName, chunk);
        if (!ok) savedToCloud = false;
        if (onProgress) {
            onProgress(Math.min(i + chunk.length, normalizedRecords.length), normalizedRecords.length);
        }
    }

    if (savedToCloud) {
        await syncCollectionIndex(collectionName, updatedIndexList);
    }

    return {
        count: normalizedRecords.length,
        savedToCloud
    };
}

/**
 * 5. REMOVER ITEM INDIVIDUAL DO FIRESTORE
 */
async function deleteRecord(collectionName, id) {
    if (!id) return false;
    itemMemoryCache.delete(`${collectionName}:${id}`);
    try {
        sessionStorage.removeItem(`ww_doc_${collectionName}_${id}`);
    } catch {
        // Ignora
    }

    const currentIndex = await fetchCatalogIndex(collectionName);
    const filteredIndex = currentIndex.filter(item => item.id !== id);
    indexMemoryCache.set(collectionName, filteredIndex);
    setLocalCacheIndex(collectionName, filteredIndex);

    await firestoreDeleteDoc(collectionName, id);
    await syncCollectionIndex(collectionName, filteredIndex);
    return true;
}
function downloadJsonFile(dataObject, filename = "exportacao_ministerial.json") {
    const jsonString = JSON.stringify(dataObject, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

    /**
 * CONTROLADOR DE NAVEGAÇÃO ENTRE ABAS (ARQUIVOS & REGISTROS)
 * Garante sincronia total entre as classes .active e .hidden em todos os 8 painéis.
 */
class TabController {
    constructor() {
        this.init();
    }

    init() {
        // Delegação de eventos global para suportar botões na barra superior e botões internos ("+ Novo Registro" / "← Voltar ao Arquivo")
        document.addEventListener("click", e => {
            const btn = e.target.closest("[data-target]");
            if (!btn) return;
            const targetId = btn.getAttribute("data-target");
            if (targetId && targetId.startsWith("tab-")) {
                e.preventDefault();
                this.openTab(targetId);
            }
        });
    }

    openTab(tabId) {
        const targetEl = document.getElementById(tabId);
        if (!targetEl) return;

        // Oculta todas as abas de conteúdo dinamicamente
        const allTabs = document.querySelectorAll(".tab-content");
        allTabs.forEach(tab => {
            tab.classList.remove("active");
            tab.classList.add("hidden");
        });

        // Atualiza todos os botões de navegação
        document.querySelectorAll("[data-target]").forEach(btn => {
            const isTarget = btn.getAttribute("data-target") === tabId;
            btn.classList.toggle("active", isTarget);
            btn.setAttribute("aria-pressed", isTarget ? "true" : "false");
        });

        // Exibe a aba selecionada com prioridade
        targetEl.classList.remove("hidden");
        targetEl.classList.add("active");

        // Rola suavemente ao topo caso necessário
        window.scrollTo({ top: 0, behavior: "smooth" });

        document.dispatchEvent(new CustomEvent("tab-opened", { detail: { tabId, targetId: tabId } }));
    }
}

    /**
 * CONTROLADOR DO CATALOGO DE ANIMAIS / CRIATURAS MAGICAS (D.R.C.C.M.)
 * Carregamento Individual Sob Demanda e Delegacao de Eventos de Alta Performance
 */
// [bundled-import]
// [bundled-import]
class CreatureController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activeCreatureId = null;
        this.editingId = null;
        this.currentFotoBase64 = "";
        this.loaded = false;
        this.searchTimer = null;

        this.form = document.getElementById("form-creature");
        this.listContainer = document.getElementById("creature-list");
        this.viewerContainer = document.getElementById("creature-viewer-content");

        this.initEvents();
    }

    initEvents() {
        const fotoInput = document.getElementById("reg-foto");
        if (fotoInput) {
            fotoInput.addEventListener("change", async e => {
                const file = e.target.files[0];
                if (file) {
                    this.currentFotoBase64 = await fileToBase64(file);
                    const preview = document.getElementById("preview-foto");
                    if (preview) {
                        preview.src = this.currentFotoBase64;
                        preview.classList.remove("hidden");
                    }
                    const label = document.getElementById("label-foto");
                    if (label) label.textContent = "Fotografia Anexada";
                }
            });
        }

        const btnAddInjury = document.getElementById("btn-add-reg-injury");
        if (btnAddInjury) {
            btnAddInjury.addEventListener("click", () => this.addCustomInjuryRow());
        }

        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.saveCreature();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-creatures");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const searchEl = document.getElementById("search-creature");
        if (searchEl) {
            searchEl.addEventListener("input", () => {
                clearTimeout(this.searchTimer);
                this.searchTimer = setTimeout(() => this.applyFilters(), 80);
            });
        }

        const selectIds = [
            "sort-creature",
            "filter-class",
            "filter-licenca",
            "filter-locomocao",
            "filter-porte",
            "filter-interacao",
            "filter-tipo"
        ];
        selectIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("change", () => this.applyFilters());
        });

        const btnReset = document.getElementById("btn-reset-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportSelected = document.getElementById("btn-export-selected-creatures");
        if (btnExportSelected) {
            btnExportSelected.addEventListener("click", () => this.exportSelectedCreatures());
        }

        // Delegacao unica de eventos na lista lateral (evita centenas de listeners)
        if (this.listContainer) {
            this.listContainer.addEventListener("click", e => {
                const checkbox = e.target.closest(".record-check");
                if (checkbox) {
                    e.stopPropagation();
                    const id = checkbox.dataset.id;
                    if (checkbox.checked) {
                        this.selectedIds.add(id);
                    } else {
                        this.selectedIds.delete(id);
                    }
                    this.updateExportButtonLabel();
                    return;
                }

                const li = e.target.closest(".record-list-item");
                if (li && li.dataset.id) {
                    this.selectAndLoadCreature(li.dataset.id);
                }
            });
        }
    }

    async ensureLoaded() {
        if (!this.loaded) {
            await this.loadCatalog();
        }
    }

    addCustomInjuryRow(data = { name: "", curr: 0, max: 1 }) {
        const container = document.getElementById("reg-custom-injuries-container");
        if (!container) return;
        const row = document.createElement("div");
        row.className = "injury-row custom-injury mt-10";
        row.innerHTML = `
            <input type="text" class="ink-input injury-name-input" placeholder="Condicao (ex: Asa Quebrada)" value="${escapeHtml(data.name)}" style="flex: 1;">
            <input type="number" class="ink-input short-input curr" value="${Number(data.curr || 0)}" min="0"> /
            <input type="number" class="ink-input short-input max" value="${Number(data.max || 1)}" min="1">
            <button type="button" class="btn-danger" onclick="this.parentElement.remove()">X</button>
        `;
        container.appendChild(row);
    }

    async saveCreature() {
        const customInjuries = [];
        document.querySelectorAll("#reg-custom-injuries-container .custom-injury").forEach(row => {
            const name = row.querySelector(".injury-name-input")?.value?.trim();
            if (name) {
                customInjuries.push({
                    name,
                    curr: parseInt(row.querySelector(".curr")?.value, 10) || 0,
                    max: parseInt(row.querySelector(".max")?.value, 10) || 1
                });
            }
        });

        const creatureData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            nome: document.getElementById("reg-nome").value.trim(),
            classificacao: document.getElementById("reg-classificacao").value,
            licenca: document.getElementById("reg-licenca").value,
            porte: document.getElementById("reg-porte")?.value || "Médio",
            tamanho: document.getElementById("reg-tamanho").value.trim(),
            peso: document.getElementById("reg-peso").value.trim(),
            origem: document.getElementById("reg-origem").value,
            locomocao: document.getElementById("reg-locomocao").value,
            velocidade: document.getElementById("reg-velocidade")?.value?.trim() || "3.0m por ação",
            interacao: document.getElementById("reg-interacao").value,
            tipo: document.getElementById("reg-tipo").value,
            descricao: document.getElementById("reg-descricao").value.trim(),
            fotoBase64: this.currentFotoBase64,
            fotoUrl: this.currentFotoBase64,
            atributos: {
                corpo: parseInt(document.getElementById("attr-corpo").value, 10) || 0,
                destreza: parseInt(document.getElementById("attr-destreza").value, 10) || 0,
                vitalidade: parseInt(document.getElementById("attr-vitalidade").value, 10) || 0,
                instinto: parseInt(document.getElementById("attr-instinto").value, 10) || 0,
                carisma: parseInt(document.getElementById("attr-carisma").value, 10) || 0,
                inteligencia: parseInt(document.getElementById("attr-inteligencia").value, 10) || 0,
                sabedoria: parseInt(document.getElementById("attr-sabedoria").value, 10) || 0
            },
            habilidades: {
                dano: {
                    nome: document.getElementById("hab-dano-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-dano-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-dano-desc")?.value?.trim() || ""
                },
                reacao: {
                    nome: document.getElementById("hab-reacao-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-reacao-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-reacao-desc")?.value?.trim() || ""
                },
                ambiente: {
                    nome: document.getElementById("hab-ambiente-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-ambiente-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-ambiente-desc")?.value?.trim() || ""
                },
                extra: {
                    nome: document.getElementById("hab-extra-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-extra-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-extra-desc")?.value?.trim() || ""
                }
            },
            injuries: {
                leve: {
                    curr: parseInt(document.getElementById("reg-inj-leve-curr").value, 10) || 0,
                    max: parseInt(document.getElementById("reg-inj-leve-max").value, 10) || 3
                },
                media: {
                    curr: parseInt(document.getElementById("reg-inj-media-curr").value, 10) || 0,
                    max: parseInt(document.getElementById("reg-inj-media-max").value, 10) || 2
                },
                pesada: {
                    curr: parseInt(document.getElementById("reg-inj-pesada-curr").value, 10) || 0,
                    max: parseInt(document.getElementById("reg-inj-pesada-max").value, 10) || 1
                },
                custom: customInjuries
            }
        };

        const result = await saveRecord(COLLECTIONS.CREATURES, creatureData, "criatura");

        this.form.reset();
        this.editingId = null;
        this.currentFotoBase64 = "";
        const preview = document.getElementById("preview-foto");
        if (preview) {
            preview.src = "";
            preview.classList.add("hidden");
        }
        const label = document.getElementById("label-foto");
        if (label) label.textContent = "Anexar Retrato ou Ilustracao";
        const injContainer = document.getElementById("reg-custom-injuries-container");
        if (injContainer) injContainer.innerHTML = "";

        await this.loadCatalog(true);
        alert(`Criatura "${creatureData.nome}" catalogada com sucesso no Arquivo Ministerial.`);
        document.querySelector('[data-target="tab-arquivo-criaturas"]')?.click();
        await this.selectAndLoadCreature(result.id);
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-creature-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-creature-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON valido ou selecione um arquivo .json para importar criaturas em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.CREATURES, list, "criatura");
            document.getElementById("bulk-creature-input").value = "";
            document.getElementById("bulk-creature-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} criatura(s) importada(s) com sucesso.`);
        } catch (err) {
            alert("Erro ao processar JSON de criaturas: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.indexData = await fetchCatalogIndex(COLLECTIONS.CREATURES, forceRefresh);
        this.loaded = true;
        this.updateBadgeCount();
        this.applyFilters();

        if (!this.activeCreatureId && this.filteredIndex.length > 0) {
            this.selectAndLoadCreature(this.filteredIndex[0].id);
        }
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-creatures");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        const ids = [
            "search-creature",
            "filter-class",
            "filter-licenca",
            "filter-locomocao",
            "filter-porte",
            "filter-interacao",
            "filter-tipo"
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-creature");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    applyFilters() {
        const search = (document.getElementById("search-creature")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-creature")?.value || "alfabetica";
        const fClass = document.getElementById("filter-class")?.value || "";
        const fLicenca = document.getElementById("filter-licenca")?.value || "";
        const fLocomocao = document.getElementById("filter-locomocao")?.value || "";
        const fPorte = document.getElementById("filter-porte")?.value || "";
        const fInteracao = document.getElementById("filter-interacao")?.value || "";
        const fTipo = document.getElementById("filter-tipo")?.value || "";

        this.filteredIndex = this.indexData.filter(c => {
            const matchName = !search || (c.nome || "").toLowerCase().includes(search);
            const matchClass = !fClass || c.classificacao === fClass;
            const matchLicenca = !fLicenca || c.licenca === fLicenca;
            const matchLocomocao = !fLocomocao || c.locomocao === fLocomocao;
            const matchPorte = !fPorte || c.porte === fPorte;
            const matchInteracao = !fInteracao || c.interacao === fInteracao;
            const matchTipo = !fTipo || c.tipo === fTipo;

            return matchName && matchClass && matchLicenca && matchLocomocao && matchPorte && matchInteracao && matchTipo;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sortMode === "perigo-asc") return (a.classificacao || "").length - (b.classificacao || "").length;
            if (sortMode === "perigo-desc") return (b.classificacao || "").length - (a.classificacao || "").length;
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;

        const countEl = document.getElementById("creature-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} especies`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhuma criatura encontrada com os filtros atuais.</li>`;
            this.updateExportButtonLabel();
            return;
        }

        this.listContainer.innerHTML = this.filteredIndex.map(c => {
            const isChecked = this.selectedIds.has(c.id);
            const isActive = this.activeCreatureId === c.id;
            return `
                <li class="record-list-item ${isActive ? "active-record" : ""}" data-id="${escapeHtml(c.id)}">
                    <div class="list-item-row">
                        <input type="checkbox" class="record-check" data-id="${escapeHtml(c.id)}" ${isChecked ? "checked" : ""} title="Selecionar para exportacao">
                        <div class="list-item-main">
                            <strong>${escapeHtml(c.nome)}</strong>
                            <small>${escapeHtml(c.tipo)} | ${escapeHtml(c.locomocao)} | ${escapeHtml(c.porte || "Medio")}</small>
                        </div>
                        <span class="badge-danger-small">${escapeHtml(c.classificacao)}</span>
                    </div>
                </li>
            `;
        }).join("");

        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-selected-creatures");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `Exportar Selecionados (${this.selectedIds.size})`
                : `Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    async selectAndLoadCreature(id) {
        this.activeCreatureId = id;
        this.listContainer?.querySelectorAll(".record-list-item").forEach(li => {
            li.classList.toggle("active-record", li.dataset.id === id);
        });

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");

        const c = await fetchItemById(COLLECTIONS.CREATURES, id);
        if (!c) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Nao foi possivel carregar o registro individual desta criatura.</p>`;
            return;
        }

        this.renderCreatureSheet(c);
    }

    formatSigned(val) {
        const n = Number(val || 0);
        return n > 0 ? `+${n}` : `${n}`;
    }

    renderCreatureSheet(c) {
        const photoSrc = c.fotoBase64 || c.fotoUrl || "";
        const imgHtml = photoSrc
            ? `<div class="creature-portrait-frame">
                 <img src="${escapeHtml(photoSrc)}" class="creature-sheet-photo" alt="${escapeHtml(c.nome)}" decoding="async" loading="lazy" onerror="this.parentElement.style.display='none'">
               </div>`
            : "";

        const attrs = c.atributos || {};
        const attrLabels = [
            { key: "corpo", label: "Corpo" },
            { key: "destreza", label: "Destreza" },
            { key: "vitalidade", label: "Vitalidade" },
            { key: "instinto", label: "Instinto" },
            { key: "carisma", label: "Carisma" },
            { key: "inteligencia", label: "Inteligencia" },
            { key: "sabedoria", label: "Sabedoria" }
        ];

        const attrsHtml = attrLabels.map(a => `
            <div class="stat-pill">
                <span class="stat-pill-label">${a.label}</span>
                <strong class="stat-pill-value">${this.formatSigned(attrs[a.key])}</strong>
            </div>
        `).join("");

        const hab = c.habilidades || {};
        const habCategories = [
            { key: "dano", badge: "DANO", colorClass: "hab-dano" },
            { key: "reacao", badge: "REACAO", colorClass: "hab-reacao" },
            { key: "ambiente", badge: "AMBIENTE", colorClass: "hab-ambiente" },
            { key: "extra", badge: "EXTRA", colorClass: "hab-extra" }
        ];

        const hasAbilities = habCategories.some(hc => hab[hc.key]?.nome || hab[hc.key]?.desc);
        const abilitiesHtml = hasAbilities
            ? `
            <div class="sheet-section mt-15">
                <h4 class="section-subtitle">Habilidades de Combate e Instinto</h4>
                <div class="abilities-grid">
                    ${habCategories.map(hc => {
                        const item = hab[hc.key];
                        if (!item || (!item.nome && !item.desc)) return "";
                        return `
                            <div class="ability-card ${hc.colorClass}">
                                <div class="ability-card-header">
                                    <span class="ability-type-tag">${hc.badge}</span>
                                    <strong class="ability-name">${escapeHtml(item.nome || "Habilidade")}</strong>
                                    ${item.rolagem ? `<code class="ability-roll">${escapeHtml(item.rolagem)}</code>` : ""}
                                </div>
                                <p class="ability-desc">${escapeHtml(item.desc || "")}</p>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>`
            : "";

        let customInjHtml = "";
        if (c.injuries?.custom && c.injuries.custom.length > 0) {
            customInjHtml = `<div class="mt-10"><strong>Condicoes Especificas:</strong><ul style="margin-left: 20px;">` +
                c.injuries.custom.map(i => `<li>${escapeHtml(i.name)}: [${i.curr} / ${i.max}]</li>`).join("") +
                `</ul></div>`;
        }

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">D.R.C.C.M. | REGISTRO OFICIAL DE ESPECIE MAGICA</span>
                        <h3 class="sheet-main-title">${escapeHtml(c.nome)}</h3>
                    </div>
                    <div class="danger-stamp" title="Classificacao do Ministerio da Magia">
                        <span>M.M.</span>
                        <strong>${escapeHtml(c.classificacao)}</strong>
                    </div>
                </div>

                <div class="sheet-hero-grid">
                    ${imgHtml}
                    <div class="sheet-metadata-box">
                        <div class="meta-item"><strong>Licenca Exigida:</strong> <span class="license-tag">${escapeHtml(c.licenca)}</span></div>
                        <div class="meta-item"><strong>Tipo de Criatura:</strong> ${escapeHtml(c.tipo)} (${escapeHtml(c.interacao)})</div>
                        <div class="meta-item"><strong>Origem:</strong> ${escapeHtml(c.origem || "Natural")}</div>
                        <div class="meta-item"><strong>Porte / Categoria:</strong> ${escapeHtml(c.porte || "Medio")}</div>
                        <div class="meta-item"><strong>Dimensoes Adulto:</strong> ${escapeHtml(c.tamanho || "N/A")} | ${escapeHtml(c.peso || "N/A")}</div>
                        <div class="meta-item"><strong>Locomocao:</strong> ${escapeHtml(c.locomocao)}</div>
                        <div class="meta-item"><strong>Velocidade de Acao:</strong> <code>${escapeHtml(c.velocidade || "3.0m por acao")}</code></div>
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Atributos Fisicos e Animais (Escala -5 a +10)</h4>
                    <div class="stats-pills-grid">
                        ${attrsHtml}
                    </div>
                </div>

                ${abilitiesHtml}

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Prontuario Medico-Veterinario (Limites de Injuria)</h4>
                    <div class="injury-badges-row">
                        <span class="inj-badge inj-light">Leve: [ ${c.injuries?.leve?.curr || 0} / ${c.injuries?.leve?.max || 3} ]</span>
                        <span class="inj-badge inj-medium">Media: [ ${c.injuries?.media?.curr || 0} / ${c.injuries?.media?.max || 2} ]</span>
                        <span class="inj-badge inj-heavy">Pesada: [ ${c.injuries?.pesada?.curr || 0} / ${c.injuries?.pesada?.max || 1} ]</span>
                    </div>
                    ${customInjHtml}
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Descricao Fisica, Habitat e Temperamento</h4>
                    <p class="sheet-prose">${escapeHtml(c.descricao || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-creature">
                        Exportar para Ficha de Jogador (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-creature">
                        Editar Registro
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-creature">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-creature")?.addEventListener("click", () => {
            exportJson(c, `criatura_${c.nome}`);
        });

        this.viewerContainer.querySelector("#btn-edit-creature")?.addEventListener("click", () => {
            this.populateFormForEdit(c);
        });

        this.viewerContainer.querySelector("#btn-delete-creature")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover "${c.nome}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.CREATURES, c.id);
                this.activeCreatureId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Registro removido. Selecione outra criatura na lista ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(c) {
        this.editingId = c.id;
        document.getElementById("reg-nome").value = c.nome || "";
        document.getElementById("reg-classificacao").value = c.classificacao || "XXX";
        document.getElementById("reg-licenca").value = c.licenca || "Comum";
        if (document.getElementById("reg-porte")) {
            document.getElementById("reg-porte").value = c.porte || "Médio";
        }
        document.getElementById("reg-tamanho").value = c.tamanho || "";
        document.getElementById("reg-peso").value = c.peso || "";
        document.getElementById("reg-origem").value = c.origem || "Natural";
        document.getElementById("reg-locomocao").value = c.locomocao || "Terrestres";
        if (document.getElementById("reg-velocidade")) {
            document.getElementById("reg-velocidade").value = c.velocidade || "3.0m por ação";
        }
        document.getElementById("reg-interacao").value = c.interacao || "Pacífico";
        document.getElementById("reg-tipo").value = c.tipo || "Neutro";
        document.getElementById("reg-descricao").value = c.descricao || "";

        const attrs = c.atributos || {};
        document.getElementById("attr-corpo").value = attrs.corpo ?? 0;
        document.getElementById("attr-destreza").value = attrs.destreza ?? 0;
        document.getElementById("attr-vitalidade").value = attrs.vitalidade ?? 0;
        document.getElementById("attr-instinto").value = attrs.instinto ?? 0;
        document.getElementById("attr-carisma").value = attrs.carisma ?? 0;
        document.getElementById("attr-inteligencia").value = attrs.inteligencia ?? 0;
        document.getElementById("attr-sabedoria").value = attrs.sabedoria ?? 0;

        const hab = c.habilidades || {};
        ["dano", "reacao", "ambiente", "extra"].forEach(k => {
            const h = hab[k] || {};
            const nEl = document.getElementById(`hab-${k}-nome`);
            const rEl = document.getElementById(`hab-${k}-rolagem`);
            const dEl = document.getElementById(`hab-${k}-desc`);
            if (nEl) nEl.value = h.nome || "";
            if (rEl) rEl.value = h.rolagem || "";
            if (dEl) dEl.value = h.desc || "";
        });

        document.getElementById("reg-inj-leve-curr").value = c.injuries?.leve?.curr ?? 0;
        document.getElementById("reg-inj-leve-max").value = c.injuries?.leve?.max ?? 3;
        document.getElementById("reg-inj-media-curr").value = c.injuries?.media?.curr ?? 0;
        document.getElementById("reg-inj-media-max").value = c.injuries?.media?.max ?? 2;
        document.getElementById("reg-inj-pesada-curr").value = c.injuries?.pesada?.curr ?? 0;
        document.getElementById("reg-inj-pesada-max").value = c.injuries?.pesada?.max ?? 1;

        const injContainer = document.getElementById("reg-custom-injuries-container");
        if (injContainer) {
            injContainer.innerHTML = "";
            (c.injuries?.custom || []).forEach(inj => this.addCustomInjuryRow(inj));
        }

        this.currentFotoBase64 = c.fotoBase64 || c.fotoUrl || "";
        const preview = document.getElementById("preview-foto");
        if (preview && this.currentFotoBase64) {
            preview.src = this.currentFotoBase64;
            preview.classList.remove("hidden");
        }

        document.querySelector('[data-target="tab-registro-criaturas"]')?.click();
    }

    async exportSelectedCreatures() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhuma criatura disponivel para exportar.");
            return;
        }

        const fullItems = await fetchItemsByIds(COLLECTIONS.CREATURES, targetIds);
        downloadJsonFile(fullItems, `compendio_criaturas_${fullItems.length}`);
    }
}

    /**
 * CONTROLADOR DO GRANDE COMPÊNDIO DE FEITIÇARIA (C.E.F.)
 * Carregamento Individual Sob Demanda (Tier 1: Índice Leve | Tier 2: Documento Individual)
 * Otimizado com delegação de eventos, debounce de busca e carregamento sob demanda da aba.
 */
// [bundled-import]
// [bundled-import]
const CONJ_ATTR = {
    "Feitiço": "Prática (Sabedoria)",
    "Charme": "Prática (Sabedoria)",
    "Transfiguração": "Transfiguração (Carisma)",
    "Azaração": "DCAT (Sabedoria)",
    "Maldição Menor": "Dificuldade/Lógica (Inteligência)",
    "Maldição": "Dificuldade/Lógica (Inteligência)",
    "Cura": "Cura (Carisma)",
    "Contra-feitiço": "Prática (Sabedoria)",
    "Contrafeitiço": "Prática (Sabedoria)"
};
class SpellController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activeSpellId = null;
        this.editingId = null;
        this.loaded = false;
        this._searchTimer = null;

        this.form = document.getElementById("form-spell");
        this.listContainer = document.getElementById("spell-list");
        this.viewerContainer = document.getElementById("spell-viewer-content");

        this.initEvents();
    }

    initEvents() {
        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.saveSingleSpell();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-spells");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const searchEl = document.getElementById("search-spell");
        if (searchEl) {
            searchEl.addEventListener("input", () => {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.applyFilters(), 80);
            });
        }

        const filterIds = [
            "sort-spell",
            "filter-spell-lvl",
            "filter-spell-cat",
            "filter-spell-tipo",
            "filter-spell-cond"
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("change", () => this.applyFilters());
            }
        });

        const btnReset = document.getElementById("btn-reset-spell-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportList = document.getElementById("btn-export-spell-list");
        if (btnExportList) {
            btnExportList.addEventListener("click", () => this.exportSelectedSpells());
        }

        if (this.listContainer) {
            this.listContainer.addEventListener("click", e => {
                const checkbox = e.target.closest(".spell-export-check");
                if (checkbox) {
                    e.stopPropagation();
                    const id = checkbox.dataset.id;
                    if (checkbox.checked) {
                        this.selectedIds.add(id);
                    } else {
                        this.selectedIds.delete(id);
                    }
                    this.updateExportButtonLabel();
                    return;
                }

                const li = e.target.closest(".record-list-item");
                if (li && li.dataset.id) {
                    this.selectAndLoadSpell(li.dataset.id);
                }
            });
        }
    }

    async ensureLoaded() {
        if (!this.loaded) {
            this.loaded = true;
            await this.loadCatalog();
        }
    }

    async saveSingleSpell() {
        const pronuncia = document.getElementById("spell-pronunciation")?.value?.trim() || "";
        const spellData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            name: document.getElementById("spell-name").value.trim(),
            pronuncia,
            pronunciation: pronuncia,
            cat: document.getElementById("spell-cat").value,
            lvl: document.getElementById("spell-lvl").value,
            tipo: document.getElementById("spell-tipo").value,
            condicao: document.getElementById("spell-condicao")?.value?.trim() || "Nenhuma",
            desc: document.getElementById("spell-desc").value.trim()
        };

        const result = await saveRecord(COLLECTIONS.SPELLS, spellData, "feitico");
        this.form.reset();
        this.editingId = null;
        await this.loadCatalog(true);

        alert(`Feitiço "${spellData.name}" catalogado com sucesso no Grimório Ministerial.`);
        document.querySelector('[data-target="tab-arquivo-feiticos"]')?.click();
        await this.selectAndLoadSpell(result.id);
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-spell-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-spell-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON válido ou selecione um arquivo .json para importar feitiços em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.SPELLS, list, "feitico");
            document.getElementById("bulk-spell-input").value = "";
            document.getElementById("bulk-spell-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} feitiço(s) importado(s) com sucesso.`);
        } catch (err) {
            alert("Erro ao processar JSON de feitiços: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `<li class="empty-msg">Consultando índice do C.E.F...</li>`;

        this.indexData = await fetchCatalogIndex(COLLECTIONS.SPELLS, forceRefresh);
        this.loaded = true;
        this.updateBadgeCount();
        this.applyFilters();

        if (!this.activeSpellId && this.filteredIndex.length > 0) {
            this.selectAndLoadSpell(this.filteredIndex[0].id);
        }
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-spells");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        ["search-spell", "filter-spell-lvl", "filter-spell-cat", "filter-spell-tipo", "filter-spell-cond"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-spell");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    normalizeCategoryMatch(itemCat, filterCat) {
        if (!filterCat) return true;
        const a = String(itemCat || "").toLowerCase().replace(/[\s\-]/g, "");
        const b = String(filterCat || "").toLowerCase().replace(/[\s\-]/g, "");
        if ((b === "charme" || b === "feitico") && (a === "charme" || a === "feitico")) return true;
        return a === b;
    }

    normalizeTypeMatch(itemTipo, filterTipo) {
        if (!filterTipo) return true;
        const a = String(itemTipo || "").toLowerCase();
        const b = String(filterTipo || "").toLowerCase();
        if ((b === "ataque" || b === "dano") && (a === "ataque" || a === "dano")) return true;
        if ((b === "defesa" || b === "proteção" || b === "protecao") && (a === "defesa" || a === "proteção" || a === "protecao")) return true;
        return a === b;
    }

    applyFilters() {
        const search = (document.getElementById("search-spell")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-spell")?.value || "alfabetica";
        const fLvl = document.getElementById("filter-spell-lvl")?.value || "";
        const fCat = document.getElementById("filter-spell-cat")?.value || "";
        const fTipo = document.getElementById("filter-spell-tipo")?.value || "";
        const fCond = document.getElementById("filter-spell-cond")?.value || "";

        this.filteredIndex = this.indexData.filter(s => {
            const matchName = !search ||
                (s.name || "").toLowerCase().includes(search) ||
                (s.pronuncia || "").toLowerCase().includes(search) ||
                (s.condicao || "").toLowerCase().includes(search);
            const matchLvl = !fLvl || String(s.lvl) === String(fLvl);
            const matchCat = this.normalizeCategoryMatch(s.cat, fCat);
            const matchTipo = this.normalizeTypeMatch(s.tipo, fTipo);

            let matchCond = true;
            const hasCond = s.condicao && s.condicao !== "Nenhuma";
            if (fCond === "com_condicao") matchCond = hasCond;
            if (fCond === "sem_condicao") matchCond = !hasCond;

            return matchName && matchLvl && matchCat && matchTipo && matchCond;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.name || "").localeCompare(b.name || "", "pt-BR");
            if (sortMode === "nivel-asc") return parseInt(a.lvl || 1) - parseInt(b.lvl || 1);
            if (sortMode === "nivel-desc") return parseInt(b.lvl || 1) - parseInt(a.lvl || 1);
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;

        const countEl = document.getElementById("spell-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} encantamentos`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhum feitiço encontrado com os filtros atuais.</li>`;
            this.updateExportButtonLabel();
            return;
        }

        const htmlItems = new Array(this.filteredIndex.length);
        for (let i = 0; i < this.filteredIndex.length; i++) {
            const s = this.filteredIndex[i];
            const isActive = this.activeSpellId === s.id ? " active-record" : "";
            const isChecked = this.selectedIds.has(s.id) ? " checked" : "";
            const hasCondition = s.condicao && s.condicao !== "Nenhuma";
            const idSafe = escapeHtml(s.id);

            htmlItems[i] = `<li class="record-list-item${isActive}" data-id="${idSafe}">
                <div class="list-item-row">
                    <input type="checkbox" class="spell-export-check" data-id="${idSafe}"${isChecked} title="Incluir no pacote de exportação">
                    <div class="list-item-main">
                        <strong>${escapeHtml(s.name)}</strong>
                        <small>${escapeHtml(s.cat)} • ${escapeHtml(s.tipo)}${hasCondition ? ` • <span class="cond-inline">${escapeHtml(s.condicao)}</span>` : ""}</small>
                    </div>
                    <span class="badge-level-small">Nv. ${escapeHtml(s.lvl)}</span>
                </div>
            </li>`;
        }

        this.listContainer.innerHTML = htmlItems.join("");
        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-spell-list");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `Exportar Selecionados (${this.selectedIds.size})`
                : `Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    /**
     * Carregamento Individual Sob Demanda (Tier 2):
     * Busca o feitiço completo apenas quando clicado na lista.
     */
    async selectAndLoadSpell(id) {
        const prevActive = this.listContainer?.querySelector(".record-list-item.active-record");
        if (prevActive) prevActive.classList.remove("active-record");

        this.activeSpellId = id;
        const nextActive = this.listContainer?.querySelector(`.record-list-item[data-id="${CSS.escape(id)}"]`);
        if (nextActive) nextActive.classList.add("active-record");

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");
        this.viewerContainer.innerHTML = `
            <div class="loading-parchment">
                <p>Consultando pergaminho individual do feitiço...</p>
            </div>
        `;

        const s = await fetchItemById(COLLECTIONS.SPELLS, id);
        if (!s) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Não foi possível carregar o registro individual deste feitiço.</p>`;
            return;
        }

        this.renderSpellSheet(s);
    }

    renderSpellSheet(s) {
        const catStr = Array.isArray(s.cat) ? s.cat[0] : (s.cat || "Charme");
        const attrRef = CONJ_ATTR[catStr] || "Prática (Sabedoria)";
        const pronuncia = s.pronuncia || s.pronunciation || "Não catalogada";
        const condicao = s.condicao || "Nenhuma";
        const hasCond = condicao && condicao !== "Nenhuma";

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card animated-fade">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">C.E.F. • COMISSÃO EXPERIMENTAL DE FEITIÇOS</span>
                        <h3 class="sheet-main-title">${escapeHtml(s.name)}</h3>
                        <p class="pronunciation-subtitle">Pronúncia: <em>"${escapeHtml(pronuncia)}"</em></p>
                    </div>
                    <div class="level-stamp">
                        <span>NÍVEL</span>
                        <strong>${escapeHtml(s.lvl)}</strong>
                    </div>
                </div>

                <div class="sheet-metadata-box mt-15">
                    <div class="meta-item"><strong>Categoria Mágica:</strong> <span class="cat-badge">${escapeHtml(catStr)}</span></div>
                    <div class="meta-item"><strong>Natureza / Efeito:</strong> ${escapeHtml(s.tipo || "Utilitário")}</div>
                    <div class="meta-item"><strong>Perícia de Conjuração (W&W):</strong> <code>${escapeHtml(attrRef)}</code></div>
                    <div class="meta-item">
                        <strong>Condição Aplicada:</strong>
                        <span class="${hasCond ? "cond-badge-active" : "cond-badge-none"}">${escapeHtml(condicao)}</span>
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Efeito Mecânico, Regras e Descrição</h4>
                    <p class="sheet-prose">${escapeHtml(s.desc || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-spell">
                        Exportar para Grimório da Ficha (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-spell">
                        Editar Feitiço
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-spell">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-spell")?.addEventListener("click", () => {
            exportJson(s, `feitico_${s.name}`);
        });

        this.viewerContainer.querySelector("#btn-edit-spell")?.addEventListener("click", () => {
            this.populateFormForEdit(s);
        });

        this.viewerContainer.querySelector("#btn-delete-spell")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover o feitiço "${s.name}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.SPELLS, s.id);
                this.activeSpellId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Feitiço removido. Selecione outro encantamento ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(s) {
        this.editingId = s.id;
        document.getElementById("spell-name").value = s.name || "";
        document.getElementById("spell-pronunciation").value = s.pronuncia || s.pronunciation || "";
        document.getElementById("spell-cat").value = Array.isArray(s.cat) ? s.cat[0] : (s.cat || "Charme");
        document.getElementById("spell-lvl").value = String(s.lvl || "1");
        document.getElementById("spell-tipo").value = s.tipo || "Utilitário";
        if (document.getElementById("spell-condicao")) {
            document.getElementById("spell-condicao").value = s.condicao || "Nenhuma";
        }
        document.getElementById("spell-desc").value = s.desc || "";

        document.querySelector('[data-target="tab-registro-feiticos"]')?.click();
    }

    async exportSelectedSpells() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhum feitiço disponível para exportar.");
            return;
        }

        const fullSpells = await fetchItemsByIds(COLLECTIONS.SPELLS, targetIds);
        downloadJsonFile(fullSpells, `grimorio_feiticos_${fullSpells.length}`);
    }
}

    /**
 * CONTROLADOR DO COMPÊNDIO DE HERBOLOGIA E BOTÂNICA MÁGICA
 * Carregamento Individual Sob Demanda (Tier 1: Índice Leve | Tier 2: Documento Individual)
 * Otimizado com delegação de eventos, debounce de busca e carregamento sob demanda da aba.
 */
// [bundled-import]
// [bundled-import]
class PlantController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activePlantId = null;
        this.editingId = null;
        this.currentFotoBase64 = "";
        this.loaded = false;
        this._searchTimer = null;

        this.form = document.getElementById("form-plant");
        this.listContainer = document.getElementById("plant-list");
        this.viewerContainer = document.getElementById("plant-viewer-content");

        this.initEvents();
    }

    initEvents() {
        const fotoInput = document.getElementById("plant-foto");
        if (fotoInput) {
            fotoInput.addEventListener("change", async e => {
                const file = e.target.files[0];
                if (file) {
                    this.currentFotoBase64 = await fileToBase64(file);
                    const preview = document.getElementById("preview-plant-foto");
                    if (preview) {
                        preview.src = this.currentFotoBase64;
                        preview.classList.remove("hidden");
                    }
                    const label = document.getElementById("label-plant-foto");
                    if (label) label.textContent = "Ilustração Botânica Anexada";
                }
            });
        }

        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.savePlant();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-plants");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const searchEl = document.getElementById("search-plant");
        if (searchEl) {
            searchEl.addEventListener("input", () => {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.applyFilters(), 80);
            });
        }

        const filterIds = [
            "sort-plant",
            "filter-plant-cat",
            "filter-plant-lvl"
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("change", () => this.applyFilters());
            }
        });

        const btnReset = document.getElementById("btn-reset-plant-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportList = document.getElementById("btn-export-plant-list");
        if (btnExportList) {
            btnExportList.addEventListener("click", () => this.exportSelectedPlants());
        }

        if (this.listContainer) {
            this.listContainer.addEventListener("click", e => {
                const checkbox = e.target.closest(".record-check");
                if (checkbox) {
                    e.stopPropagation();
                    const id = checkbox.dataset.id;
                    if (checkbox.checked) {
                        this.selectedIds.add(id);
                    } else {
                        this.selectedIds.delete(id);
                    }
                    this.updateExportButtonLabel();
                    return;
                }

                const li = e.target.closest(".record-list-item");
                if (li && li.dataset.id) {
                    this.selectAndLoadPlant(li.dataset.id);
                }
            });
        }
    }

    async ensureLoaded() {
        if (!this.loaded) {
            this.loaded = true;
            await this.loadCatalog();
        }
    }

    async savePlant() {
        const nome = document.getElementById("plant-nome").value.trim();
        const categoria = document.getElementById("plant-categoria").value;
        const nivel = document.getElementById("plant-nivel").value;
        const manejo_cd = parseInt(document.getElementById("plant-cd").value) || 12;
        const manejo = document.getElementById("plant-manejo")?.value?.trim() || "";
        const efeito = document.getElementById("plant-efeito")?.value?.trim() || "";
        const uso_alquimico = document.getElementById("plant-uso")?.value?.trim() || "";
        const classificacao_ministerial = document.getElementById("plant-classificacao-min")?.value?.trim() || "";
        const descricao = document.getElementById("plant-descricao").value.trim();
        let peculiaridades = document.getElementById("plant-peculiaridades").value.trim();

        if (!peculiaridades) {
            const lines = [
                `• Nível de Herbologia: Nível ${nivel}.`,
                `• Manejo e Colheita: CD ${manejo_cd} (Herbologia). ${manejo}`,
                efeito ? `• Mecânica e Efeito: ${efeito}` : "",
                uso_alquimico ? `• Uso Alquímico: ${uso_alquimico}` : "",
                classificacao_ministerial ? `• Classificação Ministerial: ${classificacao_ministerial}` : ""
            ].filter(Boolean);
            peculiaridades = lines.join("\n");
        }

        const plantData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            nome,
            categoria,
            nivel,
            manejo_cd,
            manejo,
            efeito,
            uso_alquimico,
            classificacao_ministerial,
            descricao,
            peculiaridades,
            fotoBase64: this.currentFotoBase64
        };

        const result = await saveRecord(COLLECTIONS.PLANTS, plantData, "planta");
        this.form.reset();
        this.editingId = null;
        this.currentFotoBase64 = "";
        const preview = document.getElementById("preview-plant-foto");
        if (preview) {
            preview.src = "";
            preview.classList.add("hidden");
        }
        const label = document.getElementById("label-plant-foto");
        if (label) label.textContent = "Anexar Ilustração Botânica";

        await this.loadCatalog(true);
        alert(`Planta "${plantData.nome}" catalogada com sucesso no Herbário Ministerial.`);
        document.querySelector('[data-target="tab-arquivo-plantas"]')?.click();
        await this.selectAndLoadPlant(result.id);
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-plant-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-plant-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON válido ou selecione um arquivo .json para importar plantas em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.PLANTS, list, "planta");
            document.getElementById("bulk-plant-input").value = "";
            document.getElementById("bulk-plant-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} espécime(s) botânico(s) importado(s) com sucesso.`);
        } catch (err) {
            alert("Erro ao processar JSON de plantas: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `<li class="empty-msg">Consultando índice herbológico...</li>`;

        this.indexData = await fetchCatalogIndex(COLLECTIONS.PLANTS, forceRefresh);
        this.loaded = true;
        this.updateBadgeCount();
        this.applyFilters();

        if (!this.activePlantId && this.filteredIndex.length > 0) {
            this.selectAndLoadPlant(this.filteredIndex[0].id);
        }
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-plants");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        ["search-plant", "filter-plant-cat", "filter-plant-lvl"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-plant");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    applyFilters() {
        const search = (document.getElementById("search-plant")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-plant")?.value || "alfabetica";
        const fCat = document.getElementById("filter-plant-cat")?.value || "";
        const fLvl = document.getElementById("filter-plant-lvl")?.value || "";

        this.filteredIndex = this.indexData.filter(p => {
            const matchName = !search || (p.nome || "").toLowerCase().includes(search);
            const matchCat = !fCat || (p.categoria || "").toLowerCase() === fCat.toLowerCase();
            const matchLvl = !fLvl || String(p.nivel) === String(fLvl);
            return matchName && matchCat && matchLvl;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sortMode === "nivel-asc") return parseInt(a.nivel || 1) - parseInt(b.nivel || 1);
            if (sortMode === "nivel-desc") return parseInt(b.nivel || 1) - parseInt(a.nivel || 1);
            if (sortMode === "cd-asc") return (a.manejo_cd || 12) - (b.manejo_cd || 12);
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;

        const countEl = document.getElementById("plant-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} espécies botânicas`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhuma planta mágica encontrada com os filtros atuais.</li>`;
            this.updateExportButtonLabel();
            return;
        }

        const htmlItems = new Array(this.filteredIndex.length);
        for (let i = 0; i < this.filteredIndex.length; i++) {
            const p = this.filteredIndex[i];
            const isActive = this.activePlantId === p.id ? " active-record" : "";
            const isChecked = this.selectedIds.has(p.id) ? " checked" : "";
            const isRare = (p.categoria || "").toLowerCase().includes("dif");
            const idSafe = escapeHtml(p.id);

            htmlItems[i] = `<li class="record-list-item${isActive}" data-id="${idSafe}">
                <div class="list-item-row">
                    <input type="checkbox" class="record-check" data-id="${idSafe}"${isChecked} title="Selecionar para exportação">
                    <div class="list-item-main">
                        <strong>${escapeHtml(p.nome)}</strong>
                        <small>Nv. ${escapeHtml(p.nivel)} • CD ${escapeHtml(p.manejo_cd || 12)} • ${escapeHtml(p.categoria)}</small>
                    </div>
                    <span class="${isRare ? "badge-rare-small" : "badge-popular-small"}">${isRare ? "Rara" : "Popular"}</span>
                </div>
            </li>`;
        }

        this.listContainer.innerHTML = htmlItems.join("");
        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-plant-list");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `Exportar Selecionadas (${this.selectedIds.size})`
                : `Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    /**
     * Carregamento Individual Sob Demanda (Tier 2):
     * Busca os dados completos da planta apenas quando selecionada na lista.
     */
    async selectAndLoadPlant(id) {
        const prevActive = this.listContainer?.querySelector(".record-list-item.active-record");
        if (prevActive) prevActive.classList.remove("active-record");

        this.activePlantId = id;
        const nextActive = this.listContainer?.querySelector(`.record-list-item[data-id="${CSS.escape(id)}"]`);
        if (nextActive) nextActive.classList.add("active-record");

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");
        this.viewerContainer.innerHTML = `
            <div class="loading-parchment">
                <p>Consultando ficha botânica individual nas estufas...</p>
            </div>
        `;

        const p = await fetchItemById(COLLECTIONS.PLANTS, id);
        if (!p) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Não foi possível carregar o registro individual desta planta.</p>`;
            return;
        }

        this.renderPlantSheet(p);
    }

    renderPlantSheet(p) {
        const isRare = (p.categoria || "").toLowerCase().includes("dif");
        const imgHtml = p.fotoBase64
            ? `<div class="creature-portrait-frame">
                 <img src="${escapeHtml(p.fotoBase64)}" class="creature-sheet-photo" alt="${escapeHtml(p.nome)}" loading="lazy" decoding="async">
               </div>`
            : "";

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card animated-fade">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">COMPÊNDIO DE HERBOLOGIA E BOTÂNICA MÁGICA</span>
                        <h3 class="sheet-main-title">${escapeHtml(p.nome)}</h3>
                    </div>
                    <div class="level-stamp">
                        <span>HERB.</span>
                        <strong>Nv. ${escapeHtml(p.nivel || "1")}</strong>
                    </div>
                </div>

                <div class="sheet-hero-grid mt-15">
                    ${imgHtml}
                    <div class="sheet-metadata-box">
                        <div class="meta-item">
                            <strong>Disponibilidade e Mercado:</strong>
                            <span class="${isRare ? "cond-badge-active" : "cat-badge"}">${escapeHtml(p.categoria || "Popular")}</span>
                        </div>
                        <div class="meta-item"><strong>Nível de Herbologia:</strong> Nível ${escapeHtml(p.nivel || "1")}</div>
                        <div class="meta-item"><strong>Dificuldade de Manejo / Colheita:</strong> <code>CD ${escapeHtml(p.manejo_cd || 12)} (Herbologia / Inteligência)</code></div>
                        ${p.classificacao_ministerial ? `<div class="meta-item"><strong>Classificação Ministerial:</strong> ${escapeHtml(p.classificacao_ministerial)}</div>` : ""}
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Descrição Morfológica, Habitat e Propriedades</h4>
                    <p class="sheet-prose">${escapeHtml(p.descricao || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Peculiaridades de Cultivo, Colheita e Uso Alquímico</h4>
                    <div class="peculiaridades-box">
                        ${escapeHtml(p.peculiaridades || "").replace(/\n/g, "<br>")}
                    </div>
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-plant">
                        Exportar Espécime (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-plant">
                        Editar Planta
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-plant">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-plant")?.addEventListener("click", () => {
            exportJson(p, `planta_${p.nome}`);
        });

        this.viewerContainer.querySelector("#btn-edit-plant")?.addEventListener("click", () => {
            this.populateFormForEdit(p);
        });

        this.viewerContainer.querySelector("#btn-delete-plant")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover a planta "${p.nome}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.PLANTS, p.id);
                this.activePlantId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Espécime removido. Selecione outra planta na lista ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(p) {
        this.editingId = p.id;
        document.getElementById("plant-nome").value = p.nome || "";
        document.getElementById("plant-categoria").value = (p.categoria || "").toLowerCase().includes("dif") ? "Difícil de Adquirir" : "Popular";
        document.getElementById("plant-nivel").value = String(p.nivel || "1");
        document.getElementById("plant-cd").value = p.manejo_cd || 12;
        if (document.getElementById("plant-manejo")) document.getElementById("plant-manejo").value = p.manejo || "";
        if (document.getElementById("plant-efeito")) document.getElementById("plant-efeito").value = p.efeito || "";
        if (document.getElementById("plant-uso")) document.getElementById("plant-uso").value = p.uso_alquimico || "";
        if (document.getElementById("plant-classificacao-min")) document.getElementById("plant-classificacao-min").value = p.classificacao_ministerial || "";
        document.getElementById("plant-descricao").value = p.descricao || "";
        document.getElementById("plant-peculiaridades").value = p.peculiaridades || "";

        this.currentFotoBase64 = p.fotoBase64 || "";
        const preview = document.getElementById("preview-plant-foto");
        if (preview && this.currentFotoBase64) {
            preview.src = this.currentFotoBase64;
            preview.classList.remove("hidden");
        }

        document.querySelector('[data-target="tab-registro-plantas"]')?.click();
    }

    async exportSelectedPlants() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhuma planta disponível para exportar.");
            return;
        }

        const fullPlants = await fetchItemsByIds(COLLECTIONS.PLANTS, targetIds);
        downloadJsonFile(fullPlants, `herbario_plantas_${fullPlants.length}`);
    }
}

    /**
 * CONTROLADOR DO CATÁLOGO ALQUÍMICO DE POÇÕES
 * Carregamento Individual Sob Demanda (Tier 1: Índice Leve | Tier 2: Documento Individual)
 * Otimizado com delegação de eventos, debounce de busca e carregamento sob demanda da aba.
 */
// [bundled-import]
// [bundled-import]
class PotionController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activePotionId = null;
        this.editingId = null;
        this.loaded = false;
        this._searchTimer = null;

        this.form = document.getElementById("form-potion");
        this.listContainer = document.getElementById("potion-list");
        this.viewerContainer = document.getElementById("potion-viewer-content");

        this.initEvents();
    }

    initEvents() {
        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.savePotion();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-potions");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const searchEl = document.getElementById("search-potion");
        if (searchEl) {
            searchEl.addEventListener("input", () => {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.applyFilters(), 80);
            });
        }

        const filterIds = [
            "sort-potion",
            "filter-potion-lvl",
            "filter-potion-tipo",
            "filter-potion-admin"
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("change", () => this.applyFilters());
            }
        });

        const btnReset = document.getElementById("btn-reset-potion-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportList = document.getElementById("btn-export-potion-list");
        if (btnExportList) {
            btnExportList.addEventListener("click", () => this.exportSelectedPotions());
        }

        if (this.listContainer) {
            this.listContainer.addEventListener("click", e => {
                const checkbox = e.target.closest(".record-check");
                if (checkbox) {
                    e.stopPropagation();
                    const id = checkbox.dataset.id;
                    if (checkbox.checked) {
                        this.selectedIds.add(id);
                    } else {
                        this.selectedIds.delete(id);
                    }
                    this.updateExportButtonLabel();
                    return;
                }

                const li = e.target.closest(".record-list-item");
                if (li && li.dataset.id) {
                    this.selectAndLoadPotion(li.dataset.id);
                }
            });
        }
    }

    async ensureLoaded() {
        if (!this.loaded) {
            this.loaded = true;
            await this.loadCatalog();
        }
    }

    async savePotion() {
        const nome = document.getElementById("potion-nome").value.trim();
        const tipo = document.getElementById("potion-tipo").value.trim() || "Poção";
        const nivel = parseInt(document.getElementById("potion-nivel").value) || 1;
        const dificuldade_cd = parseInt(document.getElementById("potion-cd").value) || 14;
        const tempo_preparo = document.getElementById("potion-preparo").value.trim() || "1 hora";
        const duracao = document.getElementById("potion-duracao").value.trim() || "Instantâneo";
        const administracao = document.getElementById("potion-admin").value.trim() || "Ingestão";
        const efeito = document.getElementById("potion-efeito").value.trim();
        const ingredientes = document.getElementById("potion-ingredientes").value.trim();
        const descricao = document.getElementById("potion-descricao").value.trim();
        const wiki = document.getElementById("potion-wiki")?.value?.trim() || "";

        const potionData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            nome,
            tipo,
            nivel,
            "nível": nivel,
            efeito,
            ingredientes,
            descricao,
            "descrição": descricao,
            sistema: {
                tempo_preparo,
                duracao,
                dificuldade_cd,
                administracao
            },
            meta: {
                nome_original: nome,
                wiki
            }
        };

        const result = await saveRecord(COLLECTIONS.POTIONS, potionData, "pocao");
        this.form.reset();
        this.editingId = null;
        await this.loadCatalog(true);

        alert(`Poção "${potionData.nome}" catalogada com sucesso no Catálogo Alquímico.`);
        document.querySelector('[data-target="tab-arquivo-pocoes"]')?.click();
        await this.selectAndLoadPotion(result.id);
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-potion-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-potion-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON válido ou selecione um arquivo .json para importar poções em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.POTIONS, list, "pocao");
            document.getElementById("bulk-potion-input").value = "";
            document.getElementById("bulk-potion-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} composto(s) alquímico(s) importado(s) com sucesso.`);
        } catch (err) {
            alert("Erro ao processar JSON de poções: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `<li class="empty-msg">Consultando índice alquímico...</li>`;

        this.indexData = await fetchCatalogIndex(COLLECTIONS.POTIONS, forceRefresh);
        this.loaded = true;
        this.updateBadgeCount();
        this.applyFilters();

        if (!this.activePotionId && this.filteredIndex.length > 0) {
            this.selectAndLoadPotion(this.filteredIndex[0].id);
        }
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-potions");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        ["search-potion", "filter-potion-lvl", "filter-potion-tipo", "filter-potion-admin"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-potion");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    applyFilters() {
        const search = (document.getElementById("search-potion")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-potion")?.value || "alfabetica";
        const fLvl = document.getElementById("filter-potion-lvl")?.value || "";
        const fTipo = (document.getElementById("filter-potion-tipo")?.value || "").toLowerCase();
        const fAdmin = (document.getElementById("filter-potion-admin")?.value || "").toLowerCase();

        this.filteredIndex = this.indexData.filter(p => {
            const matchName = !search ||
                (p.nome || "").toLowerCase().includes(search) ||
                (p.tipo || "").toLowerCase().includes(search);
            const matchLvl = !fLvl || String(p.nivel) === String(fLvl);
            const matchTipo = !fTipo || (p.tipo || "").toLowerCase().includes(fTipo);
            const matchAdmin = !fAdmin || (p.administracao || "").toLowerCase().includes(fAdmin);
            return matchName && matchLvl && matchTipo && matchAdmin;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sortMode === "nivel-asc") return parseInt(a.nivel || 1) - parseInt(b.nivel || 1);
            if (sortMode === "nivel-desc") return parseInt(b.nivel || 1) - parseInt(a.nivel || 1);
            if (sortMode === "cd-asc") return (a.dificuldade_cd || 14) - (b.dificuldade_cd || 14);
            if (sortMode === "cd-desc") return (b.dificuldade_cd || 14) - (a.dificuldade_cd || 14);
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;

        const countEl = document.getElementById("potion-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} compostos`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhuma poção encontrada com os filtros atuais.</li>`;
            this.updateExportButtonLabel();
            return;
        }

        const htmlItems = new Array(this.filteredIndex.length);
        for (let i = 0; i < this.filteredIndex.length; i++) {
            const p = this.filteredIndex[i];
            const isActive = this.activePotionId === p.id ? " active-record" : "";
            const isChecked = this.selectedIds.has(p.id) ? " checked" : "";
            const idSafe = escapeHtml(p.id);

            htmlItems[i] = `<li class="record-list-item${isActive}" data-id="${idSafe}">
                <div class="list-item-row">
                    <input type="checkbox" class="record-check" data-id="${idSafe}"${isChecked} title="Selecionar para exportação">
                    <div class="list-item-main">
                        <strong>${escapeHtml(p.nome)}</strong>
                        <small>${escapeHtml(p.tipo)} • CD ${escapeHtml(p.dificuldade_cd || 14)} • ${escapeHtml(p.administracao || "Ingestão")}</small>
                    </div>
                    <span class="badge-level-small">Nv. ${escapeHtml(p.nivel)}</span>
                </div>
            </li>`;
        }

        this.listContainer.innerHTML = htmlItems.join("");
        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-potion-list");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `Exportar Selecionadas (${this.selectedIds.size})`
                : `Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    /**
     * Carregamento Individual Sob Demanda (Tier 2):
     * Busca a receita completa da poção apenas quando clicada na lista.
     */
    async selectAndLoadPotion(id) {
        const prevActive = this.listContainer?.querySelector(".record-list-item.active-record");
        if (prevActive) prevActive.classList.remove("active-record");

        this.activePotionId = id;
        const nextActive = this.listContainer?.querySelector(`.record-list-item[data-id="${CSS.escape(id)}"]`);
        if (nextActive) nextActive.classList.add("active-record");

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");
        this.viewerContainer.innerHTML = `
            <div class="loading-parchment">
                <p>Consultando fórmula alquímica individual no boticário...</p>
            </div>
        `;

        const p = await fetchItemById(COLLECTIONS.POTIONS, id);
        if (!p) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Não foi possível carregar o registro individual desta poção.</p>`;
            return;
        }

        this.renderPotionSheet(p);
    }

    renderPotionSheet(p) {
        const lvl = p.nivel ?? p["nível"] ?? 1;
        const desc = p.descricao || p["descrição"] || "";
        const sis = p.sistema || {};
        const cd = sis.dificuldade_cd ?? p.dificuldade_cd ?? 14;
        const prep = sis.tempo_preparo ?? p.tempo_preparo ?? "1 hora";
        const dur = sis.duracao ?? p.duracao ?? "Instantâneo";
        const admin = sis.administracao ?? p.administracao ?? "Ingestão";
        const meta = p.meta || {};

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card animated-fade">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">CATÁLOGO ALQUÍMICO • COMPOSTOS, ELIXIRES E ANTÍDOTOS</span>
                        <h3 class="sheet-main-title">${escapeHtml(p.nome)}</h3>
                    </div>
                    <div class="level-stamp">
                        <span>ALQUIMIA</span>
                        <strong>Nv. ${escapeHtml(lvl)}</strong>
                    </div>
                </div>

                <div class="sheet-metadata-box mt-15">
                    <div class="meta-item"><strong>Classificação Alquímica:</strong> <span class="cat-badge">${escapeHtml(p.tipo || "Poção")}</span></div>
                    <div class="meta-item"><strong>Dificuldade de Preparo (W&W):</strong> <code>CD ${escapeHtml(cd)} (Poções / Inteligência)</code></div>
                    <div class="meta-item"><strong>Tempo de Preparo:</strong> ${escapeHtml(prep)}</div>
                    <div class="meta-item"><strong>Duração do Efeito:</strong> ${escapeHtml(dur)}</div>
                    <div class="meta-item"><strong>Via de Administração:</strong> ${escapeHtml(admin)}</div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Efeito Mecânico e Propriedades</h4>
                    <p class="sheet-prose">${escapeHtml(p.efeito || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Ingredientes Exigidos no Caldeirão</h4>
                    <div class="peculiaridades-box">
                        ${escapeHtml(p.ingredientes || "Ingredientes sob sigilo de boticário.").replace(/\n/g, "<br>")}
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Características Físicas, Vapores e Lore</h4>
                    <p class="sheet-prose">${escapeHtml(desc).replace(/\n/g, "<br>")}</p>
                    ${meta.wiki ? `<p class="mt-10"><small>Referência Canônica: <a href="${escapeHtml(meta.wiki)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meta.nome_original || p.nome)}</a></small></p>` : ""}
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-potion">
                        Exportar Poção (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-potion">
                        Editar Fórmula
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-potion">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-potion")?.addEventListener("click", () => {
            exportJson(p, `pocao_${p.nome}`);
        });

        this.viewerContainer.querySelector("#btn-edit-potion")?.addEventListener("click", () => {
            this.populateFormForEdit(p);
        });

        this.viewerContainer.querySelector("#btn-delete-potion")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover a poção "${p.nome}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.POTIONS, p.id);
                this.activePotionId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Composto removido. Selecione outra poção na lista ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(p) {
        this.editingId = p.id;
        const sis = p.sistema || {};
        document.getElementById("potion-nome").value = p.nome || "";
        document.getElementById("potion-tipo").value = p.tipo || "Poção";
        document.getElementById("potion-nivel").value = String(p.nivel ?? p["nível"] ?? "1");
        document.getElementById("potion-cd").value = sis.dificuldade_cd ?? p.dificuldade_cd ?? 14;
        document.getElementById("potion-preparo").value = sis.tempo_preparo ?? p.tempo_preparo ?? "1 hora";
        document.getElementById("potion-duracao").value = sis.duracao ?? p.duracao ?? "Instantâneo";
        document.getElementById("potion-admin").value = sis.administracao ?? p.administracao ?? "Ingestão";
        document.getElementById("potion-efeito").value = p.efeito || "";
        document.getElementById("potion-ingredientes").value = p.ingredientes || "";
        document.getElementById("potion-descricao").value = p.descricao || p["descrição"] || "";
        if (document.getElementById("potion-wiki")) {
            document.getElementById("potion-wiki").value = p.meta?.wiki || "";
        }

        document.querySelector('[data-target="tab-registro-pocoes"]')?.click();
    }

    async exportSelectedPotions() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhuma poção disponível para exportar.");
            return;
        }

        const fullPotions = await fetchItemsByIds(COLLECTIONS.POTIONS, targetIds);
        downloadJsonFile(fullPotions, `compendio_pocoes_${fullPotions.length}`);
    }
}

    /**
 * PONTO DE ENTRADA PRINCIPAL — ARQUIVO GERAL DO MINISTÉRIO DA MAGIA (W&W RPG)
 * Inicializa e carrega paralelamente todos os 4 Catálogos (Animais, Feitiços, Plantas e Poções)
 * para que todas as listas fiquem prontas de imediato com máxima agilidade.
 */
// [bundled-import]
// [bundled-import]
// [bundled-import]
// [bundled-import]
// [bundled-import]
// [bundled-import]
async function startApp() {
    try {
        setupThemeControls();

        new TabController();
        const creatureCtrl = new CreatureController();
        const spellCtrl = new SpellController();
        const plantCtrl = new PlantController();
        const potionCtrl = new PotionController();

        const tabControllerMap = {
            "tab-arquivo-criaturas": creatureCtrl,
            "tab-arquivo-feiticos": spellCtrl,
            "tab-arquivo-plantas": plantCtrl,
            "tab-arquivo-pocoes": potionCtrl
        };

        document.addEventListener("tab-opened", e => {
            const targetId = e.detail?.tabId || e.detail?.targetId;
            const ctrl = tabControllerMap[targetId];
            if (ctrl && !ctrl.loaded) {
                ctrl.ensureLoaded();
            }
        });

        await initDatabaseConnection();

        // Carregamento paralelo em lote de todos os 4 catálogos imediatamente
        await Promise.allSettled([
            creatureCtrl.ensureLoaded(),
            spellCtrl.ensureLoaded(),
            plantCtrl.ensureLoaded(),
            potionCtrl.ensureLoaded()
        ]);
    } catch (err) {
        console.error("[W&W Catalog] Erro ao inicializar catálogos:", err);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
} else {
    startApp();
}

function setupThemeControls() {
    const btnTheme = document.getElementById("btn-theme-toggle");
    const btnTerminal = document.getElementById("btn-terminal-toggle");

    const updateThemeButtons = () => {
        const isDark = document.body.classList.contains("dark-mode");
        const isTerminal = document.body.classList.contains("terminal-mode");
        if (btnTheme) {
            btnTheme.textContent = isDark ? "Modo Claro" : "Modo Escuro";
            btnTheme.title = isDark ? "Ativar Modo Claro (Pergaminho)" : "Ativar Modo Escuro (Ministério)";
        }
        if (btnTerminal) {
            btnTerminal.textContent = isTerminal ? "Modo Pergaminho" : "Modo Terminal";
            btnTerminal.title = isTerminal ? "Voltar ao Modo Pergaminho" : "Ativar Modo Terminal Tático";
        }
    };

    updateThemeButtons();

    if (btnTheme) {
        btnTheme.addEventListener("click", () => {
            document.body.classList.remove("terminal-mode");
            const isNowDark = document.body.classList.toggle("dark-mode");
            localStorage.setItem("wwrpg-theme", isNowDark ? "dark" : "light");
            updateThemeButtons();
        });
    }

    if (btnTerminal) {
        btnTerminal.addEventListener("click", () => {
            document.body.classList.remove("dark-mode");
            const isNowTerminal = document.body.classList.toggle("terminal-mode");
            localStorage.setItem("wwrpg-theme", isNowTerminal ? "terminal" : "light");
            updateThemeButtons();
        });
    }
}

})();