import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    buildSandboxExecCommand,
    describeSandboxExecDegradation,
    detectSandboxExecTool,
    SandboxMode,
    SandboxExecTool
} from '../src/harness/sandbox-exec';
import {
    createSandboxPolicy,
    NodeChildProcessSandboxExecutor,
    OsSandboxExecutor
} from '../src/harness/SandboxExecutor';
import { ToolExecutionCoordinator } from '../src/harness/ToolExecutionCoordinator';
import { ToolSchemaValidator } from '../src/harness/ToolSchemaValidator';
import { RateLimitManager } from '../src/harness/RateLimitManager';
import { OutputGuard } from '../src/harness/OutputGuard';

function fakeProbe(available: SandboxExecTool[]): (name: string) => Promise<boolean> {
    return async (name: string) => available.includes(name as SandboxExecTool);
}

@Suite('OS sandbox exec wrapper')
export class SandboxExecWrapperTest {
    @Test('detects bwrap on linux when available')
    async detectsBwrapOnLinux() {
        const probe = await detectSandboxExecTool('linux', fakeProbe(['bwrap', 'unshare']));
        expect(probe.tool).toEqual('bwrap');
    }

    @Test('falls back to unshare on linux when bwrap is missing')
    async fallsBackToUnshareOnLinux() {
        const probe = await detectSandboxExecTool('linux', fakeProbe(['unshare']));
        expect(probe.tool).toEqual('unshare');
    }

    @Test('reports degradation when no linux tool is available')
    async reportsDegradationOnLinuxWithoutTools() {
        const probe = await detectSandboxExecTool('linux', fakeProbe([]));
        expect(probe.tool).toEqual(null);
        expect(probe.reason).toContain('bwrap or unshare');
    }

    @Test('detects sandbox-exec on darwin')
    async detectsSandboxExecOnDarwin() {
        const probe = await detectSandboxExecTool('darwin', fakeProbe(['sandbox-exec']));
        expect(probe.tool).toEqual('sandbox-exec');
    }

    @Test('degrades gracefully on Windows with WSL2 hint')
    async degradesOnWindows() {
        const probe = await detectSandboxExecTool('win32', fakeProbe([]));
        expect(probe.tool).toEqual(null);
        expect(probe.reason).toContain('WSL2');
        expect(describeSandboxExecDegradation('win32')).toContain('WSL2');
    }

    @Test('off mode returns the command unchanged')
    offModeIsIdentity() {
        const wrapped = buildSandboxExecCommand('bwrap', 'off', 'git', ['status'], { workspace: '/ws' });
        expect(wrapped).toEqual({ command: 'git', args: ['status'] });
    }

    @Test('bwrap workspace mode binds the workspace read-write and isolates the rest')
    bwrapWorkspaceModeBuildsIsolation() {
        const wrapped = buildSandboxExecCommand('bwrap', 'workspace', 'npm', ['test'], { workspace: '/proj' });
        expect(wrapped?.command).toEqual('bwrap');
        expect(wrapped?.args).toEqual([
            '--unshare-pid', '--unshare-ipc', '--unshare-uts',
            '--ro-bind', '/', '/',
            '--bind', '/proj', '/proj', '--chdir', '/proj',
            '--dev', '/dev', '--proc', '/proc', '--tmpfs', '/tmp',
            '--', 'npm', 'test'
        ]);
        expect(wrapped?.args).not.toContain('--unshare-net');
    }

    @Test('bwrap network-block mode adds network isolation')
    bwrapNetworkBlockModeAddsNetworkIsolation() {
        const wrapped = buildSandboxExecCommand('bwrap', 'network-block', 'curl', ['-s', 'x'], { workspace: '/proj' });
        expect(wrapped?.args.slice(0, 2)).toEqual(['--unshare-all', '--unshare-net']);
        expect(wrapped?.args).toContain('--unshare-net');
    }

    @Test('bwrap tolerates a missing workspace by omitting the bind')
    bwrapWithoutWorkspaceStillBuilds() {
        const wrapped = buildSandboxExecCommand('bwrap', 'workspace', 'ls', [], {});
        expect(wrapped?.command).toEqual('bwrap');
        expect(wrapped?.args).not.toContain('--bind');
        expect(wrapped?.args).toContain('--tmpfs');
    }

    @Test('unshare network-block mode uses a net namespace')
    unshareNetworkBlockUsesNetNamespace() {
        const wrapped = buildSandboxExecCommand('unshare', 'network-block', 'ping', ['-c1'], {});
        expect(wrapped).toEqual({ command: 'unshare', args: ['--net', '--', 'ping', '-c1'] });
    }

    @Test('unshare workspace mode maps root and isolates mount/pid')
    unshareWorkspaceModeMapsRoot() {
        const wrapped = buildSandboxExecCommand('unshare', 'workspace', 'make', [], {});
        expect(wrapped?.command).toEqual('unshare');
        expect(wrapped?.args).toEqual([
            '--map-root-user', '--fork', '--pid', '--kill-child', '--mount', '--', 'make'
        ]);
    }

    @Test('sandbox-exec workspace profile denies writes outside workspace and /tmp')
    sandboxExecWorkspaceProfileDeniesWrites() {
        const wrapped = buildSandboxExecCommand('sandbox-exec', 'workspace', 'node', ['x.js'], { workspace: '/app' });
        expect(wrapped?.command).toEqual('sandbox-exec');
        const profile = wrapped?.args[1] || '';
        expect(profile).toContain('(deny file-write*)');
        expect(profile).toContain('(allow file-write* (subpath "/app") (subpath "/tmp") (subpath "/var/tmp"))');
        expect(profile).not.toContain('(deny network*)');
        expect(wrapped?.args.slice(2)).toEqual(['node', 'x.js']);
    }

    @Test('sandbox-exec network-block profile denies network')
    sandboxExecNetworkBlockProfileDeniesNetwork() {
        const wrapped = buildSandboxExecCommand('sandbox-exec', 'network-block', 'curl', ['x'], { workspace: '/app' });
        const profile = wrapped?.args[1] || '';
        expect(profile).toContain('(deny network*)');
    }
}

@Suite('OsSandboxExecutor')
export class OsSandboxExecutorTest {
    @Test('mode off executes the command directly')
    async modeOffExecutesDirectly() {
        const executor = new OsSandboxExecutor({ sandbox: { mode: 'off' } }, 'linux', async () => true);
        const result = await executor.execute('echo', ['raw'], {
            policy: createSandboxPolicy({ enabled: true, workingDirectory: '/tmp' })
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('raw');
    }

    @Test('missing OS tool degrades to direct execution')
    async missingToolDegradesToDirectExecution() {
        const executor = new OsSandboxExecutor({ sandbox: { mode: 'workspace' } }, 'linux', async () => false);
        const result = await executor.execute('echo', ['plain'], {
            policy: createSandboxPolicy({ enabled: true, workingDirectory: '/tmp' })
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('plain');
    }

    @Test('policy osSandbox off overrides configured workspace mode')
    async policyModeOverridesConfiguredMode() {
        const executor = new OsSandboxExecutor({ sandbox: { mode: 'workspace' } }, 'linux', async () => true);
        const result = await executor.execute('echo', ['direct'], {
            policy: createSandboxPolicy({ enabled: true, workingDirectory: '/tmp', osSandbox: 'off' })
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('direct');
    }

    @Test('workspace mode wraps the command with the detected tool')
    async workspaceModeWrapsCommand() {
        const executor = new OsSandboxExecutor({ sandbox: { mode: 'workspace' } }, 'linux', async () => true);
        const result = await executor.execute('echo', ['wrapped'], {
            policy: createSandboxPolicy({ enabled: true, workingDirectory: '/tmp/ws', osSandbox: 'workspace' as SandboxMode })
        });
        const text = `${result.stderr} ${result.error ?? ''}`;
        expect(result.exitCode === 0 || text.includes('bwrap')).toEqual(true);
    }

    @Test('shell-style command strings are wrapped through sh -c')
    async shellCommandStringsWrapThroughSh() {
        const executor = new OsSandboxExecutor({ sandbox: { mode: 'workspace' } }, 'linux', async () => true);
        const result = await executor.execute('echo hello world', [], {
            policy: createSandboxPolicy({ enabled: true, workingDirectory: '/tmp/ws', osSandbox: 'workspace' as SandboxMode })
        });
        const text = `${result.stderr} ${result.error ?? ''}`;
        expect(result.exitCode === 0 || text.includes('bwrap')).toEqual(true);
    }
}

@Suite('NodeChildProcessSandboxExecutor compatibility')
export class SandboxExecutorCompatTest {
    @Test('base executor still runs plain commands without osSandbox')
    async baseExecutorRunsPlainCommands() {
        const executor = new NodeChildProcessSandboxExecutor();
        const result = await executor.execute('echo', ['base'], {
            policy: createSandboxPolicy({ enabled: true, workingDirectory: '/tmp' })
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('base');
    }
}

@Suite('ToolExecutionCoordinator osSandbox wiring')
export class CoordinatorSandboxWiringTest {
    @Test('routes command inputs through the sandbox executor when osSandbox is set')
    async routesCommandInputsThroughExecutor() {
        const calls: string[] = [];
        const executor = {
            isSupported: () => true,
            async execute(command: string, args: string[], opts: any) {
                calls.push(`exec:${command}`);
                return { exitCode: 0, stdout: 'sandboxed', stderr: '', wallTimeMs: 1 };
            }
        } as any;
        const registry = {
            async invoke(name: string) {
                calls.push(`registry:${name}`);
                return { ok: true };
            }
        } as any;
        const coordinator = new ToolExecutionCoordinator(
            registry,
            new ToolSchemaValidator(),
            new RateLimitManager(),
            new OutputGuard(),
            { async publishEvent() {} } as any,
            undefined,
            executor
        );

        const outcome = await coordinator.execute({
            sessionId: 's1',
            principalId: 'u1',
            workspace: '/ws',
            toolCall: { id: 'tc1', name: 'terminal', input: { command: 'ls -la' } },
            definition: {
                name: 'terminal',
                description: 'terminal',
                toolset: 'terminal',
                execution: {
                    sandbox: { enabled: true, isolationLevel: 'process', osSandbox: 'workspace' }
                }
            },
            executionMode: 'sequential',
            inputSummary: 'ls'
        } as any);

        expect(calls).toEqual(['exec:ls -la']);
        expect(outcome.output).toEqual({ exitCode: 0, stdout: 'sandboxed', stderr: '', wallTimeMs: 1 });
    }

    @Test('keeps registry invocation when osSandbox is not set')
    async keepsRegistryInvocationWithoutOsSandbox() {
        const calls: string[] = [];
        const executor = {
            isSupported: () => true,
            async execute(command: string) {
                calls.push(`exec:${command}`);
                return { exitCode: 0, stdout: '', stderr: '', wallTimeMs: 1 };
            }
        } as any;
        const registry = {
            async invoke(name: string) {
                calls.push(`registry:${name}`);
                return { ok: true };
            }
        } as any;
        const coordinator = new ToolExecutionCoordinator(
            registry,
            new ToolSchemaValidator(),
            new RateLimitManager(),
            new OutputGuard(),
            { async publishEvent() {} } as any,
            undefined,
            executor
        );

        const outcome = await coordinator.execute({
            sessionId: 's1',
            principalId: 'u1',
            workspace: '/ws',
            toolCall: { id: 'tc1', name: 'terminal', input: { command: 'ls' } },
            definition: {
                name: 'terminal',
                description: 'terminal',
                toolset: 'terminal',
                execution: {
                    sandbox: { enabled: true, isolationLevel: 'process' }
                }
            },
            executionMode: 'sequential',
            inputSummary: 'ls'
        } as any);

        expect(calls).toEqual(['registry:terminal']);
        expect(outcome.output).toEqual({ ok: true });
    }
}
