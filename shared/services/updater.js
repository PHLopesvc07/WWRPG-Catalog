/**
 * SERVIÇO DE RASTREAMENTO AUTOMÁTICO DE RELEASES NO GITHUB
 * Verifica periodicamente a API do repositório para detectar novas versões do catálogo
 * e notificar o usuário com botão de download direto do .apk.
 */

const REPO_OWNER = "PHLopesvc07";
const REPO_NAME = "WWRPG-Catalog";
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

export const CURRENT_APP_VERSION = "1.0.3";

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

export async function checkForAppUpdates(currentVersion = CURRENT_APP_VERSION) {
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
