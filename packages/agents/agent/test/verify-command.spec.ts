import { ApplicationContext, RandomUuidGenerator, Application } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter, IReadable } from '@tsdi/common';
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { SessionStore } from '../src/memory/SessionStore';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { VerificationGate } from '../src/harness/VerificationGate';
import { EvidenceLedger } from '../src/harness/EvidenceLedger';
import { FileSnapshotStore } from '../src/harness/FileSnapshotStore';
import { VerifyCommandRunner, findPackageDirectory, resolvePackageManager, splitCommandTemplate, DEFAULT_VERIFY_AUTO_SCRIPTS } from '../src/harness/VerifyCommandRunner';
import { AGENT_OPTIONS } from '../src/tokens';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

class MemoryFileAdapter extends FileAdapter {
    files = new Map<string, string>();

    seed(path: string, content: string): void {
        this.files.set(path, content);
    }

    isAbsolute(path: string): boolean {
        return path.startsWith('/');
    }

    normalize(path: string): string {
        return path;
    }

    join(...paths: string[]): string {
        return paths.join('/');
    }

    resolve(...paths: string[]): string {
        return paths.join('/');
    }

    extname(path: string): string {
        const index = path.lastIndexOf('.');
        return index >= 0 ? path.slice(index) : '';
    }

    existsSync(path: string): boolean {
        return this.files.has(path);
    }

    read(): IReadable {
        throw new Error('read stream not supported in MemoryFileAdapter');
    }

    async find(): Promise<null> {
        return null;
    }

    async readText(path: string): Promise<string> {
        const content = this.files.get(path);
        if (content === undefined) {
            throw new Error(`ENOENT: ${path}`);
        }
        return content;
    }

    readTextSync(path: string): string {
        const content = this.files.get(path);
        if (content === undefined) {
            throw new Error(`ENOENT: ${path}`);
        }
        return content;
    }

    async readJSON<T = any>(path: string): Promise<T> {
        return JSON.parse(await this.readText(path));
    }

    readJSONSync<T = any>(path: string): T {
        return JSON.parse(this.readTextSync(path));
    }

    async writeText(path: string, content: string): Promise<void> {
        this.files.set(path, content);
    }

    async mkdir(): Promise<void> {
        return;
    }

    async remove(path: string): Promise<void> {
        this.files.delete(path);
    }
}

class WriteTool {
    name = 'write_file';

    constructor(
        private filePath: string,
        private adapter: MemoryFileAdapter,
        private content: string
    ) {
    }

    getDefinition() {
        return {
            name: this.name,
            description: 'writes a known string',
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: { sideEffect: true }
        };
    }

    async captureFileSnapshot(): Promise<any> {
        try {
            return { filePath: this.filePath, before: await this.adapter.readText(this.filePath) };
        } catch {
            return { filePath: this.filePath, before: null };
        }
    }

    async invoke(): Promise<any> {
        await this.adapter.writeText(this.filePath, this.content);
        return { ok: true };
    }
}

class WriteToolRegistry extends ToolRegistry {
    constructor(private tool: any) {
        super();
    }
    getTools(): any[] {
        return [this.tool];
    }
    getTool(name: string): any {
        return this.tool.name === name ? this.tool : undefined;
    }
    async invoke(name: string): Promise<any> {
        return this.tool.name === name ? this.tool.invoke() : null;
    }
}

class WriteOnceModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-write-1', name: 'write_file', input: {} }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'done',
            stopReason: 'end'
        };
    }
}

function injectedRepairPrompts(adapter: { requests: any[] }): string[] {
    const prompts: string[] = [];
    for (const request of adapter.requests) {
        for (const message of request.messages ?? []) {
            if (message.role === 'system' && message.content.includes('verification gate falsified')) {
                prompts.push(message.content);
            }
        }
    }
    return prompts;
}

function buildRuntime(model: any, registry: ToolRegistry, options: any = {}, fileAdapter?: FileAdapter, fileSnapshotStore?: FileSnapshotStore): Promise<{ runtime: AgentRuntime; ctx: ApplicationContext }> {
    const providers: any[] = [
        { provide: ModelAdapter, useValue: model },
        { provide: ToolRegistry, useValue: registry },
        { provide: AGENT_OPTIONS, useValue: { ...defaultAgentOptions, ...options } },
        { provide: FileAdapter, useValue: fileAdapter ?? new MemoryFileAdapter() },
        { provide: FileSnapshotStore, useValue: fileSnapshotStore ?? new FileSnapshotStore() }
    ];
    return Application.run(AgentModule, { providers: [...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any), ...providers] }).then(ctx => ({ runtime: ctx.get(AgentRuntime), ctx }));
}

function makeTempWorkspace(): string {
    const root = mkdtempSync(join(tmpdir(), 'p79-verify-'));
    return root;
}

class FakeRunProcess {
    calls: Array<{ command: string; args: string[]; cwd: string; timeoutMs: number }> = [];

    constructor(private result: { exitCode?: number; output?: string; durationMs?: number; timedOut?: boolean }) {
    }

    fn = async (command: string, args: string[], cwd: string, timeoutMs: number) => {
        this.calls.push({ command, args, cwd, timeoutMs });
        return {
            exitCode: this.result.exitCode,
            output: this.result.output ?? '',
            durationMs: this.result.durationMs ?? 5,
            timedOut: this.result.timedOut ?? false
        };
    };
}

function writePackage(root: string, pkgName: string, scripts: Record<string, string>): string {
    const pkgDir = join(root, pkgName);
    mkdirSync(join(pkgDir, 'src'), { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: pkgName, scripts }, null, 2));
    return pkgDir;
}

@Suite('VerifyCommandRunner (P79)')
export class VerifyCommandRunnerTest {
    @Test('findPackageDirectory resolves the nearest package.json and stops at the workspace bound')
    async findsNearestPackageDirectory() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'tsc' });
            writeFileSync(join(pkgDir, 'src', 'x.ts'), '// x');

            expect(findPackageDirectory(join(pkgDir, 'src', 'x.ts'), root)).toEqual(pkgDir);
            expect(findPackageDirectory(join(pkgDir, 'package.json'), root)).toEqual(pkgDir);

            const orphan = join(root, 'lib', 'y.ts');
            mkdirSync(join(root, 'lib'), { recursive: true });
            writeFileSync(orphan, '// y');
            expect(findPackageDirectory(orphan, root)).toBeUndefined();
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('resolvePackageManager prefers the lockfile-hinted manager')
    async detectsPackageManagerFromLockfile() {
        const root = makeTempWorkspace();
        try {
            const pnpm = writePackage(root, 'a', {});
            writeFileSync(join(pnpm, 'pnpm-lock.yaml'), '');
            expect(resolvePackageManager(pnpm)).toEqual('pnpm');

            const yarn = writePackage(root, 'b', {});
            writeFileSync(join(yarn, 'yarn.lock'), '');
            expect(resolvePackageManager(yarn)).toEqual('yarn');

            const bun = writePackage(root, 'c', {});
            writeFileSync(join(bun, 'bun.lockb'), '');
            expect(resolvePackageManager(bun)).toEqual('bun');

            const plain = writePackage(root, 'd', {});
            expect(resolvePackageManager(plain)).toEqual('npm');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('auto-discovers allowed scripts and marks failures')
    async autoDiscoversScripts() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'tsc --noEmit', lint: 'eslint .' });
            const fake = new FakeRunProcess({ exitCode: 0, output: 'ok' });
            const runner = new VerifyCommandRunner({ workspace: root, runProcess: fake.fn });

            const runs = await runner.run([join(pkgDir, 'src', 'x.ts')]);

            expect(fake.calls).toHaveLength(2);
            expect(runs.map(run => run.script)).toEqual(['typecheck', 'lint']);
            expect(runs[0].command).toEqual('npm run typecheck');
            expect(runs[0].failed).toEqual(false);
            expect(runs[0].exitCode).toEqual(0);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('explicit verifyCommands templates run verbatim and suppress auto-discovery of the same kind')
    async explicitTemplatesOverrideAutoDiscovery() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'tsc' });
            const fake = new FakeRunProcess({ exitCode: 0, output: 'ok' });
            const runner = new VerifyCommandRunner({
                workspace: root,
                verifyCommands: { typecheck: 'npx tsc --noEmit -p tsconfig.json', test: 'vitest run --changed' },
                runProcess: fake.fn
            });

            const runs = await runner.run([join(pkgDir, 'src', 'x.ts')]);

            expect(fake.calls).toHaveLength(2);
            const typecheck = runs.find(run => run.kind === 'typecheck');
            expect(typecheck?.command).toEqual('npx tsc --noEmit -p tsconfig.json');
            expect(typecheck?.script).toBeUndefined();
            expect(runs.find(run => run.kind === 'test')?.command).toEqual('vitest run --changed');
            expect(runs.filter(run => run.kind === 'typecheck').length).toEqual(1);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('silently degrades when no script matches or no package exists')
    async silentlyDegrades() {
        const root = makeTempWorkspace();
        try {
            const noScripts = writePackage(root, 'app', { start: 'node index.js' });
            const runner = new VerifyCommandRunner({ workspace: root, runProcess: new FakeRunProcess({}).fn });
            expect(await runner.run([join(noScripts, 'src', 'x.ts')])).toEqual([]);
            expect(await runner.run([])).toEqual([]);

            const orphan = join(root, 'lib', 'y.ts');
            mkdirSync(join(root, 'lib'), { recursive: true });
            writeFileSync(orphan, '// y');
            expect(await runner.run([orphan])).toEqual([]);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('marks timeout runs as failed with timedOut set')
    async flagsTimeouts() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'tsc' });
            const runner = new VerifyCommandRunner({
                workspace: root,
                runProcess: new FakeRunProcess({ timedOut: true, output: 'hung' }).fn
            });

            const runs = await runner.run([join(pkgDir, 'src', 'x.ts')]);

            expect(runs.length).toEqual(1);
            expect(runs[0].timedOut).toEqual(true);
            expect(runs[0].failed).toEqual(true);
            expect(runs[0].exitCode).toBeUndefined();
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('bounds captured output to maxOutputChars with a trim marker')
    async boundsOutput() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'tsc' });
            const longOutput = 'a'.repeat(100);
            const runner = new VerifyCommandRunner({
                workspace: root,
                maxOutputChars: 40,
                runProcess: new FakeRunProcess({ exitCode: 1, output: longOutput }).fn
            });

            const runs = await runner.run([join(pkgDir, 'src', 'x.ts')]);

            expect(runs[0].output).toContain('chars trimmed');
            expect(runs[0].output.endsWith('a'.repeat(40))).toEqual(true);
            expect(runs[0].failed).toEqual(true);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('splitCommandTemplate respects quotes and drops empty tokens')
    async splitsCommandTemplates() {
        expect(splitCommandTemplate('tsc --noEmit -p "my tsconfig.json"')).toEqual(['tsc', '--noEmit', '-p', 'my tsconfig.json']);
        expect(splitCommandTemplate('node -e "process.exit(0)"')).toEqual(['node', '-e', 'process.exit(0)']);
        expect(splitCommandTemplate('')).toEqual([]);
    }

    @Test('default autoScripts never include long-running suites')
    async defaultAutoScriptsAreFast() {
        expect(DEFAULT_VERIFY_AUTO_SCRIPTS).toEqual(['typecheck', 'lint']);
        expect(DEFAULT_VERIFY_AUTO_SCRIPTS).not.toContain('test');
        expect(DEFAULT_VERIFY_AUTO_SCRIPTS).not.toContain('build');
    }

    @Test('runs real processes end to end against a temp package')
    async runsRealProcesses() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'node -e "process.exit(0)"', lint: 'node -e "process.exit(2)"' });
            const runner = new VerifyCommandRunner({ workspace: root });
            expect(existsSync(join(pkgDir, 'package.json'))).toEqual(true);

            const runs = await runner.run([join(pkgDir, 'src', 'x.ts')]);

            const typecheck = runs.find(run => run.kind === 'typecheck');
            expect(typecheck?.exitCode).toEqual(0);
            expect(typecheck?.failed).toEqual(false);
            const lint = runs.find(run => run.kind === 'lint');
            expect(lint?.exitCode).toEqual(2);
            expect(lint?.failed).toEqual(true);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }
}

@Suite('Verification gate check (d) (P79)')
export class VerificationGateVerifyCommandTest {
    private ledger(): EvidenceLedger {
        return new EvidenceLedger('s1', new RandomUuidGenerator());
    }

    @Test('falsifies a failed verify-command entry with the command failure reason')
    async falsifiesFailedVerifyCommand() {
        const ledger = this.ledger();
        ledger.record({
            toolName: 'verify-command',
            verification: 'verify-command',
            status: 'error',
            exitCode: 1,
            inputSummary: 'verify typecheck in /w/app',
            outputSummary: 'src/a.ts:1: error TS2322: type mismatch'
        });

        const gate = new VerificationGate();
        const result = gate.verify(ledger, 0);

        expect(result.falsified).toEqual(true);
        expect(result.reasons.length).toEqual(1);
        expect(result.reasons[0]).toContain('Verification command failed');
        expect(result.reasons[0]).toContain('exit code 1');
        expect(result.falsifiedEvidence.length).toEqual(1);
        expect(result.falsifiedEvidence[0].verification).toEqual('verify-command');
        expect(result.falsifiedEvidence[0].falsificationReason).toContain('Verification command failed');
    }

    @Test('check (a) does not double-report verify-command entries')
    async noGenericToolErrorForVerifyCommand() {
        const ledger = this.ledger();
        ledger.record({
            toolName: 'verify-command',
            verification: 'verify-command',
            status: 'error',
            error: 'Verification command exited with code 1: npm run typecheck',
            exitCode: 1
        });

        const gate = new VerificationGate();
        const result = gate.verify(ledger, 0);

        expect(result.falsifiedEvidence.length).toEqual(1);
        expect(result.reasons.length).toEqual(1);
        expect(result.reasons[0]).not.toContain('Tool "verify-command" failed');
        expect(result.reasons[0]).toContain('Verification command failed');
    }

    @Test('passes a successful verify-command without falsifying')
    async passesSuccessfulVerifyCommand() {
        const ledger = this.ledger();
        ledger.record({
            toolName: 'verify-command',
            verification: 'verify-command',
            status: 'success',
            exitCode: 0,
            inputSummary: 'verify typecheck in /w/app'
        });

        const gate = new VerificationGate();
        const result = gate.verify(ledger, 0);

        expect(result.falsified).toEqual(false);
        expect(result.falsifiedEvidence.length).toEqual(0);
    }

    @Test('appends a bounded output tail to the falsification reason')
    async appendsOutputTailToReason() {
        const ledger = this.ledger();
        const tail = 'src/a.ts:1: error TS2322 type mismatch';
        const output = `${'a'.repeat(300)}${tail}`;
        ledger.record({
            toolName: 'verify-command',
            verification: 'verify-command',
            status: 'error',
            exitCode: 2,
            outputSummary: output
        });

        const gate = new VerificationGate();
        const result = gate.verify(ledger, 0);

        expect(result.reasons[0]).toContain(tail);
        expect(result.reasons[0]).toContain('…');
    }

    @Test('does not falsify verify-command entries recorded before startIndex')
    async respectsStartIndex() {
        const ledger = this.ledger();
        ledger.record({
            toolName: 'verify-command',
            verification: 'verify-command',
            status: 'error',
            exitCode: 1
        });

        const gate = new VerificationGate();
        const result = gate.verify(ledger, 1);

        expect(result.falsified).toEqual(false);
    }
}

@Suite('Verification commands at runtime (P79)')
export class RuntimeVerificationCommandsTest {
    @Test('a failing package verification command falsifies the round and injects a repair prompt')
    async failingVerifyCommandInjectsRepairPrompt() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'node -e "process.exit(3)"' });
            const editedFile = join(pkgDir, 'src', 'x.ts');
            const fileAdapter = new MemoryFileAdapter();
            fileAdapter.seed(editedFile, '// x');
            const tool = new WriteTool(editedFile, fileAdapter, '// changed');
            const model = new WriteOnceModelAdapter();
            const { runtime, ctx } = await buildRuntime(
                model,
                new WriteToolRegistry(tool),
                { maxToolRounds: 8, verification: { enabled: true, autoScripts: ['typecheck'], timeoutMs: 30000 } },
                fileAdapter,
                new FileSnapshotStore()
            );
            try {
                await ctx.get(SessionStore).setWorkspace('s1', root);
                const result = await runtime.runTurn('s1', 'write it');

                expect(result.message.content).toEqual('done');
                const prompts = injectedRepairPrompts(model);
                expect(prompts.length).toEqual(1);
                expect(prompts[0]).toContain('Verification command failed');
                expect(prompts[0]).toContain('exit 3');
                expect(prompts[0]).toContain('typecheck');
            } finally { await ctx.close(); }
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('verification can be disabled without breaking the turn')
    async disabledVerificationRunsCleanTurn() {
        const root = makeTempWorkspace();
        try {
            const pkgDir = writePackage(root, 'app', { typecheck: 'node -e "process.exit(3)"' });
            const editedFile = join(pkgDir, 'src', 'x.ts');
            const fileAdapter = new MemoryFileAdapter();
            fileAdapter.seed(editedFile, '// x');
            const tool = new WriteTool(editedFile, fileAdapter, '// changed');
            const model = new WriteOnceModelAdapter();
            const { runtime, ctx } = await buildRuntime(
                model,
                new WriteToolRegistry(tool),
                { maxToolRounds: 8, verification: { enabled: false } },
                fileAdapter,
                new FileSnapshotStore()
            );
            try {
                await ctx.get(SessionStore).setWorkspace('s1', root);
                const result = await runtime.runTurn('s1', 'write it');

                expect(result.message.content).toEqual('done');
                expect(injectedRepairPrompts(model).length).toEqual(0);
            } finally { await ctx.close(); }
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }
}
