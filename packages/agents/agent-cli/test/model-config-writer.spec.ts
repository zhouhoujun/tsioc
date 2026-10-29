import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { writeAgentModelConfig } from '../src/model-config-writer';

@Suite('agent model config writer')
export class ModelConfigWriterTest {
    @Test('replaces the model section while preserving other root settings')
    replacesModel() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-model-config-'));
        try {
            const file = path.join(root, 'settings.json');
            fs.writeFileSync(file, JSON.stringify({
                language: 'zh',
                tools: { enabled: ['bash'] },
                model: { provider: 'old', model: 'old-model', profiles: { old: { provider: 'old', model: 'old-model' } }, defaultProfile: 'old' }
            }));
            const next = {
                provider: 'fake-openai',
                model: 'fake-model-a',
                baseUrl: 'http://127.0.0.1:1/v1',
                defaultProfile: 'fake-fast',
                profiles: { 'fake-fast': { provider: 'fake-openai', model: 'fake-model-a', baseUrl: 'http://127.0.0.1:1/v1' } }
            };
            writeAgentModelConfig(root, next);
            const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
            expect(stored.language).toEqual('zh');
            expect(stored.tools).toEqual({ enabled: ['bash'] });
            expect(stored.model).toEqual(next);
            expect(stored.model.model).toEqual('fake-model-a');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('creates the root settings file when missing')
    createsFile() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-model-config-'));
        try {
            const next = { provider: 'fake', model: 'm', profiles: {} };
            writeAgentModelConfig(root, next);
            expect(JSON.parse(fs.readFileSync(path.join(root, 'settings.json'), 'utf8'))).toEqual({ model: next });
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }
}
