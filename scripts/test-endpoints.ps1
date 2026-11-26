# SCRIPT OFICIAL DE TESTE DE ENDPOINTS DA API — MINISTÉRIO DA MAGIA (W&W RPG)
# Valida todos os endpoints REST do Cloud Firestore (Tier 1 e Tier 2) e GitHub Releases

$baseFirestore = "https://firestore.googleapis.com/v1/projects/wwcatalog-10546/databases/(default)/documents"
$results = [System.Collections.Generic.List[PSCustomObject]]::new()

function Test-Endpoint {
    param(
        [string]$Category,
        [string]$Name,
        [string]$Url,
        [scriptblock]$Validator
    )
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = 0
    $ok = $false
    $details = ""
    try {
        $res = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 15 -Headers @{ "User-Agent" = "WWCatalog-Test/1.1.0" }
        $sw.Stop()
        $status = 200
        if ($Validator) {
            $valResult = & $Validator $res
            $ok = [bool]$valResult.Ok
            $details = $valResult.Message
        } else {
            $ok = $true
            $details = "HTTP 200 OK"
        }
    } catch {
        $sw.Stop()
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        } else {
            $status = 500
        }
        $ok = $false
        $details = $_.Exception.Message
    }

    $results.Add([PSCustomObject]@{
        Categoria = $Category
        Endpoint = $Name
        StatusHTTP = $status
        LatenciaMs = $sw.ElapsedMilliseconds
        Resultado = if ($ok) { "SUCESSO" } else { "FALHA" }
        Detalhes = $details
    })
}

Write-Output "Iniciando bateria de testes dos endpoints da API..."

# 1. Tier 1 — Índices Departamentais Leves
Test-Endpoint "Tier 1 - Indices" "GET _indexes/creatures" "$baseFirestore/_indexes/creatures" {
    param($r)
    $items = @($r.fields.items.arrayValue.values)
    @{ Ok = ($items.Count -eq 92); Message = "$($items.Count) especies indexadas (esperado: 92)" }
}

Test-Endpoint "Tier 1 - Indices" "GET _indexes/spells" "$baseFirestore/_indexes/spells" {
    param($r)
    $items = @($r.fields.items.arrayValue.values)
    @{ Ok = ($items.Count -eq 210); Message = "$($items.Count) feiticos indexados (esperado: 210)" }
}

Test-Endpoint "Tier 1 - Indices" "GET _indexes/plants" "$baseFirestore/_indexes/plants" {
    param($r)
    $items = @($r.fields.items.arrayValue.values)
    @{ Ok = ($items.Count -eq 44); Message = "$($items.Count) plantas indexadas (esperado: 44)" }
}

Test-Endpoint "Tier 1 - Indices" "GET _indexes/potions" "$baseFirestore/_indexes/potions" {
    param($r)
    $items = @($r.fields.items.arrayValue.values)
    @{ Ok = ($items.Count -eq 166); Message = "$($items.Count) pocoes indexadas (esperado: 166)" }
}

# 2. Tier 2 — Documentos Individuais Sob Demanda
Test-Endpoint "Tier 2 - Documentos" "GET creatures/acromantula" "$baseFirestore/creatures/acromantula" {
    param($r)
    $nome = $r.fields.nome.stringValue
    $hasFoto = [bool]($r.fields.fotoBase64.stringValue -or $r.fields.fotoUrl.stringValue)
    $corpo = $r.fields.atributos.mapValue.fields.corpo.integerValue
    @{ Ok = ($nome -like "*Acromantula*"); Message = "$nome | Foto Base64 presente: $hasFoto | Corpo: $corpo" }
}

Test-Endpoint "Tier 2 - Documentos" "GET spells/feitico_alohomora" "$baseFirestore/spells/feitico_alohomora" {
    param($r)
    $name = $r.fields.name.stringValue
    $cat = $r.fields.cat.stringValue
    $lvl = $r.fields.lvl.stringValue
    @{ Ok = ($name -eq "Alohomora"); Message = "$name | Nivel: $lvl | Categoria: $cat" }
}

Test-Endpoint "Tier 2 - Documentos" "GET plants/planta_aconito_mata_lobos" "$baseFirestore/plants/planta_aconito_mata_lobos" {
    param($r)
    $nome = $r.fields.nome.stringValue
    $cd = $r.fields.manejo_cd.integerValue
    $cat = $r.fields.categoria.stringValue
    @{ Ok = ($nome -match "Ac[oô]nito"); Message = "$nome | CD: $cd | Categoria: $cat" }
}

Test-Endpoint "Tier 2 - Documentos" "GET potions/pocao_amortentia" "$baseFirestore/potions/pocao_amortentia" {
    param($r)
    $nome = $r.fields.nome.stringValue
    $cd = $r.fields.dificuldade_cd.integerValue
    $tipo = $r.fields.tipo.stringValue
    @{ Ok = ($nome -like "*Amortentia*"); Message = "$nome | CD: $cd | Tipo: $tipo" }
}

# 3. Listagens Diretas de Coleções (Tier 1.5 Fallback)
Test-Endpoint "Tier 1.5 - Listagem Direta" "GET creatures?pageSize=3" "$baseFirestore/creatures?pageSize=3" {
    param($r)
    $docs = @($r.documents)
    @{ Ok = ($docs.Count -gt 0); Message = "$($docs.Count) documentos retornados via listagem direta" }
}

Test-Endpoint "Tier 1.5 - Listagem Direta" "GET spells?pageSize=3" "$baseFirestore/spells?pageSize=3" {
    param($r)
    $docs = @($r.documents)
    @{ Ok = ($docs.Count -gt 0); Message = "$($docs.Count) documentos retornados via listagem direta" }
}

# 4. API de Releases do GitHub (Rastreador de Versão do App)
Test-Endpoint "GitHub Releases" "GET releases/latest" "https://api.github.com/repos/PHLopesvc07/WWRPG-Catalog/releases/latest" {
    param($r)
    $tag = $r.tag_name
    $assets = @($r.assets)
    $apkAsset = @($assets | Where-Object { $_.name -like "*WWcatalog.apk*" })
    $hasApk = ($apkAsset.Count -gt 0)
    $size = if ($hasApk) { $apkAsset[0].size } else { 0 }
    @{ Ok = ($tag -eq "v1.1.0" -and $hasApk); Message = "Versao: $tag | APK presente: $hasApk ($size bytes)" }
}

Test-Endpoint "GitHub Releases" "GET releases" "https://api.github.com/repos/PHLopesvc07/WWRPG-Catalog/releases" {
    param($r)
    $totalReleases = @($r).Count
    @{ Ok = ($totalReleases -ge 4); Message = "$totalReleases releases publicadas no historico" }
}

Write-Output "`n=========================================================================================="
Write-Output "RELATÓRIO DE CONECTIVIDADE E INTEGRIDADE DOS ENDPOINTS (W&W RPG CATALOG)"
Write-Output "=========================================================================================="
$results | Format-Table -AutoSize

$total = $results.Count
$sucessos = ($results | Where-Object { $_.Resultado -eq "SUCESSO" }).Count
$falhas = $total - $sucessos

Write-Output "Total de Endpoints Testados: $total"
Write-Output "Sucessos: $sucessos | Falhas: $falhas"
Write-Output "Status Geral: $(if ($falhas -eq 0) { 'TODOS OS ENDPOINTS OPERACIONAIS (100% OK)' } else { 'ATENCAO: ENDPOINTS COM FALHA' })"
