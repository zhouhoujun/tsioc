import expect = require('expect');
import * as fs from 'fs';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';

function sourceFiles(root: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const target = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...sourceFiles(target));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            files.push(target);
        }
    }
    return files;
}

function relativeFilesWithMatch(root: string, pattern: RegExp): string[] {
    return sourceFiles(root)
        .filter(file => pattern.test(fs.readFileSync(file, 'utf8')))
        .map(file => path.relative(root, file).replace(/\\/g, '/'));
}

@Suite('agent UI architecture contracts')
export class ArchitectureContractTest {
    private readonly agentUiSrc = path.resolve(__dirname, '../src');
    private readonly componentsSrc = path.resolve(__dirname, '../../../components/src');
    private readonly commonSrc = path.resolve(__dirname, '../../../components/common/src');
    private readonly consoleSrc = path.resolve(__dirname, '../../../components/console/src');
    private readonly htmlSrc = path.resolve(__dirname, '../../../components/html/src');
    private readonly consoleAdapter = path.resolve(__dirname, '../console');
    private readonly webAdapter = path.resolve(__dirname, '../web-console');

    @Test('agent-ui source does not import console implementation or Node modules directly')
    async agentUiImportsRemainPlatformNeutral() {
        const forbiddenImport = /(?:from\s*|import\s*\(|require\s*\()\s*['"](?:@tsdi\/components\/(?:console|html)|node:[^'"]+|buffer|child_process|crypto|events|fs|http|https|net|os|path|stream|tls|url|util|worker_threads)['"]/;
        expect(relativeFilesWithMatch(this.agentUiSrc, forbiddenImport)).toEqual([]);
    }

    @Test('console component source does not import Node modules directly')
    async consoleImportsRemainPlatformNeutral() {
        const nodeImport = /(?:from\s*|import\s*\(|require\s*\()\s*['"](?:node:[^'"]+|buffer|child_process|crypto|events|fs|http|https|net|os|path|stream|tls|url|util|worker_threads)['"]/;
        expect(relativeFilesWithMatch(this.consoleSrc, nodeImport)).toEqual([]);
        expect(relativeFilesWithMatch(this.consoleSrc, /\brequire\s*\(/)).toEqual([]);
        expect(relativeFilesWithMatch(this.consoleSrc, /globalThis\s+as\s+any/)).toEqual([]);
    }

    @Test('HTML and console renderers remain independent platform adapters')
    async renderersDoNotImportEachOther() {
        expect(relativeFilesWithMatch(this.consoleSrc, /@tsdi\/components\/html|components\/html/)).toEqual([]);
        expect(relativeFilesWithMatch(this.htmlSrc, /@tsdi\/components\/console|components\/console/)).toEqual([]);
        expect(relativeFilesWithMatch(this.commonSrc, /@tsdi\/components\/(?:html|console)|components\/(?:html|console)/)).toEqual([]);
        expect(relativeFilesWithMatch(this.consoleAdapter, /@tsdi\/components\/html|@tsdi\/agent-ui\/web-console/)).toEqual([]);
        expect(relativeFilesWithMatch(this.webAdapter, /@tsdi\/components\/console|@tsdi\/agent-ui\/console/)).toEqual([]);
    }

    @Test('only the console platform clock owns interval-driven animation')
    async animationClockRemainsPlatformOwned() {
        expect(relativeFilesWithMatch(this.componentsSrc, /\bsetInterval\s*\(/)).toEqual([]);
        expect(relativeFilesWithMatch(this.agentUiSrc, /\bsetInterval\s*\(/)).toEqual([]);
        expect(relativeFilesWithMatch(this.consoleSrc, /\bsetInterval\s*\(/)).toEqual(['animation-clock.ts']);
        expect(relativeFilesWithMatch(this.htmlSrc, /\brequestAnimationFrame\s*\(/)).toEqual(['animation-clock.ts']);
    }

    @Test('session state does not restore manual subscription notification APIs')
    async sharedStateUsesReactiveProxyBroadcasting() {
        const state = fs.readFileSync(path.join(this.agentUiSrc, 'AgentConsoleSessionState.ts'), 'utf8');
        expect(/\b(?:subscribe|notify|batch)\s*\(/.test(state)).toEqual(false);
        expect(/\b(?:private|protected|public)\s+(?:readonly\s+)?listeners\b/.test(state)).toEqual(false);
    }
}
