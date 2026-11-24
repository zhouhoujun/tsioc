import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ArtifactCreateTool, ArtifactDeleteTool, ArtifactReadTool, ArtifactUpdateTool } from '../artifacts';

@Suite('artifact tools')
export class ArtifactToolsTest {
    @Test('create/read/update/delete artifacts inside the workspace')
    async lifecycle() {
        const workspace = mkdtempSync(join(tmpdir(), 'artifact-tools-'));
        const context = { sessionId: 's1', workspace } as any;
        try {
            const create = new ArtifactCreateTool();
            const created = await create.invoke({
                title: 'Report',
                files: [{ path: 'index.html', content: '<h1>v1</h1>' }]
            }, context);
            expect(created.title).toEqual('Report');
            expect(created.entry).toEqual('index.html');
            expect(created.url).toEqual(`/artifacts/${created.id}/index.html`);
            expect(readFileSync(join(workspace, '.tsdi-agent/artifacts', created.id, 'index.html'), 'utf8')).toEqual('<h1>v1</h1>');

            const read = new ArtifactReadTool();
            const file = await read.invoke({ id: created.id }, context);
            expect(file.content).toEqual('<h1>v1</h1>');

            const update = new ArtifactUpdateTool();
            const updated = await update.invoke({
                id: created.id,
                title: 'Report v2',
                files: [{ path: 'app.js', content: 'console.log(2)' }]
            }, context);
            expect(updated.title).toEqual('Report v2');
            expect(updated.files).toContain('app.js');

            const remove = new ArtifactDeleteTool();
            const removed = await remove.invoke({ id: created.id }, context);
            expect(removed.removed).toEqual(true);
            expect(existsSync(join(workspace, '.tsdi-agent/artifacts', created.id))).toEqual(false);
        } finally {
            rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('artifact tools require a workspace')
    async requiresWorkspace() {
        const create = new ArtifactCreateTool();
        let caught: any;
        try {
            await create.invoke({ files: [{ path: 'a.html', content: '' }] }, { sessionId: 's1' } as any);
        } catch (error) {
            caught = error;
        }
        expect(String(caught?.message)).toContain('workspace');
    }
}
