# PDF Agent Test Script (PowerShell)
# Usage: .\test_pdf_agent.ps1 [pdf_file_path]

param(
    [string]$PdfFile = "src\main\resources\test.pdf"
)

$BaseUrl = "http://localhost:5000/api/v1/pdf"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "PDF Agent Test Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if service is running
Write-Host "1. Checking service status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/upload" -Method POST -ErrorAction SilentlyContinue
} catch {
    if ($_.Exception.Response.StatusCode -eq 405 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Host "[OK] Service is running" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Service is not running, please start the backend service first" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Upload PDF
Write-Host "2. Uploading PDF file: $PdfFile" -ForegroundColor Yellow

try {
    # Use .NET HttpClient for file upload (compatible with Windows PowerShell 5.1)
    Add-Type -AssemblyName System.Net.Http
    
    $filePath = Resolve-Path $PdfFile
    $fileName = Split-Path $filePath -Leaf
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    
    $httpClient = New-Object System.Net.Http.HttpClient
    $multipartContent = New-Object System.Net.Http.MultipartFormDataContent
    
    $fileContent = New-Object System.Net.Http.ByteArrayContent($fileBytes)
    $fileContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf")
    $multipartContent.Add($fileContent, "file", $fileName)
    
    $response = $httpClient.PostAsync("$BaseUrl/upload", $multipartContent).Result
    $responseContent = $response.Content.ReadAsStringAsync().Result
    
    if ($response.IsSuccessStatusCode) {
        $uploadResponse = $responseContent | ConvertFrom-Json
        Write-Host ($uploadResponse | ConvertTo-Json -Depth 10) -ForegroundColor White
        
        $sessionId = $uploadResponse.data.session_id
        
        if ([string]::IsNullOrEmpty($sessionId)) {
            Write-Host "[ERROR] PDF upload failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "[OK] PDF uploaded successfully, session_id: $sessionId" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "[ERROR] PDF upload failed: HTTP $($response.StatusCode) - $responseContent" -ForegroundColor Red
        exit 1
    }
    
    $httpClient.Dispose()
} catch {
    Write-Host "[ERROR] PDF upload failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.InnerException) {
        Write-Host "Inner exception: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
    exit 1
}

# Ask question
Write-Host "3. Asking question: What is the main content of this document?" -ForegroundColor Yellow
$chatBody = @{
    question = "这个文档的主要内容是什么？"
    session_id = $sessionId
} | ConvertTo-Json

try {
    $chatResponse = Invoke-RestMethod -Uri "$BaseUrl/chat" -Method POST -Body $chatBody -ContentType "application/json"
    Write-Host ($chatResponse | ConvertTo-Json -Depth 10) -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "[ERROR] Question failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Clear session
Write-Host "4. Clearing session..." -ForegroundColor Yellow
$clearBody = @{
    session_id = $sessionId
} | ConvertTo-Json

try {
    $clearResponse = Invoke-RestMethod -Uri "$BaseUrl/clear" -Method POST -Body $clearBody -ContentType "application/json"
    Write-Host ($clearResponse | ConvertTo-Json -Depth 10) -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "[ERROR] Clear session failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test completed" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
