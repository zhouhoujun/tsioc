import * as path from 'node:path';
import expect = require('expect');
import { TsConfigReader } from '../src/TsConfigReader';
import { CompilerTemplateExecutor } from '../src/CompilerTemplateExecutor';
import { CompilerDirectives, createCompilerTemplate } from '../src/CompilerTemplate';
import { AotAspectCompileActivity } from '../src/activities/AotAspectCompileActivity';

const tsconfig = path.join(__dirname, '../tsconfig.json');
const outDir = path.join('/tmp', `tsdi-aot-aspect-template-${Date.now()}`);

function template() {
    return createCompilerTemplate('aot-aspect-template-check', [
        {
            type: AotAspectCompileActivity,
            name: 'aot-aspect-compile',
            directive: { if: CompilerDirectives.ifAot },
            config: {
                src: 'test/fixtures/aspects/aspects.ts',
                outDir,
                outFile: '{{options.aotManifest}}'
            }
        }
    ]);
}

describe('compiler AOT aspect options', () => {
    it('keeps AOT aspect options in merged runtime options', () => {
        const reader = new TsConfigReader(tsconfig);
        const options = reader.mergeWithRuntime({ aot: true, aotManifest: 'custom-aspect.json' });
        expect(options.aot).toBe(true);
        expect(options.aotManifest).toBe('custom-aspect.json');
    });

    it('executes the AOT aspect node when aspects are enabled', async () => {
        const executor = new CompilerTemplateExecutor(tsconfig);
        const result = await executor.execute(template(), { aot: true, aotManifest: 'custom-aspect.json' });
        expect(result.executedNodes).toContain('aot-aspect-compile');
        expect((result.data as any)?.options?.aot).toBe(true);
        expect((result.data as any)?.options?.aotManifest).toBe('custom-aspect.json');
        expect(result.success).toBe(true);
    });

    it('skips the AOT aspect node when aspects are disabled', async () => {
        const executor = new CompilerTemplateExecutor(tsconfig);
        const result = await executor.execute(template(), { aot: false });
        expect(result.executedNodes).not.toContain('aot-aspect-compile');
        expect(result.skippedNodes).toContain('aot-aspect-compile');
    });
});
