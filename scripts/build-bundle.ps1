# SCRIPT DE BUNDLING EM POWERSHELL PARA STANDALONE E ANDROID
$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot

function Strip-ModuleSyntax([string]$code) {
    $c = [regex]::Replace($code, '(?m)^\s*import\s+[^;]+;\s*$', '// [bundled-import]')
    $c = [regex]::Replace($c, '(?m)^\s*export\s+(const|let|var|function|class|async function)\s+', '$1 ')
    $c = [regex]::Replace($c, '(?m)^\s*export\s*\{[^}]+\};\s*$', '// [bundled-export]')
    $c = [regex]::Replace($c, '(?m)^\s*export\s+default\s+', '')
    return $c
}

Write-Host "[Bundle] Gerando js/bundle.js para Desktop..."
$helpers = Get-Content (Join-Path $rootDir "js\utils\helpers.js") -Raw -Encoding UTF8
$updater = Get-Content (Join-Path $rootDir "js\services\updater.js") -Raw -Encoding UTF8
$firebaseConfig = Get-Content (Join-Path $rootDir "js\services\firebaseConfig.js") -Raw -Encoding UTF8
$fallbackData = Get-Content (Join-Path $rootDir "js\data\fallbackData.js") -Raw -Encoding UTF8
$cacheStore = Get-Content (Join-Path $rootDir "js\services\cacheStore.js") -Raw -Encoding UTF8
$database = Get-Content (Join-Path $rootDir "js\services\database.js") -Raw -Encoding UTF8
$tabCtrl = Get-Content (Join-Path $rootDir "js\controllers\TabController.js") -Raw -Encoding UTF8
$creatureCtrl = Get-Content (Join-Path $rootDir "js\controllers\CreatureController.js") -Raw -Encoding UTF8
$spellCtrl = Get-Content (Join-Path $rootDir "js\controllers\SpellController.js") -Raw -Encoding UTF8
$plantCtrl = Get-Content (Join-Path $rootDir "js\controllers\PlantController.js") -Raw -Encoding UTF8
$potionCtrl = Get-Content (Join-Path $rootDir "js\controllers\PotionController.js") -Raw -Encoding UTF8
$main = Get-Content (Join-Path $rootDir "js\main.js") -Raw -Encoding UTF8

$desktopBundle = @"
(function() {
    'use strict';
    console.log('[W&W Catalog] Inicializando Catalogo Ministerial (Standalone Bundle)...');

    $(Strip-ModuleSyntax $helpers)
    $(Strip-ModuleSyntax $updater)
    $(Strip-ModuleSyntax $firebaseConfig)
    $(Strip-ModuleSyntax $fallbackData)
    $(Strip-ModuleSyntax $cacheStore)
    $(Strip-ModuleSyntax $database)
    $(Strip-ModuleSyntax $tabCtrl)
    $(Strip-ModuleSyntax $creatureCtrl)
    $(Strip-ModuleSyntax $spellCtrl)
    $(Strip-ModuleSyntax $plantCtrl)
    $(Strip-ModuleSyntax $potionCtrl)
    $(Strip-ModuleSyntax $main)
})();
"@

Set-Content -Path (Join-Path $rootDir "js\bundle.js") -Value $desktopBundle -Encoding UTF8
Set-Content -Path (Join-Path $rootDir "android-app\app\src\main\assets\js\bundle.js") -Value $desktopBundle -Encoding UTF8

Write-Host "[Bundle] Gerando mobile/mobile.bundle.js para Mobile..."
$mobileMain = Get-Content (Join-Path $rootDir "mobile\mobile.js") -Raw -Encoding UTF8

$mobileBundle = @"
(function() {
    'use strict';
    console.log('[W&W Catalog Mobile] Inicializando Versao Movel (Standalone Bundle)...');

    $(Strip-ModuleSyntax $helpers)
    $(Strip-ModuleSyntax $updater)
    $(Strip-ModuleSyntax $firebaseConfig)
    $(Strip-ModuleSyntax $fallbackData)
    $(Strip-ModuleSyntax $cacheStore)
    $(Strip-ModuleSyntax $database)
    $(Strip-ModuleSyntax $mobileMain)
})();
"@

Set-Content -Path (Join-Path $rootDir "mobile\mobile.bundle.js") -Value $mobileBundle -Encoding UTF8
Set-Content -Path (Join-Path $rootDir "android-app\app\src\main\assets\mobile\mobile.bundle.js") -Value $mobileBundle -Encoding UTF8

# Sincroniza arquivos compartilhados e servicos para os assets do Android
Copy-Item -Path (Join-Path $rootDir "shared\services\cacheStore.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\shared\services\cacheStore.js") -Force
Copy-Item -Path (Join-Path $rootDir "shared\services\database.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\shared\services\database.js") -Force
Copy-Item -Path (Join-Path $rootDir "shared\services\updater.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\shared\services\updater.js") -Force
Copy-Item -Path (Join-Path $rootDir "js\services\cacheStore.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\js\services\cacheStore.js") -Force
Copy-Item -Path (Join-Path $rootDir "js\services\database.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\js\services\database.js") -Force
Copy-Item -Path (Join-Path $rootDir "js\services\updater.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\js\services\updater.js") -Force
Copy-Item -Path (Join-Path $rootDir "js\main.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\js\main.js") -Force
Copy-Item -Path (Join-Path $rootDir "mobile\mobile.js") -Destination (Join-Path $rootDir "android-app\app\src\main\assets\mobile\mobile.js") -Force

Write-Host "[Bundle] Todos os bundles gerados e sincronizados com sucesso!"
