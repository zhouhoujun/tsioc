import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EsbuildBuildActivity } from '../src/activities/EsbuildBuildActivity';

function outDir(name: string): string {
    return path.join(os.tmpdir(), `tsdi-aot-${name}`);
}

function outputFile(dir: string): string {
    return path.join(dir, 'test', 'fixtures', 'aot', 'service.js');
}

describe('AOT build activity', () => {
    it('emits precompiled decorator metadata instead of decorator syntax', async () => {
        const dir = outDir('esbuild');
        try {
            const activity = new EsbuildBuildActivity();
            activity.src = 'test/fixtures/aot/service.ts';
            activity.outDir = dir;
            activity.format = 'cjs';
            activity.target = 'es2020';
            activity.aot = true;

            const result = await activity.execute({} as any);
            expect(result.success).toBe(true);

            const output = fs.readFileSync(outputFile(dir), 'utf-8');
            expect(output).not.toContain('@Injectable');
            expect(output).not.toContain('@Autowired');
            expect(output).not.toContain('__decorate');
            expect(output).toContain('__aotDeco(');
            expect(output).toContain('Injectable)()');
            expect(output).toContain('Autowired)()');
            expect(output).toContain('design:type');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('emits plain decorator syntax when AOT is disabled', async () => {
        const dir = outDir('esbuild-legacy');
        try {
            const activity = new EsbuildBuildActivity();
            activity.src = 'test/fixtures/aot/service.ts';
            activity.outDir = dir;
            activity.format = 'cjs';
            activity.target = 'es2020';
            activity.aot = false;

            const result = await activity.execute({} as any);
            expect(result.success).toBe(true);

            const output = fs.readFileSync(outputFile(dir), 'utf-8');
            expect(output).not.toContain('__aotDeco(');
            expect(output).toContain('__decorate');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
