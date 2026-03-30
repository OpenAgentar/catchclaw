import { describe, it, expect } from 'vitest'
import { __test__ } from '../../skill/install/agentar_cli.mjs'

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
