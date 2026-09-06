#!/usr/bin/env node
'use strict';
/**
 * Pack a bundle directory into a .softn archive, standalone.
 *
 *   node tools/pack.cjs <bundleDir> <out.softn>
 *
 * The same ZIP writer and the same rules as softn.com's apps/demo/scripts/build-bundle.cjs
 * (f2i-com/softn.com@efdd21b): entries are stored uncompressed in a sorted order so that
 * identical sources give identical bytes (the bundle's bytes are the app's identity),
 * text files are read as UTF-8 and binaries byte for byte, and everything physically
 * under assets/ is included even if the manifest's list is stale.
 */
const fs = require('fs');
const path = require('path');

// Binary file extensions, kept in step with packages/@softn/core/src/bundle/asset-classification.ts.
const binaryExtensions = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg', '.bmp', '.avif', '.tiff', '.tif',
  '.glb', '.obj', '.fbx', '.stl', '.3ds', '.dae', '.bin',
  '.mp3', '.wav', '.ogg', '.opus', '.aac', '.flac', '.m4a',
  '.mp4', '.webm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.hdr', '.exr', '.pdf',
  '.onnx',
];
const MAX_BYTES = 32 * 1024 * 1024; // The web runtime refuses remote bundles above this.

function isBinary(filePath) {
  return binaryExtensions.includes(path.extname(filePath).toLowerCase());
}

function collectFilesRecursive(rootDir, baseDir) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else out.push(path.relative(baseDir, abs).replace(/\\/g, '/'));
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < crcTable.length; i++) {
  let value = i;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[i] = value;
}
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries) {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBytes = Buffer.from(name, 'utf-8');
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const checksum = crc32(dataBuffer);
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBytes.copy(localHeader, 30);
    chunks.push(localHeader, dataBuffer);
    const cdEntry = Buffer.alloc(46 + nameBytes.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);
    cdEntry.writeUInt16LE(20, 4);
    cdEntry.writeUInt16LE(20, 6);
    cdEntry.writeUInt16LE(0, 8);
    cdEntry.writeUInt16LE(0, 10);
    cdEntry.writeUInt16LE(0, 12);
    cdEntry.writeUInt16LE(0, 14);
    cdEntry.writeUInt32LE(checksum, 16);
    cdEntry.writeUInt32LE(dataBuffer.length, 20);
    cdEntry.writeUInt32LE(dataBuffer.length, 24);
    cdEntry.writeUInt16LE(nameBytes.length, 28);
    cdEntry.writeUInt16LE(0, 30);
    cdEntry.writeUInt16LE(0, 32);
    cdEntry.writeUInt16LE(0, 34);
    cdEntry.writeUInt16LE(0, 36);
    cdEntry.writeUInt32LE(0, 38);
    cdEntry.writeUInt32LE(offset, 42);
    nameBytes.copy(cdEntry, 46);
    centralDirectory.push(cdEntry);
    offset += localHeader.length + dataBuffer.length;
  }
  const cdStart = offset;
  for (const entry of centralDirectory) {
    chunks.push(entry);
    offset += entry.length;
  }
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.size, 8);
  eocd.writeUInt16LE(entries.size, 10);
  eocd.writeUInt32LE(offset - cdStart, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);
  return Buffer.concat(chunks);
}

/** Pack `sourceDir` into a Buffer; returns { bytes, entries, manifest }. */
function packBundle(sourceDir) {
  const manifestPath = path.join(sourceDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`manifest.json not found in ${sourceDir}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const entries = new Map();
  entries.set('manifest.json', JSON.stringify(manifest, null, 2));
  const permPath = path.join(sourceDir, 'permission.json');
  if (fs.existsSync(permPath)) entries.set('permission.json', fs.readFileSync(permPath, 'utf-8'));
  const fileSet = new Set([
    ...(manifest.files.ui || []),
    ...(manifest.files.logic || []),
    ...(manifest.files.server || []),
    ...(manifest.files.xdb || []),
    ...(manifest.files.assets || []),
  ]);
  for (const a of collectFilesRecursive(path.join(sourceDir, 'assets'), sourceDir)) fileSet.add(a);
  if (manifest.main) fileSet.add(manifest.main);
  if (manifest.icon) fileSet.add(manifest.icon);
  const missing = [];
  for (const filePath of fileSet) {
    const fullPath = path.join(sourceDir, filePath);
    if (!fs.existsSync(fullPath)) { missing.push(filePath); continue; }
    entries.set(filePath, isBinary(filePath) ? fs.readFileSync(fullPath) : fs.readFileSync(fullPath, 'utf-8'));
  }
  if (missing.length) throw new Error('Files named by the manifest are missing:\n  ' + missing.join('\n  '));
  const bytes = createZip(entries);
  if (bytes.length > MAX_BYTES) throw new Error(`Bundle is ${bytes.length} bytes; the web runtime refuses remote bundles over ${MAX_BYTES}.`);
  return { bytes, entries: entries.size, manifest };
}

module.exports = { packBundle, collectFilesRecursive, isBinary, MAX_BYTES };

if (require.main === module) {
  const [sourceDir, outFile] = process.argv.slice(2);
  if (!sourceDir || !outFile) {
    console.error('Usage: node tools/pack.cjs <bundleDir> <out.softn>');
    process.exit(1);
  }
  try {
    const { bytes, entries, manifest } = packBundle(path.resolve(sourceDir));
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(path.resolve(outFile), bytes);
    console.log(`${manifest.name} v${manifest.version}: ${entries} entries, ${(bytes.length / 1048576).toFixed(2)} MB -> ${outFile}`);
  } catch (err) {
    console.error('Packing failed: ' + err.message);
    process.exit(1);
  }
}
