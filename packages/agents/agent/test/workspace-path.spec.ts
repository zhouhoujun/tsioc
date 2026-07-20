import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { findAgentWorkspaceRoot, resolveAgentWorkspacePath } from '../src/AgentWorkspacePath';

class WorkspaceAdapterStub {
    constructor(private existingPaths: string[]) {
    }

    resolve(...paths: string[]): string {
        return paths.filter(Boolean).join('/').replace(/\/+/g, '/');
    }

    join(...paths: string[]): string {
        return this.resolve(...paths);
    }

    existsSync(path: string): boolean {
        return this.existingPaths.indexOf(path) >= 0;
    }
}

@Suite('Agent workspace path')
export class AgentWorkspacePathTest {
    @Test('finds git root from current directory when marker exists')
    findsGitRootFromCurrentDirectory() {
        const adapter = new WorkspaceAdapterStub([
            '/repo/.git'
        ]);
        const resolved = findAgentWorkspaceRoot(
            '/repo/packages/agents',
            adapter as any,
            (target: string) => target.replace(/\/[^/]+$/, '') || '/'
        );

        expect(resolved).toBe('/repo');
    }

    @Test('falls back to launch directory when git marker is absent')
    fallsBackToLaunchDirectoryWhenGitMarkerMissing() {
        const adapter = new WorkspaceAdapterStub([]);
        const resolved = findAgentWorkspaceRoot(
            '/plain/worktree',
            adapter as any,
            (target: string) => target.replace(/\/[^/]+$/, '') || '/'
        );

        expect(resolved).toBe('/plain/worktree');
    }

    @Test('prefers explicit workspace over inferred location')
    prefersExplicitWorkspace() {
        const adapter = new WorkspaceAdapterStub([
            '/repo/.git'
        ]);
        const resolved = resolveAgentWorkspacePath({
            explicitWorkspace: '/custom/workspace',
            currentDirectory: '/repo/packages/agents',
            fallbackWorkspace: '/fallback/workspace',
            adapter: adapter as any,
            dirname: (target: string) => target.replace(/\/[^/]+$/, '') || '/'
        });

        expect(resolved).toBe('/custom/workspace');
    }
}
