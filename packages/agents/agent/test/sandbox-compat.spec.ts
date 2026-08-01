import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    inferToolSandboxCapability,
    resolveDefaultToolSandboxPolicy,
    resolveToolExecutionHints,
    resolveToolSandboxState,
    resolveToolSandboxPolicy,
    withSandboxWorkingDirectory
} from '../src/harness/ToolSandboxPolicy';
import { AgentToolExecutionHints } from '../src/tools/AgentTool';
import { assertSandboxCommand, buildSandboxEnv, extractCommandName, resolveSandboxPolicy } from '../../agent-tools/src/sandbox-policy';
import { findAgentWorkspaceRoot, resolveAgentWorkspacePath } from '../src/AgentWorkspacePath';

/**
 * M5-TEST: lock command/env/workspace compatibility matrix with regression tests.
 *
 * These tests pin the mapping contracts between toolset groups, sandbox capability
 * classes, default policies, env filtering rules, command extraction rules, and
 * workspace guards. Changing any mapping here is a breaking change.
 */
@Suite('Sandbox compatibility matrix')
export class SandboxCompatMatrixTest {
    @Test('toolset groups map to stable sandbox capability classes')
    toolsetGroupsMapToStableSandboxCapabilityClasses() {
        const expected: Array<[string, string]> = [
            ['filesystem', 'readonly_fs'],
            ['filesystem_write', 'workspace_write'],
            ['search', 'readonly_fs'],
            ['process', 'process_exec'],
            ['terminal', 'process_exec'],
            ['git', 'vcs_exec'],
            ['ai_cli', 'process_exec'],
            ['code_execution', 'code_exec'],
            ['http', 'network_fetch'],
            ['web', 'network_fetch'],
            ['browser', 'network_fetch'],
            ['capture', 'gui_capture']
        ];
        for (const [toolset, capability] of expected) {
            expect(inferToolSandboxCapability(toolset)).toEqual(capability);
        }
        expect(inferToolSandboxCapability('unknown_toolset')).toBeUndefined();
        expect(inferToolSandboxCapability(undefined)).toBeUndefined();
    }

    @Test('readonly fs and workspace write capabilities resolve no extra isolation policy')
    readonlyFsAndWorkspaceWriteResolveNoExtraIsolationPolicy() {
        expect(resolveDefaultToolSandboxPolicy('readonly_fs', '/workspace')).toEqual(null);
        expect(resolveDefaultToolSandboxPolicy('workspace_write', '/workspace')).toEqual(null);
    }

    @Test('process exec resolves process-level isolation with env filtering and full network')
    processExecResolvesProcessIsolationWithEnvFiltering() {
        const policy = resolveDefaultToolSandboxPolicy('process_exec', '/workspace');
        expect(policy?.enabled).toEqual(true);
        expect(policy?.isolationLevel).toEqual('process');
        expect(policy?.workingDirectory).toEqual('/workspace');
        expect(policy?.networkAccess).toEqual('full');
        expect(policy?.deniedEnvVars).toEqual(expect.arrayContaining(['OPENAI_API_KEY', 'AWS_SECRET']));
        expect(policy?.resourceLimits).toEqual(expect.objectContaining({
            wallTimeMs: 120_000,
            memoryBytes: 256 * 1024 * 1024,
            maxProcesses: 16
        }));
    }

    @Test('vcs exec mirrors process exec with workspace-bound cwd')
    vcsExecMirrorsProcessExecWithWorkspaceBoundCwd() {
        const policy = resolveDefaultToolSandboxPolicy('vcs_exec', '/workspace');
        expect(policy?.enabled).toEqual(true);
        expect(policy?.isolationLevel).toEqual('process');
        expect(policy?.workingDirectory).toEqual('/workspace');
        expect(policy?.networkAccess).toEqual('full');
        expect(policy?.resourceLimits?.maxProcesses).toEqual(16);
    }

    @Test('network fetch resolves outbound-only network access')
    networkFetchResolvesOutboundOnlyNetworkAccess() {
        const policy = resolveDefaultToolSandboxPolicy('network_fetch', '/workspace');
        expect(policy?.enabled).toEqual(true);
        expect(policy?.networkAccess).toEqual('outbound');
        expect(policy?.resourceLimits?.wallTimeMs).toEqual(60_000);
        expect(policy?.resourceLimits?.maxProcesses).toEqual(4);
    }

    @Test('gui capture resolves no network access')
    guiCaptureResolvesNoNetworkAccess() {
        const policy = resolveDefaultToolSandboxPolicy('gui_capture', '/workspace');
        expect(policy?.enabled).toEqual(true);
        expect(policy?.networkAccess).toEqual('none');
    }

    @Test('code exec resolves the strongest policy with write paths and no secrets')
    codeExecResolvesStrongestPolicyWithWritePathsAndNoSecrets() {
        const policy = resolveDefaultToolSandboxPolicy('code_exec', '/workspace');
        expect(policy?.enabled).toEqual(true);
        expect(policy?.networkAccess).toEqual('none');
        expect(policy?.allowedWritePaths).toContain('/workspace');
        expect(policy?.deniedEnvVars).toEqual(expect.arrayContaining(['OPENAI_API_KEY', 'AWS_SECRET']));
    }

    @Test('unknown capabilities and empty inputs resolve no default policy')
    unknownCapabilitiesResolveNoDefaultPolicy() {
        expect(resolveDefaultToolSandboxPolicy('unknown_capability' as any, '/workspace')).toEqual(null);
        expect(resolveDefaultToolSandboxPolicy(undefined, '/workspace')).toEqual(null);
        expect(resolveDefaultToolSandboxPolicy('', '/workspace')).toEqual(null);
    }

    @Test('execution hints infer capability and default policy from toolset')
    executionHintsInferCapabilityAndDefaultPolicyFromToolset() {
        const hints = resolveToolExecutionHints({ toolset: 'terminal' }, '/workspace');
        expect(hints?.sandboxCapability).toEqual('process_exec');
        expect(hints?.sandbox?.enabled).toEqual(true);
        expect(hints?.sandbox?.workingDirectory).toEqual('/workspace');
    }

    @Test('execution hints preserve explicit sandbox over inferred defaults')
    executionHintsPreserveExplicitSandboxOverInferredDefaults() {
        const explicit: AgentToolExecutionHints = {
            sandboxCapability: 'process_exec',
            sandbox: {
                enabled: false,
                isolationLevel: 'none',
                networkAccess: 'full'
            }
        };
        const hints = resolveToolExecutionHints({ toolset: 'terminal', execution: explicit }, '/workspace');
        expect(hints?.sandbox).toEqual(explicit.sandbox);
        expect(hints?.sandboxCapability).toEqual('process_exec');
    }

    @Test('execution hints return undefined when no capability and no execution metadata')
    executionHintsUndefinedWithoutMetadata() {
        expect(resolveToolExecutionHints({}, '/workspace')).toBeUndefined();
        expect(resolveToolExecutionHints({ toolset: 'filesystem' }, '/workspace')?.sandboxCapability).toEqual('readonly_fs');
    }

    @Test('sandbox state tracks capability, policy, support, and application flags')
    sandboxStateTracksCapabilityPolicySupportAndApplication() {
        const unsupported = resolveToolSandboxState({ toolset: 'terminal' }, '/workspace', false);
        expect(unsupported.capability).toEqual('process_exec');
        expect(unsupported.policy?.enabled).toEqual(true);
        expect(unsupported.supported).toEqual(false);
        expect(unsupported.applied).toEqual(false);

        const applied = resolveToolSandboxState({ toolset: 'terminal' }, '/workspace', true);
        expect(applied.supported).toEqual(true);
        expect(applied.applied).toEqual(true);

        const readOnly = resolveToolSandboxState({ toolset: 'filesystem' }, '/workspace', true);
        expect(readOnly.capability).toEqual('readonly_fs');
        expect(readOnly.policy).toEqual(null);
        expect(readOnly.applied).toEqual(false);
    }

    @Test('sandbox policy resolution honors explicit policy then isolation level then defaults')
    sandboxPolicyResolutionHonorsExplicitThenIsolationLevelThenDefaults() {
        const explicit = resolveToolSandboxPolicy({
            sandbox: { enabled: false, isolationLevel: 'none', networkAccess: 'none' }
        } as any, 'process_exec', '/workspace');
        expect(explicit?.enabled).toEqual(false);

        const isolationOnly = resolveToolSandboxPolicy({
            isolationLevel: 'container'
        } as any, 'process_exec', '/workspace');
        expect(isolationOnly?.isolationLevel).toEqual('container');
        expect(isolationOnly?.enabled).toEqual(true);

        const defaulted = resolveToolSandboxPolicy(undefined, 'code_exec', '/workspace');
        expect(defaulted?.enabled).toEqual(true);
        expect(defaulted?.networkAccess).toEqual('none');

        const none = resolveToolSandboxPolicy(undefined, undefined, '/workspace');
        expect(none).toEqual(null);
    }

    @Test('sandbox working directory is only injected when absent')
    sandboxWorkingDirectoryInjectedOnlyWhenAbsent() {
        const withDir = withSandboxWorkingDirectory({
            enabled: true,
            isolationLevel: 'process',
            networkAccess: 'full'
        } as any, '/workspace');
        expect(withDir.workingDirectory).toEqual('/workspace');

        const keepsOwn = withSandboxWorkingDirectory({
            enabled: true,
            isolationLevel: 'process',
            workingDirectory: '/custom',
            networkAccess: 'full'
        } as any, '/workspace');
        expect(keepsOwn.workingDirectory).toEqual('/custom');

        const noWorkspace = withSandboxWorkingDirectory({
            enabled: true,
            isolationLevel: 'process',
            networkAccess: 'full'
        } as any, undefined);
        expect(noWorkspace.workingDirectory).toBeUndefined();
    }

    @Test('env filtering blocks denied vars and honors allowlists and inherit flags')
    envFilteringBlocksDeniedAndHonorsAllowlists() {
        const inherited = resolveSandboxPolicy({
            sandbox: { inheritEnv: true, blockedEnv: ['API_KEY'] }
        } as any);
        expect(buildSandboxEnv({ PATH: '/bin', API_KEY: 'secret', HOME: '/tmp' }, inherited)).toEqual({
            PATH: '/bin',
            HOME: '/tmp'
        });

        const allowlisted = resolveSandboxPolicy({
            sandbox: { inheritEnv: true, allowedEnv: ['PATH', 'HOME'], blockedEnv: ['HOME'] }
        } as any);
        expect(buildSandboxEnv({ PATH: '/bin', HOME: '/tmp', SAFE: 'x' }, allowlisted)).toEqual({
            PATH: '/bin'
        });

        const noInherit = resolveSandboxPolicy({
            sandbox: { inheritEnv: false }
        } as any);
        expect(buildSandboxEnv({ PATH: '/bin', HOME: '/tmp' }, noInherit)).toEqual({});

        const undefinedSource = buildSandboxEnv(undefined, inherited);
        expect(undefinedSource).toEqual({});
    }

    @Test('command name extraction handles env prefixes, quotes, and paths')
    commandNameExtractionHandlesEnvPrefixesQuotesAndPaths() {
        expect(extractCommandName('node script.js')).toEqual('node');
        expect(extractCommandName('SAFE=1 node -e "console.log(1)"')).toEqual('node');
        expect(extractCommandName('/usr/bin/git status')).toEqual('git');
        expect(extractCommandName('"quoted cmd" --flag')).toEqual('quoted cmd');
        expect(extractCommandName("'single cmd' --flag")).toEqual('single cmd');
        expect(extractCommandName('   ')).toEqual('');
        expect(extractCommandName('')).toEqual('');
    }

    @Test('sandbox command assertions enforce blocked and allowed command lists')
    sandboxCommandAssertionsEnforceBlockedAndAllowedLists() {
        const open = resolveSandboxPolicy({ sandbox: { blockedCommands: ['rm'] } } as any);
        assertSandboxCommand('node script.js', open, 'terminal');
        expect(() => assertSandboxCommand('rm -rf /', open, 'terminal')).toThrow(/blocked by sandbox policy/);

        const locked = resolveSandboxPolicy({
            sandbox: { allowedCommands: ['node', 'npm'] }
        } as any);
        assertSandboxCommand('node script.js', locked, 'terminal');
        expect(() => assertSandboxCommand('python script.py', locked, 'terminal')).toThrow(/not allowed by sandbox policy/);

        const disabled = resolveSandboxPolicy({ sandbox: { enabled: false } } as any);
        assertSandboxCommand('anything', disabled, 'terminal');

        expect(() => assertSandboxCommand('', open, 'terminal')).toThrow(/non-empty/);
        expect(() => assertSandboxCommand('x'.repeat(5000), open, 'terminal')).toThrow(/sandbox limit/);
    }

    @Test('workspace resolution honors explicit workspace over discovery')
    workspaceResolutionHonorsExplicitWorkspaceOverDiscovery() {
        const adapter = {
            resolve: (...paths: string[]) => paths.filter(Boolean).join('/').replace(/\/+/g, '/'),
            join: (...paths: string[]) => paths.filter(Boolean).join('/').replace(/\/+/g, '/'),
            existsSync: (target: string) => target === '/repo/.git'
        };
        const root = findAgentWorkspaceRoot('/repo/packages/agents', adapter as any, (target: string) => target.replace(/\/[^/]+$/, '') || '/');
        expect(root).toBe('/repo');

        const explicit = resolveAgentWorkspacePath({
            explicitWorkspace: '/custom/workspace',
            currentDirectory: '/repo/packages/agents',
            fallbackWorkspace: '/fallback/workspace',
            adapter: adapter as any,
            dirname: (target: string) => target.replace(/\/[^/]+$/, '') || '/'
        });
        expect(explicit).toBe('/custom/workspace');
    }
}
