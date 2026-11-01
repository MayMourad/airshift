# Exports AIRSHIFT_YPL_Pitch_Deck.pptx to PDF and per-slide PNG previews using desktop PowerPoint.
# Requires Microsoft PowerPoint and the three brand fonts installed (see deck/fonts).
# Usage: powershell -ExecutionPolicy Bypass -File export.ps1
$deck = $PSScriptRoot
$pptxPath = Join-Path $deck 'AIRSHIFT_YPL_Pitch_Deck.pptx'
$pdf = Join-Path $deck 'AIRSHIFT_YPL_Pitch_Deck.pdf'
$png = Join-Path $deck 'preview'
New-Item -ItemType Directory -Force $png | Out-Null
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($pptxPath, -1, 0, 0)
  $pres.SaveAs($pdf, 32)
  $pres.Export($png, 'PNG', 1600, 900)
  "Exported $($pres.Slides.Count) slides"
  $pres.Close()
} finally { $app.Quit() }
