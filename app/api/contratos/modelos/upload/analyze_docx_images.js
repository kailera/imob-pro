const fs = require('fs');
const path = require('path');
const PizZip = require('c:\\Users\\rebec\\Documents\\scatolin\\imob-pro\\node_modules\\pizzip');

const docxPath = 'c:\\Users\\rebec\\Documents\\scatolin\\imob-pro\\public\\templates-docx\\465c6fc2-14c1-418e-90a8-4ae8785c1f91.docx';
const buffer = fs.readFileSync(docxPath);
const zip = new PizZip(buffer);

const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('word/media/'));

mediaFiles.forEach((filename, idx) => {
  const imgBuffer = zip.files[filename].asNodeBuffer();
  const destPath = `c:\\Users\\rebec\\.gemini\\antigravity-ide\\brain\\5099817c-3425-44d8-b37d-d1256e32dc75\\scratch\\img_${idx + 1}.png`;
  fs.writeFileSync(destPath, imgBuffer);
  console.log(`Salvo img_${idx + 1}.png (${imgBuffer.length} bytes)`);
});

// Criar script PowerShell para inspecionar os pixels
const psScript = `
Add-Type -AssemblyName System.Drawing
Write-Host "=== ANÁLISE DOS PIXELS DAS IMAGENS DO DOCX ==="
for ($i = 1; $i -le ${mediaFiles.length}; $i++) {
    $path = "c:\\Users\\rebec\\.gemini\\antigravity-ide\\brain\\5099817c-3425-44d8-b37d-d1256e32dc75\\scratch\\img_$i.png"
    $img = [System.Drawing.Image]::FromFile($path)
    $bmp = New-Object System.Drawing.Bitmap($img)
    Write-Host "Imagem $i ($($img.Width)x$($img.Height)):"
    # Inspecionar alguns pixels no topo
    for ($x = 100; $x -lt 150; $x += 10) {
        $p = $bmp.GetPixel($x, 50)
        Write-Host "  Pixel ($x, 50) -> R=$($p.R), G=$($p.G), B=$($p.B), A=$($p.A)"
    }
    $bmp.Dispose()
    $img.Dispose()
}
`;

fs.writeFileSync('c:\\Users\\rebec\\.gemini\\antigravity-ide\\brain\\5099817c-3425-44d8-b37d-d1256e32dc75\\scratch\\debug_docx_images.ps1', psScript);
console.log('Script PowerShell debug_docx_images.ps1 criado!');
