import { describe, it, expect } from 'vitest'
import { __test__ } from '../../skill/install/agentar_cli.mjs'

const { describeNonZipDownload } = __test__

describe('smoke test', () => {
  it('vitest is working', () => {
    expect(1 + 1).toBe(2)
  })

  it('test exports are available', () => {
    expect(__test__).toBeDefined()
    expect(typeof __test__.parseArgs).toBe('function')
    expect(typeof __test__.parseSimpleYaml).toBe('function')
    expect(typeof __test__.serializeSimpleYaml).toBe('function')
    expect(typeof __test__.validateSlug).toBe('function')
    expect(typeof __test__.isSensitiveFile).toBe('function')
    expect(typeof __test__.decodeCP437).toBe('function')
    expect(typeof __test__.crc32).toBe('function')
    expect(typeof __test__.parseZipEntries).toBe('function')
    expect(typeof __test__.validateZipSecurity).toBe('function')
    expect(typeof __test__.buildTeamBlock).toBe('function')
    expect(typeof __test__.validatePath).toBe('function')
    expect(typeof __test__.describeNonZipDownload).toBe('function')
    expect(typeof __test__.extractZipEntry).toBe('function')
    expect(typeof __test__.extractZipEntryText).toBe('function')
  })
})

// ─── describeNonZipDownload ────────────────────────────────────────────────

describe('describeNonZipDownload', () => {
  it('detects JSON error response from backend (version not found)', () => {
    const json = JSON.stringify({
      success: false,
      errorMessage: 'Package not found: claw_abc123',
      errorCode: 'NOT_FOUND'
    })
    const buf = Buffer.from(json, 'utf-8')
    const msg = describeNonZipDownload(buf)
    expect(msg).toContain('API returned JSON error')
    expect(msg).toContain('Package not found')
  })

  it('detects JSON error response with message field', () => {
    const json = JSON.stringify({
      success: false,
      message: 'Version 99.0.0 not found'
    })
    const buf = Buffer.from(json, 'utf-8')
    const msg = describeNonZipDownload(buf)
    expect(msg).toContain('API returned JSON error')
    expect(msg).toContain('Version 99.0.0 not found')
  })

  it('returns generic message for small non-zip buffer', () => {
    const buf = Buffer.from('hi', 'utf-8')
    const msg = describeNonZipDownload(buf)
    expect(msg).toContain('too small')
  })

  it('returns header info for non-zip binary', () => {
    const buf = Buffer.alloc(100, 0x41) // 100 bytes of 'A'
    const msg = describeNonZipDownload(buf)
    expect(msg).toContain('Not a zip file')
  })
})
