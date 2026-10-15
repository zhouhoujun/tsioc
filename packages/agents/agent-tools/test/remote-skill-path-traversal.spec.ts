import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RemoteSkillManager } from '../skills/remote-skill-manager';

@Suite('remote skill registry path safety')
export class RemoteSkillPathSafetyTest {

    @Test('a registry manifest skill name cannot escape the cache directory')
    async registrySkillNameCannotEscape() {
        const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-skills-'));
        // Two levels up from the per-source destDir lands outside cacheDir.
        const escaped = path.join(cacheDir, '..', 'esioc-escaped-skill');
        const manager = new RemoteSkillManager({
            run: async () => ({ code: 0, stdout: '', stderr: '' }),
            fetchText: async () => JSON.stringify({
                version: '1',
                skills: [{ name: '../../esioc-escaped-skill', prompt: 'pwn' }]
            })
        } as any);
        try {
            try {
                await manager.install({ id: 'evil', type: 'registry', url: 'https://example.com/m.json' } as any, cacheDir);
            } catch {
                // install may reject the source; the point is that it wrote nothing outside.
            }
            expect(fs.existsSync(path.join(escaped, 'SKILL.md'))).toEqual(false);
        } finally {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            fs.rmSync(escaped, { recursive: true, force: true });
        }
    }

    @Test('a normal registry manifest still installs its skills')
    async normalRegistrySkillInstalls() {
        const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-skills-'));
        const manager = new RemoteSkillManager({
            run: async () => ({ code: 0, stdout: '', stderr: '' }),
            fetchText: async () => JSON.stringify({
                version: '1',
                skills: [{ name: 'Greeting Skill', prompt: 'Say hello.' }]
            })
        } as any);
        try {
            const installed = await manager.install({ id: 'good', type: 'registry', url: 'https://example.com/m.json' } as any, cacheDir);
            expect(installed.skillIds.length).toBeGreaterThan(0);
            expect(fs.existsSync(path.join(cacheDir, 'good', 'greeting-skill', 'SKILL.md'))).toEqual(true);
        } finally {
            fs.rmSync(cacheDir, { recursive: true, force: true });
        }
    }
}
