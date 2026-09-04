import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    getAgentConsoleCommandDefinition,
    getAgentConsoleCommandName,
    parseAgentConsoleCommandArguments,
    formatAgentConsoleCommandDiagnostics,
    formatAgentConsoleCommandArgumentTemplate,
    tokenizeAgentConsoleCommandArguments
} from '../src';

@Suite('P282 command parser single path')
export class P282CommandParserSinglePathTest {

    // ── enriched diagnostics: tokenIndex / expected / suggestion ────────────

    @Test('missing required arg reports tokenIndex, expected, suggestion')
    missingArgDiagnostics() {
        const def = getAgentConsoleCommandDefinition('/search')!;
        const result = parseAgentConsoleCommandArguments(def, '');
        expect(result.diagnostics).toHaveLength(1);
        const d = result.diagnostics[0];
        expect(d.code).toEqual('missing');
        expect(d.tokenIndex).toEqual(0);
        expect(d.expected).toEqual('<query>');
        expect(d.suggestion).toContain('Usage');
    }

    @Test('invalid enum reports the offending token index and valid alternatives')
    invalidEnumDiagnostics() {
        const def = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [{ name: 'mode', type: 'enum' as const, values: ['fast', 'safe'], required: true }]
        };
        const result = parseAgentConsoleCommandArguments(def, 'slow');
        expect(result.diagnostics).toHaveLength(1);
        const d = result.diagnostics[0];
        expect(d.code).toEqual('invalid');
        expect(d.tokenIndex).toEqual(0);
        expect(d.expected).toEqual('fast|safe');
        expect(d.suggestion).toEqual('Did you mean fast or safe?');
    }

    @Test('extra arg reports the first unexpected token index')
    extraArgDiagnostics() {
        const def = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [{ name: 'value' }]
        };
        const result = parseAgentConsoleCommandArguments(def, 'one two three');
        expect(result.diagnostics).toHaveLength(1);
        const d = result.diagnostics[0];
        expect(d.code).toEqual('extra');
        expect(d.tokenIndex).toEqual(1);
        expect(d.suggestion).toContain('Remove');
    }

    // ── formatAgentConsoleCommandDiagnostics ────────────────────────────────

    @Test('formatAgentConsoleCommandDiagnostics appends suggestion to message')
    formatDiagnostics() {
        const def = getAgentConsoleCommandDefinition('/search')!;
        const diags = parseAgentConsoleCommandArguments(def, '').diagnostics;
        const line = formatAgentConsoleCommandDiagnostics(diags);
        expect(line).toContain('Missing required argument <query>.');
        expect(line.trim()).toMatch(/Missing required argument <query>\. Usage:/);
    }

    @Test('formatAgentConsoleCommandDiagnostics joins multiple diagnostics')
    formatMultipleDiagnostics() {
        const def = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [{ name: 'mode', type: 'enum' as const, values: ['a', 'b'] }, { name: 'v' }]
        };
        const diags = parseAgentConsoleCommandArguments(def, 'zzz extra tron').diagnostics;
        expect(diags.length).toBeGreaterThan(1);
        const codes = diags.map(d => d.code);
        expect(codes).toContain('invalid');
        expect(codes).toContain('extra');
        expect(formatAgentConsoleCommandDiagnostics(diags)).toContain('Unexpected argument');
    }

    // ── tokenizer: quotes and CJK ───────────────────────────────────────────

    @Test('tokenizer keeps quoted values intact')
    tokenizerQuotes() {
        expect(tokenizeAgentConsoleCommandArguments('"release notes" src/a.ts')).toEqual(['release notes', 'src/a.ts']);
        expect(tokenizeAgentConsoleCommandArguments("'single quoted' bare")).toEqual(['single quoted', 'bare']);
        expect(tokenizeAgentConsoleCommandArguments('a\\ b c')).toEqual(['a b', 'c']);
    }

    @Test('tokenizer handles CJK tokens without splitting')
    tokenizerCjk() {
        expect(tokenizeAgentConsoleCommandArguments('搜索 会话 记录')).toEqual(['搜索', '会话', '记录']);
        expect(tokenizeAgentConsoleCommandArguments('标题 "项目 计划"')).toEqual(['标题', '项目 计划']);
    }

    // ── per-category command contracts ──────────────────────────────────────

    @Test('session category: /search requires query, accepts quoted CJK variadic')
    searchContract() {
        const def = getAgentConsoleCommandDefinition('/search')!;
        expect(parseAgentConsoleCommandArguments(def, '').diagnostics[0].code).toEqual('missing');
        expect(parseAgentConsoleCommandArguments(def, '会话 记录').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(def, '"quoted query"').resolved).toEqual(['quoted query']);
    }

    @Test('display category: /yolo /display /raw validate enum members')
    displayEnumContracts() {
        const yolo = getAgentConsoleCommandDefinition('/yolo')!;
        expect(parseAgentConsoleCommandArguments(yolo, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(yolo, 'on').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(yolo, 'off').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(yolo, 'maybe').diagnostics[0].code).toEqual('invalid');

        const display = getAgentConsoleCommandDefinition('/display')!;
        ['on', 'off', 'show', 'hide', 'critical'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(display, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(display, 'bogus').diagnostics[0].code).toEqual('invalid');

        const raw = getAgentConsoleCommandDefinition('/raw')!;
        ['on', 'off', 'show', 'hide'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(raw, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(raw, 'never').diagnostics[0].code).toEqual('invalid');
    }

    @Test('session category: /model /snapshot accept optional variadic values')
    sessionOptionalContracts() {
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/model')!, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/model')!, 'deepseek-v4-pro').resolved).toEqual(['deepseek-v4-pro']);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/snapshot')!, 'release-1').diagnostics).toEqual([]);
    }

    @Test('review category: /review /diff keep tail variadic')
    reviewContracts() {
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/review')!, 'task-7').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/diff')!, '--staged src/a.ts').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/diff')!, '').diagnostics).toEqual([]);
    }

    @Test('aliases resolve to canonical definition before parsing')
    aliasResolvesForParse() {
        expect(getAgentConsoleCommandName('/q')).toEqual('/quit');
        expect(getAgentConsoleCommandDefinition('/q')).toBeDefined();
        // aliases carry no args schema but inherit canonical behavior at dispatch
        const canonical = getAgentConsoleCommandName('/q');
        expect(canonical).toEqual('/quit');
    }

    @Test('registry to handler coverage: every definition resolves a parseable contract')
    registryCoverage() {
        // Every command with an args schema must parse a representative value without crashing,
        // and formatAgentConsoleCommandArgumentTemplate must render for schema'd commands.
        const { AGENT_CONSOLE_COMMAND_DEFINITIONS } = require('../src');
        AGENT_CONSOLE_COMMAND_DEFINITIONS.forEach((def: any) => {
            expect(() => parseAgentConsoleCommandArguments(def, '')).not.toThrow();
            if (def.args?.length) {
                expect(formatAgentConsoleCommandArgumentTemplate(def)).toBeTruthy();
            }
        });
    }
}
