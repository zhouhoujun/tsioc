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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
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

/**
 * Runtime comparison: what the emitted metadata saves when the module is
 * actually loaded and resolved (decorator factory + dispatch vs `ƿAnn`).
 */
function runtimeMetadataBench(): void {
    const count = 200;
    const runtimeRoot = join(root, 'runtime');
    const runtimeSrc = join(runtimeRoot, 'src');
    mkdirSync(runtimeSrc, { recursive: true });
    let source = `import { Injectable, Singleton } from '@tsdi/ioc';\n`;
    for (let index = 0; index < count; index++) {
        const dep = index > 0 ? `constructor(readonly dep${index - 1}: S${index - 1}) {}\n` : '';
        source += `@Injectable()\n@Singleton()\nexport class S${index} {\n    value = ${index};\n    ${dep}run(input: number) { return input + ${index}; }\n}\n`;
    }
    writeFileSync(join(runtimeSrc, 'services.ts'), source);
    const runtimeOut = join(runtimeRoot, 'out');
    emitAotProject({
        configPath: join(__dirname, '../tsconfig.json'),
        rootNames: [join(runtimeSrc, 'services.ts')],
        rootDir: runtimeSrc,
        compilerOptions: {
            outDir: runtimeOut,
            noEmitOnError: false,
            declaration: false,
            sourceMap: false,
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        },
        throwOnError: false
    });
    const aotCode = readFileSync(join(runtimeOut, 'services.js'), 'utf-8');
    const runtimeCode = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        }
    }).outputText;
    const ioc = require(join(__dirname, '../../ioc/src'));
    const load = (code: string): Record<string, any> => {
        const module = { exports: {} as Record<string, any> };
        const nodeRequire = require;
        new Function('exports', 'require', 'module', code)(
            module.exports,
            (id: string) => id === '@tsdi/ioc' ? ioc : nodeRequire(id),
            module
        );
        return module.exports;
    };
    const measure = (name: string, fn: () => void): number => {
        let fastest = Infinity;
        for (let round = 0; round < 5; round++) {
            const usage = process.cpuUsage();
            fn();
            const spent = process.cpuUsage(usage);
            fastest = Math.min(fastest, (spent.user + spent.system) / 1000);
        }
        console.log(`| ${name} | ${fastest.toFixed(2)} |`);
        return fastest;
    };
    const all = (exports: Record<string, any>): any[] =>
        Array.from({ length: count }, (_value, index) => exports[`S${index}`]);

    console.log('\nAOT runtime metadata (200 decorated services, best of 5)\n');
    console.log('| scenario | CPU ms |');
    console.log('|---|---|');
    const runtimeEval = measure('runtime decorators: eval + getClassRef', () => {
        const exports = load(runtimeCode);
        all(exports).forEach(type => ioc.getClassRef(type));
    });
    const aotEval = measure('AOT metadata: eval + getClassRef', () => {
        const exports = load(aotCode);
        all(exports).forEach(type => ioc.getClassRef(type));
    });
    measure('runtime decorators: eval only', () => { load(runtimeCode); });
    measure('AOT metadata: eval only', () => { load(aotCode); });
    const runtimeInject = measure('runtime decorators: injector + get', () => {
        const exports = load(runtimeCode);
        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, ...all(exports));
        container.get(exports[`S${count - 1}`]);
    });
    const aotInject = measure('AOT metadata: injector + get', () => {
        const exports = load(aotCode);
        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, ...all(exports));
        container.get(exports[`S${count - 1}`]);
    });
    console.log(`\nclass metadata: ${((1 - aotEval / runtimeEval) * 100).toFixed(1)}% faster`);
    console.log(`injector boot + resolve: ${((1 - aotInject / runtimeInject) * 100).toFixed(1)}% faster`);
}

runtimeMetadataBench();

rmSync(root, { recursive: true, force: true });
