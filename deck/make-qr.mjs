// Generates assets/qr-prototype.png (QR code for the live prototype). Run: node make-qr.mjs
import QRCode from 'qrcode'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const PROTOTYPE_URL = 'https://maymourad.github.io/airshift/#air-lab'
await QRCode.toFile(path.join(here, 'assets', 'qr-prototype.png'), PROTOTYPE_URL, {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 800,
  color: { dark: '#071622', light: '#FFFFFF' },
})
console.log('wrote assets/qr-prototype.png for', PROTOTYPE_URL)
