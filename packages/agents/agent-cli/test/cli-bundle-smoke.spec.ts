import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const packageRoot = join(__dirname, '..');
const cliVersion = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version as string;

interface RunResult {
    stdout: string;
    stderr: string;
    status: number;
}

function buildBundle(): void {
    execFileSync(process.execPath, [join(packageRoot, 'scripts', 'build-bundle.mjs')], {
        cwd: packageRoot,
        encoding: 'utf8',
        timeout: 300000
    });
}

function runCli(args: string[], extraEnv: Record<string, string>): RunResult {
    const result = spawnSync(process.execPath, [join(packageRoot, 'bin', 'tsdi-agent.js'), ...args], {
        cwd: packageRoot,
        env: { ...process.env as Record<string, string>, ...extraEnv },
        encoding: 'utf8',
        timeout: 240000
    });
    return {
        stdout: String(result.stdout || ''),
        stderr: String(result.stderr || ''),
        status: result.status === null ? 1 : result.status
    };
}

@Suite('bundled CLI')
export class CliBundleSmokeTest {

    @Test('the build produces a bundle that answers --version')
    bundleRuns() {
        buildBundle();
        const result = runCli(['--version'], { TSDI_AGENT_BUNDLE: '1', TSDI_AGENT_BUNDLE_LOG: '1' });
        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toBe(cliVersion);
    }

    @Test('the bundle still exposes the builtin skills (assets copied next to it)')
    bundleKeepsBuiltinSkills() {
        buildBundle();
        const root = mkdtempSync(join(tmpdir(), 'tsdi-bundle-skills-'));
        try {
            const requests = [
                { jsonrpc: '2.0', id: 1, method: 'session.create', params: { sessionId: 'bundle-skill-session' } },
                { jsonrpc: '2.0', id: 2, method: 'tools.invoke', params: { sessionId: 'bundle-skill-session', name: 'skill_list', input: {} } }
            ];
            const run = spawnSync(process.execPath, [join(packageRoot, 'bin', 'tsdi-agent.js'), '--root', root, '--workspace', root, 'rpc-stdio'], {
                cwd: packageRoot,
                env: { ...process.env as Record<string, string>, TSDI_AGENT_BUNDLE: '1' },
                input: `${requests.map(request => JSON.stringify(request)).join('\n')}\n`,
                encoding: 'utf8',
                timeout: 240000
            });
            const lines = String(run.stdout || '').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
            const skills = lines.find(line => line.id === 2)?.result?.output?.skills || [];
            // `getBuiltinSkills()` reads `__dirname/builtin`; a bundle without the
            // copied assets silently returns 0 skills while the source path has 4.
            expect(skills.length).toBeGreaterThanOrEqual(1);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('--help is identical on the bundled and source paths')
    helpMatchesSourcePath() {
        const bundled = runCli(['--help'], { TSDI_AGENT_BUNDLE: '1' }).stdout;
        const source = runCli(['--help'], { TSDI_AGENT_BUNDLE: '0' }).stdout;
        expect(bundled).toBe(source);
        expect(bundled).toContain('Usage: tsdi-agent');
    }

    @Test('edited sources invalidate the bundle and the CLI falls back to the sources')
    editedSourceFallsBack() {
        buildBundle();
        const entry = join(packageRoot, 'src', 'cli-entry.ts');
        const future = new Date(Date.now() + 5000);
        utimesSync(entry, future, future);
        try {
            const result = runCli(['--version'], { TSDI_AGENT_BUNDLE_LOG: '1' });
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe(cliVersion);
            expect(result.stderr).toContain('source (stale: src/cli-entry.ts)');
        } finally {
            buildBundle();
        }
        const restored = runCli(['--version'], { TSDI_AGENT_BUNDLE_LOG: '1' });
        // The rebuild (which may reuse an unchanged source tree) must not have
        // left a stale stamp behind: a fresh stamp reports `bundle (fresh)`.
        expect(restored.stderr).toContain('bundle (fresh)');
    }
}
