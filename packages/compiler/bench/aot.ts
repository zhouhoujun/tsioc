/**
 * AOT emit benchmark.
 *
 * Usage (from the package directory):
 *   npm run bench
 *   npx ts-node -r tsconfig-paths/register bench/aot.ts --files 120 --rounds 5
 *
 * Generates a synthetic project of decorated classes, then measures the cost of
 * `emitAotProject` per run. Reported as best-of-N wall time, which is what a
 * build pipeline actually pays.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import * as ts from 'typescript';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitAotProject } from '../src';

function argValue(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const files = Number(argValue('files') ?? 60);
const rounds = Number(argValue('rounds') ?? 3);

const root = mkdtempSync(join(tmpdir(), 'aot-bench-'));
const srcDir = join(root, 'src');
mkdirSync(srcDir, { recursive: true });

/** One decorated service per file, plus a shared base module. */
for (let index = 0; index < files; index++) {
    const next = index + 1 < files ? `import { Service${index + 1} } from './service${index + 1}';\n` : '';
    const dep = index + 1 < files ? `constructor(readonly next: Service${index + 1}) {}\n` : '';
    writeFileSync(join(srcDir, `service${index}.ts`), `
import { Injectable, Inject } from '@tsdi/ioc';

/** generated service ${index} */
@Injectable()
export class Service${index} {
    value = ${index};

    ${dep}
    /** method doc */
    run(input: string): string {
        return input + '${index}';
    }
}
`);
}

const rootNames = Array.from({ length: files }, (_value, index) => join(srcDir, `service${index}.ts`));

function runOnce(outDir: string): number {
    const started = Date.now();
    emitAotProject({
        rootNames,
        rootDir: srcDir,
        compilerOptions: {
            outDir,
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true
        }
    });
    return Date.now() - started;
}

let best = Infinity;
const samples: number[] = [];
for (let round = 0; round < rounds; round++) {
    const outDir = join(root, `.out-${round}`);
    const ms = runOnce(outDir);
    samples.push(ms);
    if (ms < best) best = ms;
    rmSync(outDir, { recursive: true, force: true });
}

console.log(`\nAOT emit bench (${files} files, best of ${rounds})\n`);
console.log('| scenario | ms |');
console.log('|---|---|');
console.log(`| emitAotProject (${files} files) | ${best} |`);
console.log('');
console.log(`samples: ${samples.join(', ')} ms`);
console.log(`project: ${root}`);

rmSync(root, { recursive: true, force: true });
