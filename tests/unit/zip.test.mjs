import { describe, it, expect } from 'vitest'
import { __test__ } from '../../skill/install/agentar_cli.mjs'

const { crc32, decodeCP437, parseZipEntries, buildTeamBlock } = __test__

// ─── Helper: build a minimal valid ZIP buffer in memory ─────────────────────

function buildZipBuffer(entries) {
  const parts = []
  const centralDir = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8')
    const data = entry.data || Buffer.alloc(0)
    const compSize = data.length
    const uncompSize = data.length
    const method = entry.method ?? 0

    const lh = Buffer.alloc(30 + nameBuf.length)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt16LE(0x800, 6)
    lh.writeUInt16LE(method, 8)
    lh.writeUInt32LE(0, 14)             // CRC
    lh.writeUInt32LE(compSize, 18)
    lh.writeUInt32LE(uncompSize, 22)
    lh.writeUInt16LE(nameBuf.length, 26)
    nameBuf.copy(lh, 30)
    parts.push(lh, data)

    const cd = Buffer.alloc(46 + nameBuf.length)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4)
    cd.writeUInt16LE(20, 6)
    cd.writeUInt16LE(0x800, 8)
    cd.writeUInt16LE(method, 10)
    cd.writeUInt32LE(0, 16)
    cd.writeUInt32LE(compSize, 20)
    cd.writeUInt32LE(uncompSize, 24)
    cd.writeUInt16LE(nameBuf.length, 28)
    cd.writeUInt32LE(offset, 42)
    nameBuf.copy(cd, 46)
    centralDir.push(cd)

    offset += lh.length + data.length
  }

  const cdBuf = Buffer.concat(centralDir)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)

  return Buffer.concat([...parts, cdBuf, eocd])
}

// ─── crc32 ──────────────────────────────────────────────────────────────────

describe('crc32', () => {
  it('returns 0x00000000 for empty buffer', () => {
    const result = crc32(Buffer.alloc(0))
    expect(result).toBe(0x00000000)
  })

  it('computes correct CRC32 for ASCII string "123456789"', () => {
    // Known CRC32 of "123456789" is 0xCBF43926
    const buf = Buffer.from('123456789', 'ascii')
    const result = crc32(buf)
    expect(result).toBe(0xCBF43926)
  })

  it('computes correct CRC32 for single byte', () => {
    // CRC32 of a single null byte
    const buf = Buffer.from([0x00])
    const result = crc32(buf)
    // Known: CRC32(0x00) = 0xD202EF8D
    expect(result).toBe(0xD202EF8D)
  })

  it('computes correct CRC32 for "hello"', () => {
    const buf = Buffer.from('hello', 'ascii')
    const result = crc32(buf)
    // Known CRC32 of "hello" is 0x3610A686
    expect(result).toBe(0x3610A686)
  })

  it('returns unsigned 32-bit integer', () => {
    const buf = Buffer.from('test', 'ascii')
    const result = crc32(buf)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(0xFFFFFFFF)
  })

  it('is deterministic -- same input always gives same output', () => {
    const buf = Buffer.from('deterministic check', 'ascii')
    const a = crc32(buf)
    const b = crc32(buf)
    expect(a).toBe(b)
  })

  it('produces different values for different inputs', () => {
    const a = crc32(Buffer.from('aaa'))
    const b = crc32(Buffer.from('bbb'))
    expect(a).not.toBe(b)
  })
})

// ─── decodeCP437 ────────────────────────────────────────────────────────────

describe('decodeCP437', () => {
  it('decodes ASCII range (0-127) as standard ASCII', () => {
    const buf = Buffer.from('Hello', 'ascii')
    expect(decodeCP437(buf)).toBe('Hello')
  })

  it('decodes empty buffer to empty string', () => {
    expect(decodeCP437(Buffer.alloc(0))).toBe('')
  })

  it('decodes single ASCII character', () => {
    const buf = Buffer.from([0x41]) // 'A'
    expect(decodeCP437(buf)).toBe('A')
  })

  it('decodes byte 0x80 (C with cedilla) from CP437 high table', () => {
    // CP437 byte 128 (0x80) = U+00C7 (C with cedilla)
    const buf = Buffer.from([0x80])
    expect(decodeCP437(buf)).toBe('\u00C7')
  })

  it('decodes byte 0x81 (u with diaeresis) from CP437 high table', () => {
    // CP437 byte 129 (0x81) = U+00FC
    const buf = Buffer.from([0x81])
    expect(decodeCP437(buf)).toBe('\u00FC')
  })

  it('decodes mixed ASCII and high bytes', () => {
    // 'A' (0x41) + CP437 0x80 (C-cedilla) + 'B' (0x42)
    const buf = Buffer.from([0x41, 0x80, 0x42])
    expect(decodeCP437(buf)).toBe('A\u00C7B')
  })

  it('decodes byte 0xFF (non-breaking space) from CP437 high table', () => {
    // CP437 byte 255 (0xFF) = U+00A0 (non-breaking space)
    const buf = Buffer.from([0xFF])
    expect(decodeCP437(buf)).toBe('\u00A0')
  })

  it('decodes byte 0xE1 (beta/eszett) from CP437 high table', () => {
    // CP437 byte 0xE1 = U+00DF (sharp s / eszett)
    const buf = Buffer.from([0xE1])
    expect(decodeCP437(buf)).toBe('\u00DF')
  })
})

// ─── parseZipEntries ────────────────────────────────────────────────────────

describe('parseZipEntries', () => {
  it('throws for non-ZIP data', () => {
    const buf = Buffer.from('not a zip file')
    expect(() => parseZipEntries(buf)).toThrow('EOCD not found')
  })

  it('returns empty array for empty ZIP', () => {
    const buf = buildZipBuffer([])
    const entries = parseZipEntries(buf)
    expect(entries).toEqual([])
  })

  it('parses a single stored entry', () => {
    const data = Buffer.from('hello world')
    const buf = buildZipBuffer([{ name: 'test.txt', data }])
    const entries = parseZipEntries(buf)
    expect(entries).toHaveLength(1)
    expect(entries[0].entryName).toBe('test.txt')
    expect(entries[0].method).toBe(0) // stored
    expect(entries[0].compSize).toBe(data.length)
    expect(entries[0].uncompSize).toBe(data.length)
  })

  it('parses multiple entries', () => {
    const buf = buildZipBuffer([
      { name: 'a.txt', data: Buffer.from('aaa') },
      { name: 'b.txt', data: Buffer.from('bbb') },
      { name: 'c/d.txt', data: Buffer.from('ccc') },
    ])
    const entries = parseZipEntries(buf)
    expect(entries).toHaveLength(3)
    expect(entries[0].entryName).toBe('a.txt')
    expect(entries[1].entryName).toBe('b.txt')
    expect(entries[2].entryName).toBe('c/d.txt')
  })

  it('correctly reports entry sizes', () => {
    const data = Buffer.from('0123456789')
    const buf = buildZipBuffer([{ name: 'numbers.txt', data }])
    const entries = parseZipEntries(buf)
    expect(entries[0].compSize).toBe(10)
    expect(entries[0].uncompSize).toBe(10)
  })

  it('parses entries with nested directory paths', () => {
    const buf = buildZipBuffer([
      { name: 'src/', data: Buffer.alloc(0) },
      { name: 'src/lib/', data: Buffer.alloc(0) },
      { name: 'src/lib/main.js', data: Buffer.from('console.log("hi")') },
    ])
    const entries = parseZipEntries(buf)
    expect(entries).toHaveLength(3)
    expect(entries[2].entryName).toBe('src/lib/main.js')
  })

  it('reports localOffset for each entry', () => {
    const buf = buildZipBuffer([
      { name: 'first.txt', data: Buffer.from('aaa') },
      { name: 'second.txt', data: Buffer.from('bbbb') },
    ])
    const entries = parseZipEntries(buf)
    expect(entries[0].localOffset).toBe(0)
    // second entry offset = 30 + len("first.txt") + 3 = 30 + 9 + 3 = 42
    expect(entries[1].localOffset).toBe(42)
  })

  it('throws for buffer too small to contain EOCD', () => {
    // EOCD is 22 bytes minimum. Buffer smaller than that should fail.
    const buf = Buffer.alloc(10)
    expect(() => parseZipEntries(buf)).toThrow('EOCD not found')
  })
})

// ─── buildTeamBlock ─────────────────────────────────────────────────────────

describe('buildTeamBlock', () => {
  it('builds a team block with begin/end markers', () => {
    const result = buildTeamBlock(
      'alpha',
      { collaboration_type: 'LEAD_FOLLOWER', lead: 'writer' },
      [
        { id: 'writer', role: 'lead', local_path: '/path/to/writer' },
        { id: 'coder', role: 'member', local_path: '/path/to/coder' },
      ],
    )
    expect(result).toContain('<!-- TEAM:alpha:BEGIN -->')
    expect(result).toContain('<!-- TEAM:alpha:END -->')
    expect(result).toContain('## Team: alpha')
    expect(result).toContain('Collaboration: LEAD_FOLLOWER')
    expect(result).toContain('Lead: writer')
    expect(result).toContain('- **writer** (lead): /path/to/writer')
    expect(result).toContain('- **coder** (member): /path/to/coder')
    expect(result).toContain('agentToAgent')
  })

  it('defaults collaboration_type to LEAD_FOLLOWER when not provided', () => {
    const result = buildTeamBlock('beta', {}, [])
    expect(result).toContain('Collaboration: LEAD_FOLLOWER')
  })

  it('defaults lead to empty string when not provided', () => {
    const result = buildTeamBlock('gamma', {}, [])
    expect(result).toContain('Lead: \n')
  })

  it('handles empty members array', () => {
    const result = buildTeamBlock('empty', { lead: 'none' }, [])
    expect(result).toContain('### Teammates')
    // No member lines between Teammates header and agentToAgent line
    expect(result).not.toContain('- **')
  })

  it('handles member with missing local_path', () => {
    const result = buildTeamBlock(
      'test',
      { lead: 'a' },
      [{ id: 'a', role: 'lead' }],
    )
    // Should not crash, local_path defaults to ""
    expect(result).toContain('- **a** (lead): ')
  })

  it('preserves team name in markers for unique identification', () => {
    const r1 = buildTeamBlock('team-one', {}, [])
    const r2 = buildTeamBlock('team-two', {}, [])
    expect(r1).toContain('TEAM:team-one:BEGIN')
    expect(r2).toContain('TEAM:team-two:BEGIN')
    expect(r1).not.toContain('team-two')
    expect(r2).not.toContain('team-one')
  })
})

// Update destructuring to include new exports
const { describeNonZipDownload, extractZipEntry, extractZipEntryText } = __test__

// ─── describeNonZipDownload ─────────────────────────────────────────────────

describe('describeNonZipDownload', () => {
  it('identifies JSON API error responses', () => {
    const json = JSON.stringify({ success: false, errorMessage: 'Not found' })
    const buf = Buffer.from(json)
    const result = describeNonZipDownload(buf)
    expect(result).toContain('API returned JSON error')
    expect(result).toContain('Not found')
  })

  it('uses message field as fallback for JSON errors', () => {
    const json = JSON.stringify({ success: false, message: 'Server error' })
    const buf = Buffer.from(json)
    const result = describeNonZipDownload(buf)
    expect(result).toContain('Server error')
  })

  it('uses error field as second fallback for JSON errors', () => {
    const json = JSON.stringify({ success: false, error: 'Bad request' })
    const buf = Buffer.from(json)
    const result = describeNonZipDownload(buf)
    expect(result).toContain('Bad request')
  })

  it('stringifies JSON when no known error fields exist', () => {
    const json = JSON.stringify({ success: false, code: 500 })
    const buf = Buffer.from(json)
    const result = describeNonZipDownload(buf)
    expect(result).toContain('API returned JSON error')
  })

  it('handles JSON array response', () => {
    const json = JSON.stringify([{ error: 'something' }])
    const buf = Buffer.from(json)
    // JSON array, parsed OK but not { success: false }, so falls through
    const result = describeNonZipDownload(buf)
    expect(result).toContain('Not a zip file')
  })

  it('reports download too small for tiny buffers', () => {
    const buf = Buffer.from([0x00, 0x01])
    const result = describeNonZipDownload(buf)
    expect(result).toContain('too small')
    expect(result).toContain('2 bytes')
  })

  it('reports not a zip file for non-JSON non-ZIP content', () => {
    const buf = Buffer.from('<!DOCTYPE html><html>error page</html>')
    const result = describeNonZipDownload(buf)
    expect(result).toContain('Not a zip file')
    expect(result).toContain('missing PK')
  })

  it('handles invalid JSON gracefully (falls through to not-a-zip)', () => {
    const buf = Buffer.from('{ broken json here')
    const result = describeNonZipDownload(buf)
    expect(result).toContain('Not a zip file')
  })

  it('handles JSON with success: true (not an error)', () => {
    const json = JSON.stringify({ success: true, data: 'ok' })
    const buf = Buffer.from(json)
    const result = describeNonZipDownload(buf)
    // success: true means it's not an API error, falls through
    expect(result).toContain('Not a zip file')
  })
})

// ─── extractZipEntry ────────────────────────────────────────────────────────

describe('extractZipEntry', () => {
  it('extracts a stored (method 0) entry from ZIP buffer', () => {
    const content = Buffer.from('hello world')
    const zipBuf = buildZipBuffer([{ name: 'test.txt', data: content }])
    const entries = parseZipEntries(zipBuf)
    const extracted = extractZipEntry(zipBuf, entries[0])
    expect(extracted.toString('utf-8')).toBe('hello world')
  })

  it('extracts binary data correctly', () => {
    const binary = Buffer.from([0x00, 0xFF, 0x42, 0xAB, 0xCD])
    const zipBuf = buildZipBuffer([{ name: 'data.bin', data: binary }])
    const entries = parseZipEntries(zipBuf)
    const extracted = extractZipEntry(zipBuf, entries[0])
    expect(Buffer.compare(extracted, binary)).toBe(0)
  })

  it('extracts the correct entry when multiple exist', () => {
    const zipBuf = buildZipBuffer([
      { name: 'first.txt', data: Buffer.from('FIRST') },
      { name: 'second.txt', data: Buffer.from('SECOND') },
      { name: 'third.txt', data: Buffer.from('THIRD') },
    ])
    const entries = parseZipEntries(zipBuf)
    expect(extractZipEntry(zipBuf, entries[0]).toString()).toBe('FIRST')
    expect(extractZipEntry(zipBuf, entries[1]).toString()).toBe('SECOND')
    expect(extractZipEntry(zipBuf, entries[2]).toString()).toBe('THIRD')
  })

  it('extracts empty file entry', () => {
    const zipBuf = buildZipBuffer([{ name: 'empty.txt', data: Buffer.alloc(0) }])
    const entries = parseZipEntries(zipBuf)
    const extracted = extractZipEntry(zipBuf, entries[0])
    expect(extracted.length).toBe(0)
  })
})

// ─── extractZipEntryText ────────────────────────────────────────────────────

describe('extractZipEntryText', () => {
  it('extracts entry content as UTF-8 string', () => {
    const zipBuf = buildZipBuffer([{ name: 'test.txt', data: Buffer.from('hello') }])
    const entries = parseZipEntries(zipBuf)
    const text = extractZipEntryText(zipBuf, entries[0])
    expect(text).toBe('hello')
  })

  it('handles UTF-8 content with special characters', () => {
    const content = 'Hello World -- special chars'
    const zipBuf = buildZipBuffer([{ name: 'utf8.txt', data: Buffer.from(content, 'utf-8') }])
    const entries = parseZipEntries(zipBuf)
    expect(extractZipEntryText(zipBuf, entries[0])).toBe(content)
  })

  it('extracts multiline text content', () => {
    const content = 'line 1\nline 2\nline 3'
    const zipBuf = buildZipBuffer([{ name: 'multi.txt', data: Buffer.from(content) }])
    const entries = parseZipEntries(zipBuf)
    expect(extractZipEntryText(zipBuf, entries[0])).toBe(content)
  })

  it('returns empty string for empty file', () => {
    const zipBuf = buildZipBuffer([{ name: 'empty.txt', data: Buffer.alloc(0) }])
    const entries = parseZipEntries(zipBuf)
    expect(extractZipEntryText(zipBuf, entries[0])).toBe('')
  })
})
