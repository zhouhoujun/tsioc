import expect = require('expect');
import * as fs from 'fs';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import {
    AGENT_CONSOLE_MENTION_RANGE_MAX_LINES,
    parseAgentConsoleMentionRange
} from '../src/AgentConsoleWorkspaceMentions';
import { parseAgentConsoleMentionNames } from '../src/AgentConsoleSuggestions';
import { enrichPromptWithMentions } from '../src/AgentConsolePromptMentions';
import { createWorkspaceFixture, createWorkspaceMentionsProvider } from './_helpers';

function writeSample(workspace: string, lines: number): string {
    const body = Array.from({ length: lines }, (_value, index) => `line ${index + 1}`).join('\n');
    fs.writeFileSync(path.join(workspace, 'src', 'sample.ts'), `${body}\n`, 'utf8');
    return 'src/sample.ts';
}

@Suite('workspace mention line ranges')
export class WorkspaceMentionRangeTest {
    @Test('parses #Lx-Ly, #x-y and single-line ranges')
    parsesRanges() {
        expect(parseAgentConsoleMentionRange('src/a.ts#L2-L4')).toEqual({ path: 'src/a.ts', start: 2, end: 4 });
        expect(parseAgentConsoleMentionRange('src/a.ts#2-4')).toEqual({ path: 'src/a.ts', start: 2, end: 4 });
        expect(parseAgentConsoleMentionRange('src/a.ts#L3')).toEqual({ path: 'src/a.ts', start: 3, end: 3 });
        expect(parseAgentConsoleMentionRange('src/a.ts#0-2')).toEqual(undefined);
        expect(parseAgentConsoleMentionRange('src/a.ts')).toEqual(undefined);
        // Mention parsing keeps the range attached for the resolver.
        expect(parseAgentConsoleMentionNames('see @src/a.ts#L2-L4 now')).toEqual(['src/a.ts#L2-L4']);
    }

    @Test('reads only the requested lines and clamps oversized ranges')
    async resolvesLineRange() {
        const workspace = createWorkspaceFixture();
        const provider = createWorkspaceMentionsProvider();
        try {
            const file = writeSample(workspace, 6);
            const context = await provider.resolveContext(workspace, `${file}#L2-L4`);
            expect(context[0]).toEqual('src/sample.ts (lines 2-4):');
            expect(context.slice(1)).toEqual(['2 | line 2', '3 | line 3', '4 | line 4']);

            expect((await provider.resolveContext(workspace, `${file}#3`))[0]).toEqual('src/sample.ts (lines 3-3):');

            const big = writeSample(workspace, AGENT_CONSOLE_MENTION_RANGE_MAX_LINES + 50);
            const capped = await provider.resolveContext(workspace, `${big}#1-9999`);
            expect(capped[0]).toEqual(`src/sample.ts (lines 1-${AGENT_CONSOLE_MENTION_RANGE_MAX_LINES}):`);
            expect(capped.length).toEqual(AGENT_CONSOLE_MENTION_RANGE_MAX_LINES + 1);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('out-of-range and missing files fall back to the path or nothing')
    async fallsBack() {
        const workspace = createWorkspaceFixture();
        const provider = createWorkspaceMentionsProvider();
        try {
            const file = writeSample(workspace, 4);
            // A start beyond EOF keeps the mention usable as a path hint.
            expect(await provider.resolveContext(workspace, `${file}#99-120`)).toEqual(['src/sample.ts']);
            expect(await provider.resolveContext(workspace, 'src/missing.ts#1-2')).toEqual([]);
            // No range keeps the previous path-only behavior.
            expect(await provider.resolveContext(workspace, file)).toEqual(['src/sample.ts']);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('suggestions ignore a trailing range suffix')
    async suggestionsIgnoreRange() {
        const workspace = createWorkspaceFixture();
        const provider = createWorkspaceMentionsProvider();
        try {
            writeSample(workspace, 3);
            const values = (await provider.resolveSuggestions(workspace, '@src/sa#L1', 12, []))
                .map(item => item.value);
            expect(values).toContain('@src/sample.ts');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('prompt enrichment embeds the selected range in the mention context')
    async enrichesPrompt() {
        const workspace = createWorkspaceFixture();
        const provider = createWorkspaceMentionsProvider();
        try {
            const file = writeSample(workspace, 5);
            const prompt = await enrichPromptWithMentions({
                state: { workspace, sessionId: 's', tools: [], provider: 'p', model: 'm' },
                mentionCatalog: [],
                workspaceMentionsProvider: provider,
                resolveApps: () => []
            } as any, `review @${file}#L2-L3`);
            expect(prompt.startsWith('[Mention Context]')).toEqual(true);
            expect(prompt).toContain('src/sample.ts (lines 2-3):');
            expect(prompt).toContain('2 | line 2');
            expect(prompt).toContain('3 | line 3');
            expect(prompt).toContain(`review @${file}#L2-L3`);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
