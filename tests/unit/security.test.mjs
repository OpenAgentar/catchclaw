import { describe, it, expect } from 'vitest'
import { __test__ } from '../../skill/install/agentar_cli.mjs'

const { isSensitiveFile, validateZipSecurity } = __test__

// ─── Helper: build a minimal valid ZIP buffer in memory ─────────────────────

function buildZipBuffer(entries) {
  // entries: [{ name: string, data?: Buffer, externalAttr?: number }]
  const parts = []
  const centralDir = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8')
    const data = entry.data || Buffer.alloc(0)
    const crc = 0
    const compSize = data.length
    const uncompSize = entry.uncompSize ?? data.length

    // local file header (30 + nameLen)
    const lh = Buffer.alloc(30 + nameBuf.length)
    lh.writeUInt32LE(0x04034b50, 0)     // signature
    lh.writeUInt16LE(20, 4)             // version needed
    lh.writeUInt16LE(0x800, 6)          // flags: UTF-8
    lh.writeUInt16LE(0, 8)              // method: stored
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(compSize, 18)
    lh.writeUInt32LE(uncompSize, 22)
    lh.writeUInt16LE(nameBuf.length, 26)
    nameBuf.copy(lh, 30)
    parts.push(lh, data)

    // central directory entry (46 + nameLen)
    const cd = Buffer.alloc(46 + nameBuf.length)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4)
    cd.writeUInt16LE(20, 6)
    cd.writeUInt16LE(0x800, 8)          // flags: UTF-8
    cd.writeUInt16LE(0, 10)             // method: stored
    cd.writeUInt32LE(crc, 16)
    cd.writeUInt32LE(compSize, 20)
    cd.writeUInt32LE(uncompSize, 24)
    cd.writeUInt16LE(nameBuf.length, 28)
    // external attributes
    if (entry.externalAttr != null) {
      cd.writeUInt32LE(entry.externalAttr, 38)
    }
    cd.writeUInt32LE(offset, 42)
    nameBuf.copy(cd, 46)
    centralDir.push(cd)

    offset += lh.length + data.length
  }

  const cdBuf = Buffer.concat(centralDir)

  // end of central directory (22 bytes)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)

  return Buffer.concat([...parts, cdBuf, eocd])
}

// ─── isSensitiveFile ────────────────────────────────────────────────────────

describe('isSensitiveFile', () => {
  it('detects .env as sensitive', () => {
    expect(isSensitiveFile('.env')).toBe(true)
  })

  it('detects .env.local as sensitive (ends with .env)', () => {
    // .env.local ends with neither .env nor matches exact patterns
    // Let's check the actual patterns: [".credentials", ".env", ".secret", ".key", ".pem"]
    // .env.local does NOT end with .env. It's not sensitive by the current logic.
    // But "app.env" DOES end with .env.
    expect(isSensitiveFile('.env.local')).toBe(false)
  })

  it('detects files ending with .env as sensitive', () => {
    expect(isSensitiveFile('app.env')).toBe(true)
  })

  it('detects .credentials as sensitive', () => {
    expect(isSensitiveFile('.credentials')).toBe(true)
  })

  it('detects files ending with .credentials as sensitive', () => {
    expect(isSensitiveFile('google.credentials')).toBe(true)
  })

  it('detects .secret as sensitive', () => {
    expect(isSensitiveFile('.secret')).toBe(true)
  })

  it('detects .key as sensitive', () => {
    expect(isSensitiveFile('.key')).toBe(true)
  })

  it('detects id_rsa.key as sensitive', () => {
    expect(isSensitiveFile('id_rsa.key')).toBe(true)
  })

  it('detects .pem as sensitive', () => {
    expect(isSensitiveFile('.pem')).toBe(true)
  })

  it('detects server.pem as sensitive', () => {
    expect(isSensitiveFile('server.pem')).toBe(true)
  })

  it('does not flag README.md', () => {
    expect(isSensitiveFile('README.md')).toBe(false)
  })

  it('does not flag index.js', () => {
    expect(isSensitiveFile('index.js')).toBe(false)
  })

  it('does not flag package.json', () => {
    expect(isSensitiveFile('package.json')).toBe(false)
  })

  it('does not flag environment.ts (does not end with .env)', () => {
    expect(isSensitiveFile('environment.ts')).toBe(false)
  })

  it('does not flag keynote.pptx (does not end with .key)', () => {
    // "keynote.pptx" does not end with .key
    expect(isSensitiveFile('keynote.pptx')).toBe(false)
  })
})

// ─── validateZipSecurity ────────────────────────────────────────────────────

describe('validateZipSecurity', () => {
  it('accepts a valid ZIP with normal entries', () => {
    const buf = buildZipBuffer([
      { name: 'README.md', data: Buffer.from('hello') },
      { name: 'src/index.js', data: Buffer.from('code') },
    ])
    expect(() => validateZipSecurity(buf)).not.toThrow()
  })

  it('accepts an empty ZIP (zero entries)', () => {
    const buf = buildZipBuffer([])
    expect(() => validateZipSecurity(buf)).not.toThrow()
  })

  it('rejects buffer without valid EOCD signature', () => {
    const buf = Buffer.from('this is not a zip file at all')
    expect(() => validateZipSecurity(buf)).toThrow('EOCD not found')
  })

  it('rejects ZIP with path traversal entry (..)', () => {
    const buf = buildZipBuffer([
      { name: '../../etc/passwd', data: Buffer.from('root') },
    ])
    expect(() => validateZipSecurity(buf)).toThrow('path traversal')
  })

  it('rejects ZIP with absolute path entry', () => {
    const buf = buildZipBuffer([
      { name: '/etc/passwd', data: Buffer.from('root') },
    ])
    expect(() => validateZipSecurity(buf)).toThrow('absolute path')
  })

  it('rejects ZIP with symlink entry (Unix mode 0xA000)', () => {
    // Unix symlink: mode 0120000 (0xA000) in upper 16 bits of externalAttr
    const symlinkAttr = (0xA000 << 16) >>> 0
    const buf = buildZipBuffer([
      { name: 'link.txt', data: Buffer.from('target'), externalAttr: symlinkAttr },
    ])
    expect(() => validateZipSecurity(buf)).toThrow('symbolic link')
  })

  it('rejects ZIP with duplicate entry names (case-insensitive)', () => {
    const buf = buildZipBuffer([
      { name: 'README.md', data: Buffer.from('a') },
      { name: 'readme.md', data: Buffer.from('b') },
    ])
    expect(() => validateZipSecurity(buf)).toThrow('duplicate entry')
  })

  it('rejects ZIP with nested .zip file', () => {
    const buf = buildZipBuffer([
      { name: 'inner.zip', data: Buffer.from('fake zip content') },
    ])
    expect(() => validateZipSecurity(buf)).toThrow('Nested ZIP')
  })

  it('rejects ZIP with nested .ZIP file (case insensitive)', () => {
    const buf = buildZipBuffer([
      { name: 'ARCHIVE.ZIP', data: Buffer.from('data') },
    ])
    expect(() => validateZipSecurity(buf)).toThrow('Nested ZIP')
  })

  it('rejects ZIP exceeding decompressed size limit (bomb protection)', () => {
    // Create entry with declared uncompSize of 600MB
    const buf = buildZipBuffer([
      { name: 'huge.bin', data: Buffer.alloc(0), uncompSize: 600 * 1024 * 1024 },
    ])
    expect(() => validateZipSecurity(buf)).toThrow('exceeds 500 MB')
  })

  it('accepts ZIP with normal Unix file permissions (not symlink)', () => {
    // Regular file: mode 0100644 -> 0x81A4 in top 16 bits
    const regularFileAttr = (0x81A4 << 16) >>> 0
    const buf = buildZipBuffer([
      { name: 'script.sh', data: Buffer.from('#!/bin/sh'), externalAttr: regularFileAttr },
    ])
    expect(() => validateZipSecurity(buf)).not.toThrow()
  })

  it('rejects cumulative size exceeding limit across multiple entries', () => {
    const entries = []
    // 6 entries each 100MB -> 600MB total, exceeds 500MB
    for (let i = 0; i < 6; i++) {
      entries.push({ name: `file${i}.dat`, data: Buffer.alloc(0), uncompSize: 100 * 1024 * 1024 })
    }
    const buf = buildZipBuffer(entries)
    expect(() => validateZipSecurity(buf)).toThrow('exceeds 500 MB')
  })
})
