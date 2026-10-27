import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrmStorage } from '../src/orm.module';
import { DefaultAgentMemoryRetriever } from '../src/memory/AgentMemoryRetriever';
import { WeaknessMiner } from '../src/harness/WeaknessMiner';
import { ProjectContextSection } from '../src/prompt/sections/ProjectContextSection';
import { FileAdapter } from '@tsdi/common';
import { ProjectMemoryService } from '../src/memory/ProjectMemoryService';

/**
 * `@Optional() private x?: T | null` parameters emit `Object` as their design
 * type, so the container injected `undefined` for every such collaborator and
 * the dependent feature silently degraded (project memories never injected,
 * weakness mining without diagnostics, project context without a file adapter).
 */
@Suite('optional collaborators are injected with explicit tokens')
export class OptionalCollaboratorInjectionTest {

    @Test('memory retriever, weakness miner and project context get their stores')
    async storesAreInjected() {
        const root = mkdtempSync(join(tmpdir(), 'tsdi-agent-di-'));
        // The host (CLI/console) registers the file adapter; replicate that here so
        // the project-context section can resolve it.
        const stubFileAdapter = { readText: async () => '', writeText: async () => undefined } as any;
        const ctx = await Application.run(AgentModule, {
            providers: [
                ...provideAgentOrmStorage(root),
                { provide: FileAdapter, useValue: stubFileAdapter }
            ]
        });
        try {
            const retriever = ctx.get(DefaultAgentMemoryRetriever) as any;
            const miner = ctx.get(WeaknessMiner) as any;
            const section = ctx.get(ProjectContextSection) as any;
            expect(!!retriever?.projectMemory).toEqual(true);
            expect(!!miner?.turnDiagnostics).toEqual(true);
            expect(!!miner?.audit).toEqual(true);
            expect(!!section?.fileAdapter).toEqual(true);
        } finally {
            await ctx.close();
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('project memories reach the retriever once the service is injected')
    async projectMemoriesAreRetrieved() {
        const root = mkdtempSync(join(tmpdir(), 'tsdi-agent-di-'));
        const ctx = await Application.run(AgentModule, {
            providers: [...provideAgentOrmStorage(root)]
        });
        try {
            const projectMemory = ctx.get(ProjectMemoryService) as any;
            await projectMemory.add({ projectId: 'proj-1', key: 'zebra', value: 'stripes are unique' });
            const retriever = ctx.get(DefaultAgentMemoryRetriever) as any;
            const records = await retriever.retrieve({ projectId: 'proj-1', query: 'zebra', sessionId: 'session-1' });
            expect(records.some((record: any) => String(record.value).includes('stripes are unique'))).toEqual(true);
        } finally {
            await ctx.close();
            rmSync(root, { recursive: true, force: true });
        }
    }
}
