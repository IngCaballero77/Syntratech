$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

$distPath = Join-Path $scriptDir "dist"
if (-not (Test-Path $distPath)) {
    $distPath = Join-Path $scriptDir "Syntratech\dist"
}

if (-not (Test-Path $distPath)) {
    Write-Host "Error: No se encontró la carpeta 'dist' en $distPath" -ForegroundColor Red
    pause
    exit 1
}

$listener = New-Object System.Net.HttpListener
$ports = @(5173, 5174)
$boundPorts = @()

foreach ($p in $ports) {
    try {
        $testListener = New-Object System.Net.HttpListener
        $testListener.Prefixes.Add("http://localhost:$p/")
        $testListener.Start()
        $testListener.Stop()
        $listener.Prefixes.Add("http://localhost:$p/")
        $boundPorts += $p
    } catch {}
}

if ($boundPorts.Count -eq 0) {
    $p = 5175
    $listener.Prefixes.Add("http://localhost:$p/")
    $boundPorts += $p
}

$listener.Start()

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Servidor Syntratech iniciado correctamente" -ForegroundColor Green
foreach ($p in $boundPorts) {
    Write-Host " Enlace activo: http://localhost:$p/" -ForegroundColor Yellow
}
Write-Host " Presiona Ctrl+C en esta ventana para detenerlo." -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Cyan

try {
    Start-Process "http://localhost:$($boundPorts[0])/"
} catch {}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawUrl)) {
            $rawUrl = "index.html"
        }

        $filePath = Join-Path $distPath $rawUrl.Replace('/', '\')
        if (-not (Test-Path $filePath -PathType Leaf)) {
            $filePath = Join-Path $distPath "index.html"
        }

        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = $mimeTypes[$ext]
        if (-not $contentType) {
            $contentType = "application/octet-stream"
        }

        $response.ContentType = $contentType
        try {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {
            $response.StatusCode = 500
        } finally {
            $response.OutputStream.Close()
        }
    }
} finally {
    $listener.Stop()
}
