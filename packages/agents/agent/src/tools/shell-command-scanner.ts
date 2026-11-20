/**
 * Opt-in shell command scanner.
 *
 * The default approval rules gate every `terminal` call, including harmless
 * inspection commands such as `git status`. When the workspace policy enables
 * `approval.readOnlyShell`, commands that are provably read-only skip the
 * approval prompt. Everything ambiguous stays gated:
 *
 * - any pipe, redirect, command substitution, chaining or subshell syntax;
 * - unknown executables (including absolute paths outside the system bin dirs);
 * - mutating flags/subcommands of otherwise read-only tools.
 *
 * The scanner is deliberately conservative: a false negative only means the
 * user sees an approval prompt, while a false positive would silently run a
 * command the user expected to approve. Do not broaden it without tests that
 * cover the destructive variants.
 */

export type ShellCommandScanReason =
    | 'read-only'
    | 'empty'
    | 'shell-syntax'
    | 'unknown-command'
    | 'unsafe-arguments';

export interface ShellCommandScanResult {
    readOnly: boolean;
    reason: ShellCommandScanReason;
    /** Executable basename when one was recognized. */
    program?: string;
    /** Second token for tools with subcommands (`git`, `find`, ...). */
    subcommand?: string;
}

const SAFE_PROGRAMS = new Set([
    'ls', 'pwd', 'cat', 'head', 'tail', 'wc', 'stat', 'file', 'du', 'df', 'tree',
    'grep', 'rg', 'egrep', 'fgrep', 'diff', 'cmp', 'sort', 'uniq', 'cut', 'tr',
    'basename', 'dirname', 'realpath', 'readlink', 'which', 'whereis', 'type',
    'echo', 'printf', 'true', 'false', 'test', 'date', 'uname', 'whoami', 'id', 'hostname'
]);

/** `git` subcommands that only read repository state (subject to flag checks). */
const GIT_READ_SUBCOMMANDS = new Set([
    'status', 'diff', 'log', 'show', 'rev-parse', 'ls-files', 'blame', 'describe',
    'shortlog', 'grep', 'reflog', 'branch', 'tag', 'remote', 'stash', 'config'
]);

/** Flags that turn `git branch` / `git tag` / `git remote` / logs into writes. */
const GIT_WRITE_FLAGS = /^(-d|-D|-m|-M|-c|-C|-f|-u|--delete|--force|--move|--copy|--set-upstream|--unset|--add|--replace-all|--unset-all|--edit|--output)\b/;

const SAFE_GIT_CONFIG_FLAGS = new Set(['--get', '--get-all', '--get-regexp', '--list', '-l', '--show-origin', '--show-scope']);

/** Flags that make `git branch` / `git tag` a listing instead of a create. */
const GIT_LIST_FLAGS = /^(-a|-r|-v|-vv|--all|--remotes|--verbose|--list|-l|--show-current|--contains|--no-contains|--merged|--no-merged|--points-at)\b/;

const SHELL_SYNTAX = /[|&;<>()`$\\\n\r{}()[\]]/;

/** `find` can execute or delete; only the plain traversal form is read-only. */
const FIND_UNSAFE = /^-(exec|execdir|ok|okdir|delete|fprint|fprint0|fprintf|fls)\b/;

const PROGRAM_UNSAFE_ARGS: Record<string, RegExp> = {
    date: /^(-s|--set)\b/,
    sort: /^(-o|--output|--compress-program)\b|^-o.+/,
    tree: /^(-o|--output)\b/,
    hostname: /^(-F|--file)\b/,
    rg: /^--pre\b/
};

function executableName(token: string): string | undefined {
    if (!token) {
        return undefined;
    }
    if (!token.includes('/')) {
        return token;
    }
    // Allow the canonical system locations only: an arbitrary path named `ls`
    // (e.g. `/tmp/evil/ls`) must not inherit the read-only verdict.
    return /^(?:\/usr)?\/bin\/[^/]+$|^\/usr\/local\/bin\/[^/]+$/.test(token)
        ? token.split('/').pop()
        : undefined;
}

function splitArgs(text: string): string[] {
    return text.trim().split(/\s+/).filter(Boolean);
}

function argsAfter(args: string[], index: number): string[] {
    return args.slice(index);
}

function gitIsReadOnly(subcommand: string, args: string[]): boolean {
    if (!GIT_READ_SUBCOMMANDS.has(subcommand)) {
        return false;
    }
    if (args.some(arg => GIT_WRITE_FLAGS.test(arg))) {
        return false;
    }
    switch (subcommand) {
        case 'branch':
        case 'tag': {
            // `git branch <name>` / `git tag <name>` create refs; positional
            // arguments are only read-only as patterns of a listing form
            // (`git branch -a`, `git tag -l "v*"`).
            return !args.length || args.some(arg => GIT_LIST_FLAGS.test(arg));
        }
        case 'remote': {
            if (!args.length) {
                return true;
            }
            if (args.every(arg => arg === '-v' || arg === '--verbose')) {
                return true;
            }
            return args[0] === 'show' && !args.slice(1).some(arg => arg.startsWith('-'));
        }
        case 'stash':
            return !args.length || args[0] === 'list' || args[0] === 'show';
        case 'reflog':
            return !args.length || args[0] === 'show';
        case 'config': {
            // `git config key` reads, `git config key value` writes.
            const positional = args.filter(arg => !arg.startsWith('-'));
            if (args.some(arg => arg.startsWith('-') && !SAFE_GIT_CONFIG_FLAGS.has(arg))) {
                return false;
            }
            return positional.length <= 1;
        }
        default:
            return true;
    }
}

/**
 * Inspect a shell command and decide whether it is read-only. Never runs or
 * rewrites the command; the caller keeps the original string.
 */
export function inspectShellCommand(command: unknown): ShellCommandScanResult {
    if (typeof command !== 'string' || !command.trim()) {
        return { readOnly: false, reason: 'empty' };
    }
    const text = command.trim();
    if (SHELL_SYNTAX.test(text)) {
        return { readOnly: false, reason: 'shell-syntax' };
    }
    const [rawProgram, ...args] = splitArgs(text);
    const program = executableName(rawProgram);
    if (!program || (!SAFE_PROGRAMS.has(program) && program !== 'git' && program !== 'find')) {
        return { readOnly: false, reason: 'unknown-command' };
    }
    if (program === 'git') {
        const subcommand = args[0];
        if (!subcommand || !gitIsReadOnly(subcommand, argsAfter(args, 1))) {
            return { readOnly: false, reason: 'unsafe-arguments', program, subcommand };
        }
        return { readOnly: true, reason: 'read-only', program, subcommand };
    }
    if (program === 'find' && args.some(arg => FIND_UNSAFE.test(arg))) {
        return { readOnly: false, reason: 'unsafe-arguments', program };
    }
    const unsafe = PROGRAM_UNSAFE_ARGS[program];
    if (unsafe && args.some(arg => unsafe.test(arg))) {
        return { readOnly: false, reason: 'unsafe-arguments', program };
    }
    // `hostname <name>` changes the host name; only flag inspection is safe.
    if (program === 'hostname' && args.some(arg => !arg.startsWith('-'))) {
        return { readOnly: false, reason: 'unsafe-arguments', program };
    }
    return { readOnly: true, reason: 'read-only', program };
}

/** The command string of an approval input, if the tool exposes one. */
export function approvalCommand(input: any): string | undefined {
    if (typeof input === 'string') {
        return input;
    }
    if (!input || typeof input !== 'object') {
        return undefined;
    }
    for (const key of ['command', 'cmd', 'script']) {
        const value = (input as Record<string, unknown>)[key];
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }
    return undefined;
}
