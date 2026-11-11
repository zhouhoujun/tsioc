import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import { emitAotProject } from '../src/AotCompiler';
import { runCompiler } from '../src/run-compiler';

function tempDir(name: string): string {
    return path.join(os.tmpdir(), `tsdi-aot-project-${name}`);
}

describe('shared AOT compiler', () => {
    it('emits precompiled decorators through emitAotProject', () => {
        const outDir = tempDir('emit');
        try {
            const result = emitAotProject({
                configPath: path.join(__dirname, '../tsconfig.json'),
                rootNames: [path.join(__dirname, 'fixtures/aot/service.ts')],
                compilerOptions: {
                    outDir,
                    declaration: false,
                    sourceMap: false,
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.CommonJS,
                    noEmitOnError: false
                },
                throwOnError: true
            });

            expect(result.success).toBe(true);
            const output = fs.readFileSync(path.join(outDir, 'test', 'fixtures', 'aot', 'service.js'), 'utf-8');
            expect(output).not.toContain('@Injectable');
            expect(output).not.toContain('__decorate');
            expect(output).toContain('__aotDeco(');
        } finally {
            fs.rmSync(outDir, { recursive: true, force: true });
        }
    });

    it('compiles a browser-target project to ESM AOT output', () => {
        const outDir = tempDir('browser');
        try {
            const result = emitAotProject({
                configPath: path.join(__dirname, '../tsconfig.json'),
                rootNames: [path.join(__dirname, 'fixtures/aot/service.ts')],
                compilerOptions: {
                    outDir,
                    declaration: false,
                    sourceMap: false,
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.ESNext,
                    noEmitOnError: false
                },
                throwOnError: true
            });

            expect(result.success).toBe(true);
            const output = fs.readFileSync(path.join(outDir, 'test', 'fixtures', 'aot', 'service.js'), 'utf-8');
            expect(output).not.toContain('@Injectable');
            expect(output).not.toContain('__decorate');
            expect(output).toContain('__aotDeco(');
            expect(output).toContain('export ');
        } finally {
            fs.rmSync(outDir, { recursive: true, force: true });
        }
    });

    it('runCompiler applies AOT to package taskfile builds', async () => {
        const outDir = tempDir('run');
        try {
            const result = await runCompiler({
                src: 'test/fixtures/aot/service.ts',
                outDir,
                target: 'es2020',
                format: 'cjs',
                declaration: false,
                sourcemap: false,
                aot: true
            });
            expect(result.success).toBe(true);
            const output = fs.readFileSync(path.join(outDir, 'test', 'fixtures', 'aot', 'service.js'), 'utf-8');
            expect(output).not.toContain('@Injectable');
            expect(output).toContain('__aotDeco(');
        } finally {
            fs.rmSync(outDir, { recursive: true, force: true });
        }
    });
});
