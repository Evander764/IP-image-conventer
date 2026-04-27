import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const svgPath = join(root, 'resources', 'icon.svg')
const pngPath = join(root, 'resources', 'icon.png')
const icoPath = join(root, 'resources', 'icon.ico')

function icoFromPng(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const directory = Buffer.alloc(16)
  directory.writeUInt8(0, 0)
  directory.writeUInt8(0, 1)
  directory.writeUInt8(0, 2)
  directory.writeUInt8(0, 3)
  directory.writeUInt16LE(1, 4)
  directory.writeUInt16LE(32, 6)
  directory.writeUInt32LE(png.length, 8)
  directory.writeUInt32LE(22, 12)

  return Buffer.concat([header, directory, png])
}

const svg = await readFile(svgPath)
const png = await sharp(svg).resize(256, 256).png().toBuffer()
await writeFile(pngPath, png)
await writeFile(icoPath, icoFromPng(png))

console.log(`Generated ${pngPath}`)
console.log(`Generated ${icoPath}`)
