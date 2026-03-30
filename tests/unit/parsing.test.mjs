import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { __test__ } from '../../skill/install/agentar_cli.mjs'

const { parseArgs, parseSimpleYaml, serializeSimpleYaml, validateSlug, validatePath } = __test__

// ─── parseArgs ──────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('returns null command and empty rest/flags for empty argv', () => {
    // argv.slice(2) on ['node', 'script'] yields []
    const result = parseArgs(['node', 'script'])
    expect(result.command).toBe(null)
    expect(result.rest).toEqual([])
    expect(result.flags).toEqual({})
    expect(result.apiBaseUrl).toBe(null)
  })

  it('parses a single positional command', () => {
    const result = parseArgs(['node', 'script', 'search'])
    expect(result.command).toBe('search')
    expect(result.rest).toEqual([])
  })

  it('parses command with positional arguments', () => {
    const result = parseArgs(['node', 'script', 'search', 'my-agent'])
    expect(result.command).toBe('search')
    expect(result.rest).toEqual(['my-agent'])
  })

  it('parses --api-base-url flag', () => {
    const result = parseArgs(['node', 'script', 'list', '--api-base-url', 'https://example.com'])
    expect(result.apiBaseUrl).toBe('https://example.com')
    expect(result.command).toBe('list')
  })

  it('parses --overwrite flag', () => {
    const result = parseArgs(['node', 'script', 'install', 'foo', '--overwrite'])
    expect(result.flags.overwrite).toBe(true)
    expect(result.command).toBe('install')
    expect(result.rest).toEqual(['foo'])
  })

  it('parses --include-memory flag', () => {
    const result = parseArgs(['node', 'script', 'export', '--include-memory'])
    expect(result.flags.includeMemory).toBe(true)
  })

  it('parses --skip-enrich flag', () => {
    const result = parseArgs(['node', 'script', 'export', '--skip-enrich'])
    expect(result.flags.skipEnrich).toBe(true)
  })

  it('parses --name flag with value', () => {
    const result = parseArgs(['node', 'script', 'install', '--name', 'my-agent'])
    expect(result.flags.name).toBe('my-agent')
  })

  it('parses --agent flag with value', () => {
    const result = parseArgs(['node', 'script', 'export', '--agent', 'writer'])
    expect(result.flags.agent).toBe('writer')
  })

  it('parses --api-key flag with value', () => {
    const result = parseArgs(['node', 'script', 'install', '--api-key', 'cck_abc123'])
    expect(result.flags.apiKey).toBe('cck_abc123')
  })

  it('parses -o shorthand for --output', () => {
    const result = parseArgs(['node', 'script', 'export', '-o', '/tmp/out.zip'])
    expect(result.flags.output).toBe('/tmp/out.zip')
  })

  it('parses --output long form', () => {
    const result = parseArgs(['node', 'script', 'export', '--output', '/tmp/out.zip'])
    expect(result.flags.output).toBe('/tmp/out.zip')
  })

  it('parses --agents flag', () => {
    const result = parseArgs(['node', 'script', 'team', 'export', '--agents', 'a,b,c'])
    expect(result.flags.agents).toBe('a,b,c')
  })

  it('parses --lead flag', () => {
    const result = parseArgs(['node', 'script', 'team', 'export', '--lead', 'writer'])
    expect(result.flags.lead).toBe('writer')
  })

  it('parses --team-name flag', () => {
    const result = parseArgs(['node', 'script', 'team', 'export', '--team-name', 'my-team'])
    expect(result.flags.teamName).toBe('my-team')
  })

  it('parses --latest flag', () => {
    const result = parseArgs(['node', 'script', 'rollback', '--latest'])
    expect(result.flags.latest).toBe(true)
  })

  it('parses -l shorthand for --limit', () => {
    const result = parseArgs(['node', 'script', 'search', 'test', '-l', '5'])
    expect(result.flags.limit).toBe(5)
  })

  it('parses --limit long form', () => {
    const result = parseArgs(['node', 'script', 'search', 'test', '--limit', '10'])
    expect(result.flags.limit).toBe(10)
  })

  it('parses -h shorthand for --help', () => {
    const result = parseArgs(['node', 'script', '-h'])
    expect(result.flags.help).toBe(true)
  })

  it('parses --help long form', () => {
    const result = parseArgs(['node', 'script', '--help'])
    expect(result.flags.help).toBe(true)
  })

  it('handles team subcommand with multiple positional args', () => {
    const result = parseArgs(['node', 'script', 'team', 'search', 'writing'])
    expect(result.command).toBe('team')
    expect(result.rest).toEqual(['search', 'writing'])
  })

  it('handles multiple flags combined', () => {
    const result = parseArgs([
      'node', 'script', 'export',
      '--agent', 'writer',
      '--output', '/tmp/out.zip',
      '--include-memory',
      '--skip-enrich',
    ])
    expect(result.command).toBe('export')
    expect(result.flags.agent).toBe('writer')
    expect(result.flags.output).toBe('/tmp/out.zip')
    expect(result.flags.includeMemory).toBe(true)
    expect(result.flags.skipEnrich).toBe(true)
  })

  it('ignores --api-base-url when no value follows', () => {
    // --api-base-url is last arg, no value follows -> condition i+1 < args.length fails
    const result = parseArgs(['node', 'script', '--api-base-url'])
    expect(result.apiBaseUrl).toBe(null)
    // it gets pushed to positional
    expect(result.command).toBe('--api-base-url')
  })

  it('treats unknown flags as positional arguments', () => {
    const result = parseArgs(['node', 'script', 'search', '--unknown-flag'])
    expect(result.command).toBe('search')
    expect(result.rest).toEqual(['--unknown-flag'])
  })

  it('parses --version flag with value', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--version', '1.2.3'])
    expect(result.flags.version).toBe('1.2.3')
    expect(result.command).toBe('install')
    expect(result.rest).toEqual(['my-agent'])
  })

  it('parses --version flag with semver+build metadata', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--version', '1.2.3+build.42'])
    expect(result.flags.version).toBe('1.2.3+build.42')
  })

  it('parses --version flag combined with --name', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--name', 'writer', '--version', '2.0.0'])
    expect(result.flags.version).toBe('2.0.0')
    expect(result.flags.name).toBe('writer')
    expect(result.rest).toEqual(['my-agent'])
  })

  it('does not set version flag when not provided', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--name', 'writer'])
    expect(result.flags.version).toBeUndefined()
  })

  // AC-103: --version combined with --overwrite
  it('parses --version flag combined with --overwrite', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--overwrite', '--version', '2.0.0'])
    expect(result.flags.version).toBe('2.0.0')
    expect(result.flags.overwrite).toBe(true)
    expect(result.rest).toEqual(['my-agent'])
  })

  // AC-104: --version combined with --api-key
  it('parses --version flag combined with --api-key', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--version', '1.0.0', '--api-key', 'cck_abc123'])
    expect(result.flags.version).toBe('1.0.0')
    expect(result.flags.apiKey).toBe('cck_abc123')
  })

  // AC-106: --version with no following argument
  it('ignores --version when no value follows (last arg)', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--version'])
    expect(result.flags.version).toBeUndefined()
    // --version is pushed to positional since the guard fails
    expect(result.command).toBe('install')
  })

  // AC-107: --version flag order independence
  it('parses --version flag regardless of position among args', () => {
    const result = parseArgs(['node', 'script', 'install', '--version', '1.0.0', 'my-agent', '--name', 'writer'])
    expect(result.flags.version).toBe('1.0.0')
    expect(result.flags.name).toBe('writer')
    expect(result.rest).toEqual(['my-agent'])
  })

  // AC-108: --version with pre-release semver
  it('parses --version flag with pre-release semver', () => {
    const result = parseArgs(['node', 'script', 'install', 'my-agent', '--version', '2.0.0-beta.1'])
    expect(result.flags.version).toBe('2.0.0-beta.1')
  })
})

// ─── parseSimpleYaml ────────────────────────────────────────────────────────

describe('parseSimpleYaml', () => {
  it('parses basic key: value pairs', () => {
    const result = parseSimpleYaml('name: my-team\nversion: 1.0')
    expect(result.name).toBe('my-team')
    expect(result.version).toBe('1.0')
  })

  it('strips quotes from values', () => {
    const result = parseSimpleYaml('name: "my-team"\ntitle: \'hello\'')
    expect(result.name).toBe('my-team')
    expect(result.title).toBe('hello')
  })

  it('skips comment lines', () => {
    const result = parseSimpleYaml('# this is a comment\nname: test\n  # indented comment')
    expect(result.name).toBe('test')
    expect(Object.keys(result).length).toBe(1)
  })

  it('skips empty lines', () => {
    const result = parseSimpleYaml('name: test\n\n\nversion: 2')
    expect(result.name).toBe('test')
    expect(result.version).toBe('2')
  })

  it('returns empty object for empty string', () => {
    const result = parseSimpleYaml('')
    expect(result).toEqual({})
  })

  it('returns empty object for whitespace-only input', () => {
    const result = parseSimpleYaml('   \n  \n   ')
    expect(result).toEqual({})
  })

  it('parses a key with no value as start of array', () => {
    const result = parseSimpleYaml('members:')
    expect(result.members).toEqual([])
  })

  it('parses array of objects', () => {
    const yaml = `members:
  - id: writer
    role: lead
  - id: reviewer
    role: member`
    const result = parseSimpleYaml(yaml)
    expect(result.members).toEqual([
      { id: 'writer', role: 'lead' },
      { id: 'reviewer', role: 'member' },
    ])
  })

  it('parses mixed top-level values and arrays', () => {
    const yaml = `team_name: alpha
collaboration_type: LEAD_FOLLOWER
lead: writer
members:
  - id: writer
    role: lead
  - id: coder
    role: member`
    const result = parseSimpleYaml(yaml)
    expect(result.team_name).toBe('alpha')
    expect(result.collaboration_type).toBe('LEAD_FOLLOWER')
    expect(result.lead).toBe('writer')
    expect(result.members).toHaveLength(2)
    expect(result.members[0].id).toBe('writer')
  })

  it('handles Windows-style CRLF line endings', () => {
    const result = parseSimpleYaml('name: test\r\nversion: 1')
    expect(result.name).toBe('test')
    expect(result.version).toBe('1')
  })

  it('handles array objects with multiple properties', () => {
    const yaml = `items:
  - id: a
    name: Alpha
    slug: alpha
  - id: b
    name: Beta
    slug: beta`
    const result = parseSimpleYaml(yaml)
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toEqual({ id: 'a', name: 'Alpha', slug: 'alpha' })
    expect(result.items[1]).toEqual({ id: 'b', name: 'Beta', slug: 'beta' })
  })

  it('handles value with colon in it', () => {
    const result = parseSimpleYaml('url: https://example.com')
    expect(result.url).toBe('https://example.com')
  })
})

// ─── serializeSimpleYaml ────────────────────────────────────────────────────

describe('serializeSimpleYaml', () => {
  it('serializes basic key-value pairs', () => {
    const result = serializeSimpleYaml({ name: 'test', version: '1' })
    expect(result).toBe('name: "test"\nversion: "1"\n')
  })

  it('serializes arrays of objects', () => {
    const result = serializeSimpleYaml({
      members: [
        { id: 'writer', role: 'lead' },
        { id: 'reviewer', role: 'member' },
      ],
    })
    expect(result).toContain('members:\n')
    expect(result).toContain('  - id: "writer"\n')
    expect(result).toContain('    role: "lead"\n')
    expect(result).toContain('  - id: "reviewer"\n')
    expect(result).toContain('    role: "member"\n')
  })

  it('serializes arrays of plain strings', () => {
    const result = serializeSimpleYaml({ tags: ['foo', 'bar'] })
    expect(result).toContain('tags:\n')
    expect(result).toContain('  - "foo"\n')
    expect(result).toContain('  - "bar"\n')
  })

  it('serializes empty object', () => {
    const result = serializeSimpleYaml({})
    expect(result).toBe('')
  })

  it('serializes empty array value', () => {
    const result = serializeSimpleYaml({ items: [] })
    expect(result).toBe('items:\n')
  })

  it('roundtrips: parse then serialize preserves data', () => {
    const original = `team_name: "alpha"
lead: "writer"
members:
  - id: "writer"
    role: "lead"
  - id: "coder"
    role: "member"
`
    const parsed = parseSimpleYaml(original)
    const serialized = serializeSimpleYaml(parsed)
    const reparsed = parseSimpleYaml(serialized)
    expect(reparsed.team_name).toBe(parsed.team_name)
    expect(reparsed.lead).toBe(parsed.lead)
    expect(reparsed.members).toEqual(parsed.members)
  })
})

// ─── validateSlug ───────────────────────────────────────────────────────────

describe('validateSlug', () => {
  let exitSpy
  let errorSpy

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('accepts a valid lowercase slug', () => {
    expect(() => validateSlug('my-agent')).not.toThrow()
  })

  it('accepts a slug with uppercase letters', () => {
    expect(() => validateSlug('MyAgent')).not.toThrow()
  })

  it('accepts a slug with numbers', () => {
    expect(() => validateSlug('agent42')).not.toThrow()
  })

  it('accepts a slug with underscores', () => {
    expect(() => validateSlug('my_agent')).not.toThrow()
  })

  it('accepts a slug with hyphens', () => {
    expect(() => validateSlug('my-agent-v2')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => validateSlug('')).toThrow('process.exit(1)')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('rejects null', () => {
    expect(() => validateSlug(null)).toThrow('process.exit(1)')
  })

  it('rejects undefined', () => {
    expect(() => validateSlug(undefined)).toThrow('process.exit(1)')
  })

  it('rejects slug starting with hyphen', () => {
    expect(() => validateSlug('-bad-slug')).toThrow('process.exit(1)')
  })

  it('rejects slug starting with underscore', () => {
    expect(() => validateSlug('_bad-slug')).toThrow('process.exit(1)')
  })

  it('rejects slug with spaces', () => {
    expect(() => validateSlug('my agent')).toThrow('process.exit(1)')
  })

  it('rejects slug with special characters', () => {
    expect(() => validateSlug('my@agent!')).toThrow('process.exit(1)')
  })

  it('rejects slug with dots', () => {
    expect(() => validateSlug('my.agent')).toThrow('process.exit(1)')
  })

  it('rejects slug with path traversal attempt', () => {
    expect(() => validateSlug('../etc/passwd')).toThrow('process.exit(1)')
  })
})

// ─── validatePath ───────────────────────────────────────────────────────────

describe('validatePath', () => {
  let exitSpy
  let errorSpy

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('accepts a normal file path', () => {
    expect(() => validatePath('/home/user/file.txt')).not.toThrow()
  })

  it('accepts a relative path', () => {
    expect(() => validatePath('some/dir/file.txt')).not.toThrow()
  })

  it('accepts path with dots', () => {
    expect(() => validatePath('../parent/file.txt')).not.toThrow()
  })

  it('rejects path with semicolon (command injection)', () => {
    expect(() => validatePath('/tmp/foo; rm -rf /')).toThrow('process.exit(1)')
  })

  it('rejects path with pipe', () => {
    expect(() => validatePath('/tmp/foo | cat')).toThrow('process.exit(1)')
  })

  it('rejects path with ampersand', () => {
    expect(() => validatePath('/tmp/foo & echo bad')).toThrow('process.exit(1)')
  })

  it('rejects path with backtick', () => {
    expect(() => validatePath('/tmp/`whoami`')).toThrow('process.exit(1)')
  })

  it('rejects path with dollar sign', () => {
    expect(() => validatePath('/tmp/$HOME')).toThrow('process.exit(1)')
  })

  it('rejects path with parentheses', () => {
    expect(() => validatePath('/tmp/$(cmd)')).toThrow('process.exit(1)')
  })

  it('rejects path with curly braces', () => {
    expect(() => validatePath('/tmp/{a,b}')).toThrow('process.exit(1)')
  })

  it('rejects path with hash', () => {
    expect(() => validatePath('/tmp/file#tag')).toThrow('process.exit(1)')
  })

  it('rejects path with angle brackets', () => {
    expect(() => validatePath('/tmp/file<>out')).toThrow('process.exit(1)')
  })
})
