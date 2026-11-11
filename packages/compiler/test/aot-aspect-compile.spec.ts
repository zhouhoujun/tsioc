import expect = require('expect');
import * as fs from 'fs';
import * as path from 'path';
import { AotAspectCompileActivity } from '../src/activities/AotAspectCompileActivity';
import { TsConfigReader } from '../src/TsConfigReader';
import { runCompiler } from '../src/run-compiler';

describe('AOT aspect compiler', () => {
    it('emits pointcuts and advices from @Aspect classes', async () => {
        const outDir = path.join('/tmp', `tsdi-aot-aspect-${Date.now()}`);
        const activity = new AotAspectCompileActivity();
        activity.src = 'test/fixtures/aspects/aspects.ts';
        activity.outDir = outDir;
        activity.strict = true;

        const result = await activity.execute({});
        expect(result.success).toBe(true);
        expect(result.data?.aspects.length).toBe(1);
        const aspect = result.data?.aspects[0];
        expect(aspect.className).toBe('SampleAspect');
        expect(aspect.advices.map((advice: any) => advice.type)).toEqual(['Before', 'AfterReturning']);
        expect(aspect.advices.every((advice: any) => advice.pointcut === 'execution(*.run(..))')).toBe(true);
        expect(aspect.advices.every((advice: any) => advice.joinPoint)).toBe(true);

        const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'aot-manifest.json'), 'utf-8'));
        expect(manifest.aspects[0].className).toBe('SampleAspect');
        fs.rmSync(outDir, { recursive: true, force: true });
    });

    it('runCompiler emits the AOT manifest for package build taskfiles', async () => {
        const outDir = path.join('/tmp', `tsdi-aot-aspect-run-${Date.now()}`);
        const result = await runCompiler({
            src: 'test/fixtures/aspects/aspects.ts',
            outDir,
            target: 'es2020',
            format: 'cjs',
            declaration: false,
            sourcemap: false,
            aot: true
        });
        expect(result.success).toBe(true);
        const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'aot-manifest.json'), 'utf-8'));
        expect(manifest.aspects.length).toBe(1);
        fs.rmSync(outDir, { recursive: true, force: true });
    });

    it('propagates AOT precompile options into the template runtime', () => {
        const reader = new TsConfigReader(require('path').join(__dirname, '../tsconfig.json'));
        const options = reader.mergeWithRuntime({ aot: true, aotManifest: 'custom-aspect.json' });
        expect(options.aot).toBe(true);
        expect(options.aotManifest).toBe('custom-aspect.json');
        expect(reader.mergeWithRuntime({}).aot).toBe(true);
        expect(reader.mergeWithRuntime({ aot: false }).aot).toBe(false);
    });

    it('rejects an advice without a pointcut in strict mode', async () => {
        const outDir = path.join('/tmp', `tsdi-aot-aspect-invalid-${Date.now()}`);
        const activity = new AotAspectCompileActivity();
        activity.src = 'test/fixtures/aspects/invalid.ts';
        activity.outDir = outDir;
        activity.strict = true;

        const result = await activity.execute({});
        expect(result.success).toBe(false);
        expect(result.data?.errors[0].message).toContain('requires a pointcut');
        fs.rmSync(outDir, { recursive: true, force: true });
    });
});
