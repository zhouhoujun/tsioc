import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultApprovalStrategy, inspectShellCommand, resolveAgentPolicy } from '../src';
import { resolveRuntimeApprovalManager } from '../src/runtime/approval-resolution';

@Suite('opt-in read-only shell scanner')
export class ShellCommandScannerTest {
    @Test('inspection commands are read-only')
    readOnlyCommands() {
        for (const command of [
            'ls -la',
            'pwd',
            'cat package.json',
            'head -n 20 README.md',
            'grep -rn "todo" src',
            'rg --files',
            'git status --porcelain',
            'git diff HEAD~1',
            'git log --oneline -5',
            'git show HEAD:package.json',
            'git rev-parse --show-toplevel',
            'git ls-files',
            '/usr/bin/git status',
            '/bin/ls'
        ]) {
            expect(inspectShellCommand(command)).toMatchObject({ readOnly: true, reason: 'read-only' });
        }
    }

    @Test('pipes, redirects, chaining and substitution stay gated')
    shellSyntaxStaysGated() {
        for (const command of [
            'cat file | grep x',
            'git status > out.txt',
            'git status >> out.txt',
            'ls; rm -rf build',
            'ls && rm -rf build',
            'ls || rm -rf build',
            'echo $(rm -rf build)',
            'echo `rm -rf build`',
            'echo ${HOME}',
            '(cd / && ls)',
            'ls\nrm -rf build'
        ]) {
            expect(inspectShellCommand(command)).toMatchObject({ readOnly: false, reason: 'shell-syntax' });
        }
    }

    @Test('unknown executables and absolute paths outside bin stay gated')
    unknownCommands() {
        for (const command of ['rm -rf build', 'node -e "1"', 'python script.py', './ls', '/tmp/evil/ls', 'sudo ls']) {
            expect(inspectShellCommand(command).readOnly).toEqual(false);
        }
    }

    @Test('empty commands are never read-only')
    emptyCommand() {
        expect(inspectShellCommand('')).toMatchObject({ readOnly: false, reason: 'empty' });
        expect(inspectShellCommand('   ')).toEqual({ readOnly: false, reason: 'empty' });
        expect(inspectShellCommand(undefined)).toMatchObject({ readOnly: false, reason: 'empty' });
    }

    @Test('mutating flags of read-only tools stay gated')
    mutatingFlags() {
        for (const command of [
            'git branch new-feature',
            'git branch -D old',
            'git tag v1.2.3',
            'git tag -d v1.2.3',
            'git remote add origin https://example.com/repo.git',
            'git remote remove origin',
            'git stash push',
            'git config user.email me@example.com',
            'git config --unset user.email',
            'git reflog expire --expire=now',
            'git log --output=out.txt',
            'find . -name "*.ts" -delete',
            'find . -exec rm {} +',
            'sort -o sorted.txt input.txt',
            'sort --compress-program=sh input.txt',
            'tree -o tree.txt',
            'date -s "2020-01-01"',
            'hostname evil',
            'hostname -F name.txt',
            'find . -fprint0 out',
            'rg --pre cat pattern'
        ]) {
            expect(inspectShellCommand(command).readOnly).toEqual(false);
        }
    }

    @Test('read-only git variants are still allowed')
    readOnlyGitVariants() {
        for (const command of [
            'git branch',
            'git branch -a',
            'git tag -l "v*"',
            'git remote -v',
            'git remote show origin',
            'git stash list',
            'git reflog show',
            'git config --get user.email',
            'git config user.email',
            'git config --list',
            'hostname',
            'hostname -f'
        ]) {
            expect(inspectShellCommand(command)).toMatchObject({ readOnly: true, reason: 'read-only' });
        }
    }

    @Test('the strategy only relaxes the default ask rule when opted in')
    strategyOptIn() {
        const gated = new DefaultApprovalStrategy(['shell.exec']);
        expect(gated.requires('terminal', { command: 'git status' })).toEqual(true);

        const scanner = new DefaultApprovalStrategy(['shell.exec'], false, () => true);
        expect(scanner.requires('terminal', { command: 'git status' })).toEqual(false);
        expect(scanner.requires('terminal', { command: 'git status && rm -rf build' })).toEqual(true);
        expect(scanner.requires('terminal', { command: 'rm -rf build' })).toEqual(true);
        // Non-shell inputs have no command to inspect.
        expect(scanner.requires('execute_code', { code: 'return 1' })).toEqual(true);
    }

    @Test('explicit object rules still win over the scanner')
    explicitRulesWin() {
        const ask = new DefaultApprovalStrategy([{ category: 'sandbox', action: 'ask' }], false, () => true);
        expect(ask.requires('terminal', { command: 'git status' })).toEqual(true);

        const deny = new DefaultApprovalStrategy([{ category: 'sandbox', action: 'deny' }], false, () => true);
        expect(deny.requires('terminal', { command: 'git status' })).toEqual(true);
        expect(deny.autoDenies('terminal', { command: 'git status' })).toEqual(true);

        // A later explicit allow also wins; the scanner is not consulted.
        const allow = new DefaultApprovalStrategy(['shell.exec', { category: 'sandbox', action: 'allow' }], false, () => true);
        expect(allow.requires('terminal', { command: 'rm -rf build' })).toEqual(false);
    }

    @Test('the opt-in flag is read live')
    strategyReadsFlagLive() {
        let enabled = false;
        const strategy = new DefaultApprovalStrategy(['shell.exec'], false, () => enabled);
        expect(strategy.requires('terminal', { command: 'ls' })).toEqual(true);
        enabled = true;
        expect(strategy.requires('terminal', { command: 'ls' })).toEqual(false);
    }

    @Test('live policy rules apply without rebuilding the strategy')
    strategyReadsRulesLive() {
        let rules: any[] = ['shell.exec'];
        const strategy = new DefaultApprovalStrategy(['shell.exec'], false, undefined, () => rules);
        expect(strategy.requires('terminal', { command: 'ls' })).toEqual(true);
        expect(strategy.requires('write_file', { path: 'a' })).toEqual(false);

        rules = [{ category: 'fs', action: 'deny' }];
        expect(strategy.autoDenies('write_file', { path: 'a' })).toEqual(true);
        expect(strategy.requires('terminal', { command: 'ls' })).toEqual(false);

        rules = [{ category: 'sandbox', action: 'allow' }];
        expect(strategy.requires('terminal', { command: 'ls' })).toEqual(false);
    }

    @Test('policy layering keeps the scanner flag, last explicit boolean wins')
    policyLayering() {
        expect(resolveAgentPolicy(undefined, { approval: { readOnlyShell: true } }).approval)
            .toEqual({ readOnlyShell: true });
        expect(resolveAgentPolicy(
            { approval: { readOnlyShell: true } },
            { approval: { readOnlyShell: false } }
        ).approval).toEqual({ readOnlyShell: false });
    }

    @Test('the runtime approval manager follows live policy changes')
    runtimeManager() {
        const options: any = { policy: { approval: { readOnlyShell: true } } };
        const manager: any = resolveRuntimeApprovalManager({
            required: ['shell.exec'],
            autoReview: false,
            options,
            app: {} as any,
            uuid: {} as any
        });
        expect(manager.requiresApproval('terminal', { command: 'git status' })).toEqual(false);
        options.policy.approval.readOnlyShell = false;
        expect(manager.requiresApproval('terminal', { command: 'git status' })).toEqual(true);
    }
}
