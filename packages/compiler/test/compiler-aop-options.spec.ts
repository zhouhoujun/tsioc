import * as path from 'node:path';
import expect = require('expect');
import { TsConfigReader } from '../src/TsConfigReader';
import { CompilerTemplateExecutor } from '../src/CompilerTemplateExecutor';
import { CompilerDirectives, createCompilerTemplate } from '../src/CompilerTemplate';
import { AopCompileActivity } from '../src/activities/AopCompileActivity';

const tsconfig = path.join(__dirname, '../tsconfig.json');
const outDir = path.join('/tmp', `tsdi-aop-template-${Date.now()}`);

function template() {
    return createCompilerTemplate('aop-template-check', [
        {
            type: AopCompileActivity,
            name: 'aop-compile',
            directive: { if: CompilerDirectives.ifAop },
            config: {
                src: 'test/fixtures/aop/aspects.ts',
                outDir,
                outFile: '{{options.aopManifest}}'
            }
        }
    ]);
}

describe('compiler AOP options', () => {
    it('keeps aop and aopManifest in merged runtime options', () => {
        const reader = new TsConfigReader(tsconfig);
        const options = reader.mergeWithRuntime({ aop: true, aopManifest: 'custom-aop.json' });
        expect(options.aop).toBe(true);
        expect(options.aopManifest).toBe('custom-aop.json');
    });

    it('executes the aop-compile template node when aop is enabled', async () => {
        const executor = new CompilerTemplateExecutor(tsconfig);
        const result = await executor.execute(template(), { aop: true, aopManifest: 'custom-aop.json' });
        expect(result.executedNodes).toContain('aop-compile');
        expect((result.data as any)?.options?.aop).toBe(true);
        expect((result.data as any)?.options?.aopManifest).toBe('custom-aop.json');
        expect(result.success).toBe(true);
    });

    it('skips the aop-compile template node when aop is disabled', async () => {
        const executor = new CompilerTemplateExecutor(tsconfig);
        const result = await executor.execute(template(), { aop: false });
        expect(result.executedNodes).not.toContain('aop-compile');
        expect(result.skippedNodes).toContain('aop-compile');
    });
});
