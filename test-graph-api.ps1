# Load environment variables from .env if it exists
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                # Remove quotes if present
                $value = $value -replace "^`"|`"$",""
                $value = $value -replace "^'|'$",""
                Set-Item "env:$key" $value
            }
        }
    }
}

$tenantId = $env:GRAPH_TENANT_ID
$clientId = $env:GRAPH_CLIENT_ID
$clientSecret = $env:GRAPH_CLIENT_SECRET
$userEmail = if ($env:GRAPH_USER_EMAIL) { $env:GRAPH_USER_EMAIL } else { "info@technosprint.net" }

# Get token with Graph API scope
$body = @{
    client_id     = $clientId
    client_secret = $clientSecret
    scope         = "https://graph.microsoft.com/.default"
    grant_type    = "client_credentials"
}

Write-Host "Requesting OAuth2 token..."
try {
    $tokenResp = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    Write-Host "TOKEN OK - expires_in: $($tokenResp.expires_in)s"
} catch {
    Write-Host "TOKEN FAILED: $($_.Exception.Message)"
    exit 1
}

# Test reading mailbox via Graph API
$headers = @{ Authorization = "Bearer $($tokenResp.access_token)" }

Write-Host ""
Write-Host "Reading mailbox for $userEmail via Graph API..."
try {
    $msgs = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/users/$userEmail/messages?`$top=5&`$select=subject,receivedDateTime,isRead&`$orderby=receivedDateTime desc" -Headers $headers -Method GET
    Write-Host "SUCCESS - Found $($msgs.value.Count) messages:"
    foreach ($m in $msgs.value) {
        $readStatus = if ($m.isRead) { "READ" } else { "UNREAD" }
        Write-Host "  [$readStatus] $($m.receivedDateTime) - $($m.subject)"
    }
} catch {
    Write-Host "GRAPH API FAILED: $($_.Exception.Message)"
    # Show response body if available
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        Write-Host $reader.ReadToEnd()
    }
}
