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
    private readonly consoleSrc = path.resolve(__dirname, '../../../components/console/src');

    @Test('agent-ui source does not import console implementation or Node modules directly')
    async agentUiImportsRemainPlatformNeutral() {
        const forbiddenImport = /(?:from\s*|import\s*\(|require\s*\()\s*['"](?:@tsdi\/components\/console|node:[^'"]+|buffer|child_process|crypto|events|fs|http|https|net|os|path|stream|tls|url|util|worker_threads)['"]/;
        expect(relativeFilesWithMatch(this.agentUiSrc, forbiddenImport)).toEqual([]);
    }

    @Test('shared component and agent UI sources do not use interval-driven rendering')
    async renderingRemainsDataDriven() {
        const roots = [this.componentsSrc, this.consoleSrc, this.agentUiSrc];
        const violations = roots.flatMap(root =>
            relativeFilesWithMatch(root, /\bsetInterval\s*\(/)
                .map(file => `${path.basename(path.dirname(root))}/${path.basename(root)}/${file}`)
        );
        expect(violations).toEqual([]);
    }

    @Test('session state does not restore manual subscription notification APIs')
    async sharedStateUsesReactiveProxyBroadcasting() {
        const state = fs.readFileSync(path.join(this.agentUiSrc, 'AgentConsoleSessionState.ts'), 'utf8');
        expect(/\b(?:subscribe|notify|batch)\s*\(/.test(state)).toEqual(false);
        expect(/\b(?:private|protected|public)\s+(?:readonly\s+)?listeners\b/.test(state)).toEqual(false);
    }
}
