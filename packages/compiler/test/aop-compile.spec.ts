import expect = require('expect');
import * as fs from 'fs';
import * as path from 'path';
import { AopCompileActivity } from '../src/activities/AopCompileActivity';

describe('AOP compiler', () => {
    it('emits pointcuts and advices from @Aspect classes', async () => {
        const outDir = path.join('/tmp', `tsdi-aop-${Date.now()}`);
        const activity = new AopCompileActivity();
        activity.src = 'test/fixtures/aop/aspects.ts';
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

        const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'aop-manifest.json'), 'utf-8'));
        expect(manifest.aspects[0].className).toBe('SampleAspect');
        fs.rmSync(outDir, { recursive: true, force: true });
    });

    it('rejects an advice without a pointcut in strict mode', async () => {
        const outDir = path.join('/tmp', `tsdi-aop-invalid-${Date.now()}`);
        const activity = new AopCompileActivity();
        activity.src = 'test/fixtures/aop/invalid.ts';
        activity.outDir = outDir;
        activity.strict = true;

        const result = await activity.execute({});
        expect(result.success).toBe(false);
        expect(result.data?.errors[0].message).toContain('requires a pointcut');
        fs.rmSync(outDir, { recursive: true, force: true });
    });
});
