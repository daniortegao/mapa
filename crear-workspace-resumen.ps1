# Script para crear estructura de workspace Resumen-Mercado

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creando Workspace Resumen-Mercado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = "C:\Users\e08f\Desktop\Proyectos"
Set-Location $baseDir

# 1. Crear estructura de carpetas
Write-Host "[1/3] Creando estructura de carpetas..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "Resumen-Mercado" -Force | Out-Null
New-Item -ItemType Directory -Path "Resumen-Mercado\Mapa" -Force | Out-Null

# 2. Copiar proyecto Mapa
Write-Host "[2/3] Copiando proyecto Mapa..." -ForegroundColor Yellow
if (Test-Path "Resumen\mapa-v2") {
    Copy-Item "Resumen\mapa-v2\*" "Resumen-Mercado\Mapa" -Recurse -Force
    Write-Host "    ✅ Mapa copiado correctamente" -ForegroundColor Green
} else {
    Write-Host "    ⚠️  No se encontró Resumen\mapa-v2" -ForegroundColor Yellow
}

# 3. Crear archivo de workspace
Write-Host "[3/3] Creando archivo de workspace..." -ForegroundColor Yellow
$workspaceContent = @"
{
	"folders": [
		{
			"name": "🗺️ Mapa",
			"path": "./Mapa"
		},
		{
			"name": "📊 Ajuste Semanal",
			"path": "../ajuste-semanal"
		}
	],
	"settings": {
		"files.exclude": {
			"**/node_modules": true,
			"**/build": true,
			"**/.git": true
		},
		"search.exclude": {
			"**/node_modules": true,
			"**/build": true
		}
	}
}
"@

$workspaceContent | Out-File -FilePath "Resumen-Mercado\Resumen-Mercado.code-workspace" -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Workspace Creado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📂 Estructura creada:" -ForegroundColor White
Write-Host "   Resumen-Mercado/" -ForegroundColor Cyan
Write-Host "   ├── Mapa/                           (proyecto copiado)" -ForegroundColor Gray
Write-Host "   └── Resumen-Mercado.code-workspace  (archivo workspace)" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Para abrir el workspace:" -ForegroundColor White
Write-Host "   code Resumen-Mercado\Resumen-Mercado.code-workspace" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
