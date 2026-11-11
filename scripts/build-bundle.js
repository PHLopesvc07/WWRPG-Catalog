/**
 * SCRIPT DE BUNDLING UNIVERSAL (STANDALONE)
 * Converte os módulos ES em um único arquivo executável para funcionamento 100% garantido em:
 * 1. Protocolo file:/// (duplo clique no Windows)
 * 2. WebView Android (file:///android_asset/)
 * 3. Servidores HTTP / HTTPS
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function bundleDesktop() {
    console.log('[Bundle] Gerando js/bundle.js para Desktop...');
    
    // Arquivos em ordem de dependência
    const helpers = fs.readFileSync(path.join(ROOT_DIR, 'js', 'utils', 'helpers.js'), 'utf-8');
    const updater = fs.readFileSync(path.join(ROOT_DIR, 'js', 'services', 'updater.js'), 'utf-8');
    const firebaseConfig = fs.readFileSync(path.join(ROOT_DIR, 'js', 'services', 'firebaseConfig.js'), 'utf-8');
    const fallbackData = fs.readFileSync(path.join(ROOT_DIR, 'js', 'data', 'fallbackData.js'), 'utf-8');
    const database = fs.readFileSync(path.join(ROOT_DIR, 'js', 'services', 'database.js'), 'utf-8');
    const tabCtrl = fs.readFileSync(path.join(ROOT_DIR, 'js', 'controllers', 'TabController.js'), 'utf-8');
    const creatureCtrl = fs.readFileSync(path.join(ROOT_DIR, 'js', 'controllers', 'CreatureController.js'), 'utf-8');
    const spellCtrl = fs.readFileSync(path.join(ROOT_DIR, 'js', 'controllers', 'SpellController.js'), 'utf-8');
    const plantCtrl = fs.readFileSync(path.join(ROOT_DIR, 'js', 'controllers', 'PlantController.js'), 'utf-8');
    const potionCtrl = fs.readFileSync(path.join(ROOT_DIR, 'js', 'controllers', 'PotionController.js'), 'utf-8');
    const main = fs.readFileSync(path.join(ROOT_DIR, 'js', 'main.js'), 'utf-8');

    // Remove imports e exports
    const stripModuleSyntax = (code) => {
        return code
            .replace(/^\s*import\s+[^;]+;\s*$/gm, '// [bundled-import]')
            .replace(/^\s*export\s+(const|let|var|function|class|async function)\s+/gm, '$1 ')
            .replace(/^\s*export\s*\{[^}]+\};\s*$/gm, '// [bundled-export]')
            .replace(/^\s*export\s+default\s+/gm, '');
    };

    const combined = `
(function() {
    'use strict';
    console.log('[W&W Catalog] Inicializando Catálogo Ministerial (Standalone Bundle)...');

    ${stripModuleSyntax(helpers)}
    ${stripModuleSyntax(updater)}
    ${stripModuleSyntax(firebaseConfig)}
    ${stripModuleSyntax(fallbackData)}
    ${stripModuleSyntax(database)}
    ${stripModuleSyntax(tabCtrl)}
    ${stripModuleSyntax(creatureCtrl)}
    ${stripModuleSyntax(spellCtrl)}
    ${stripModuleSyntax(plantCtrl)}
    ${stripModuleSyntax(potionCtrl)}
    ${stripModuleSyntax(main)}
})();
    `.trim();

    fs.writeFileSync(path.join(ROOT_DIR, 'js', 'bundle.js'), combined, 'utf-8');
    console.log('[Bundle] js/bundle.js criado com sucesso!');
}

function bundleMobile() {
    console.log('[Bundle] Gerando mobile/mobile.bundle.js para Versão Móvel...');

    const helpers = fs.readFileSync(path.join(ROOT_DIR, 'js', 'utils', 'helpers.js'), 'utf-8');
    const updater = fs.readFileSync(path.join(ROOT_DIR, 'js', 'services', 'updater.js'), 'utf-8');
    const firebaseConfig = fs.readFileSync(path.join(ROOT_DIR, 'js', 'services', 'firebaseConfig.js'), 'utf-8');
    const fallbackData = fs.readFileSync(path.join(ROOT_DIR, 'js', 'data', 'fallbackData.js'), 'utf-8');
    const database = fs.readFileSync(path.join(ROOT_DIR, 'js', 'services', 'database.js'), 'utf-8');
    const mobileMain = fs.readFileSync(path.join(ROOT_DIR, 'mobile', 'mobile.js'), 'utf-8');

    const stripModuleSyntax = (code) => {
        return code
            .replace(/^\s*import\s+[^;]+;\s*$/gm, '// [bundled-import]')
            .replace(/^\s*export\s+(const|let|var|function|class|async function)\s+/gm, '$1 ')
            .replace(/^\s*export\s*\{[^}]+\};\s*$/gm, '// [bundled-export]')
            .replace(/^\s*export\s+default\s+/gm, '');
    };

    const combined = `
(function() {
    'use strict';
    console.log('[W&W Catalog Mobile] Inicializando Versão Móvel (Standalone Bundle)...');

    ${stripModuleSyntax(helpers)}
    ${stripModuleSyntax(updater)}
    ${stripModuleSyntax(firebaseConfig)}
    ${stripModuleSyntax(fallbackData)}
    ${stripModuleSyntax(database)}
    ${stripModuleSyntax(mobileMain)}
})();
    `.trim();

    fs.writeFileSync(path.join(ROOT_DIR, 'mobile', 'mobile.bundle.js'), combined, 'utf-8');
    console.log('[Bundle] mobile/mobile.bundle.js criado com sucesso!');
}

bundleDesktop();
bundleMobile();
