import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';
import { collectArtifactFiles, collectArtifactReports, runArtifactsCommand } from '../src/AgentConsoleArtifacts';

@Suite('session artifacts')
export class ArtifactsTest {
    @Test('collects unique files from snapshots and multi-file patches')
    files() {
        const files = collectArtifactFiles([
            { filePath: 'a.ts', toolName: 'edit', timestamp: 1 },
            { filePath: 'a.ts', toolName: 'apply_patch', timestamp: 2 },
            { filePath: 'b.ts', timestamp: 3, files: [{ filePath: 'c.ts', timestamp: 4 }] }
        ]);
        expect(files.map(file => file.path)).toEqual(['c.ts', 'b.ts', 'a.ts']);
        expect(files[2].toolName).toEqual('apply_patch');
    }

    @Test('collects worker report artifacts')
    reports() {
        expect(collectArtifactReports([
            { id: 't1', goal: 'scan', result: { report: { artifacts: ['report.html', 'chart.png'] } } },
            { id: 't2', goal: 'none', result: {} }
        ])).toEqual([{ taskId: 't1', goal: 'scan', artifacts: ['report.html', 'chart.png'] }]);
    }

    @Test('/artifacts opens an overlay with files and reports')
    async opens() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 'session-1', workspace: '' });
        const overlays: Array<{ title: string; lines: string[] }> = [];
        await runArtifactsCommand({
            translator: null,
            state: {
                sessionId: 'session-1',
                openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
            },
            runtime: {
                listFileSnapshots: () => [{ filePath: 'src/a.ts', toolName: 'edit' }]
            },
            sessionService: {
                listAllBackgroundTasks: async () => [
                    { id: 't1', goal: 'scan', result: { report: { artifacts: ['report.html'] } } }
                ]
            },
            notify: () => undefined
        });
        expect(overlays[0].title).toEqual('Session artifacts');
        const body = overlays[0].lines.join('\n');
        expect(body).toContain('src/a.ts');
        expect(body).toContain('report.html');
        expect(body).toContain('Files · 1');
        expect(body).toContain('Worker reports · 1');
    }

    @Test('/artifacts reports an empty session')
    async empty() {
        const notices: string[] = [];
        await runArtifactsCommand({
            translator: null,
            state: { sessionId: 's', openTextOverlay: () => undefined },
            runtime: { listFileSnapshots: () => [] },
            notify: (message: string) => notices.push(message)
        });
        expect(notices[0]).toContain('No artifacts captured');
    }
}
