/**
 * Conservative shell-command scanner for approval decisions.
 *
 * Only a small allow-list of read-only commands is considered safe without a
 * prompt. Anything that can execute arbitrary code, expand a command
 * substitution, write through a redirect, or is simply unknown stays `unknown`
 * so the approval policy keeps asking. Pipes/`&&` are split and every segment
 * must be read-only; a single mutating segment marks the whole command.
 */
export type ShellCommandVerdict = 'read-only' | 'mutating' | 'unknown';

const SHELL_TOOLS = new Set(['terminal', 'shell.exec', 'bash', 'sh']);

const READ_ONLY_COMMANDS = new Set([
    'pwd', 'ls', 'cat', 'head', 'tail', 'wc', 'stat', 'file', 'du', 'df', 'tree',
    'readlink', 'realpath', 'basename', 'dirname', 'md5sum', 'sha1sum', 'sha256sum', 'sha512sum',
    'cksum', 'sort', 'uniq', 'cut', 'tr', 'column', 'jq', 'diff', 'cmp', 'comm', 'join',
    'strings', 'od', 'xxd', 'hexdump', 'which', 'whereis', 'type', 'whoami', 'id', 'groups',
    'uname', 'hostname', 'date', 'uptime', 'ps', 'pgrep', 'free', 'nproc', 'lscpu', 'lsblk',
    'echo', 'printf', 'true', 'false', 'test', '[', 'grep', 'egrep', 'fgrep', 'rg', 'ag',
    'fd', 'fdfind', 'cd'
]);

const MUTATING_COMMANDS = new Set([
    'rm', 'rmdir', 'mv', 'cp', 'mkdir', 'touch', 'ln', 'chmod', 'chown', 'chgrp', 'truncate',
    'dd', 'tee', 'install', 'kill', 'pkill', 'killall', 'reboot', 'shutdown', 'systemctl',
    'service', 'mount', 'umount', 'sudo', 'su', 'curl', 'wget', 'ssh', 'scp', 'rsync', 'tar',
    'unzip', 'zip', 'make', 'cmake', 'git', 'npm', 'pnpm', 'yarn', 'pip', 'pip3', 'cargo',
    'go', 'rustc', 'gcc', 'clang', 'python', 'python3', 'node', 'ruby', 'perl', 'php',
    'sh', 'bash', 'zsh', 'fish', 'xargs', 'eval', 'exec', 'source', '.', 'env', 'nohup'
]);

const GIT_READ_ONLY = new Set([
    'status', 'log', 'diff', 'show', 'rev-parse', 'describe', 'blame', 'ls-files', 'ls-tree',
    'shortlog', 'whatchanged', 'grep', 'show-ref', 'for-each-ref', 'merge-base', 'name-rev',
    'rev-list', 'count-objects', 'fsck', 'help', 'version'
]);
const GIT_MUTATING = new Set([
    'add', 'commit', 'push', 'pull', 'fetch', 'merge', 'rebase', 'reset', 'checkout', 'switch',
    'restore', 'clean', 'rm', 'mv', 'clone', 'init', 'am', 'apply', 'cherry-pick', 'revert',
    'submodule', 'notes'
]);

export function isShellCommandTool(toolName: string): boolean {
    return SHELL_TOOLS.has(String(toolName || '').trim());
}

export function scanShellCommand(command: unknown): ShellCommandVerdict {
    const text = typeof command === 'string' ? command.trim() : '';
    if (!text) {
        return 'unknown';
    }
    const unsafe = findUnsafeExpansion(text);
    if (unsafe) {
        return unsafe;
    }
    const segments = splitShellSegments(text);
    if (!segments.length) {
        return 'unknown';
    }
    let sawUnknown = false;
    for (const segment of segments) {
        const verdict = classifySegment(segment);
        if (verdict === 'mutating') {
            return 'mutating';
        }
        if (verdict === 'unknown') {
            sawUnknown = true;
        }
    }
    return sawUnknown ? 'unknown' : 'read-only';
}

/** Redirects and command substitution are never safe to auto-approve. */
function findUnsafeExpansion(text: string): ShellCommandVerdict | undefined {
    let quote = '';
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (quote === "'") {
            if (char === "'") {
                quote = '';
            }
            continue;
        }
        if (quote === '"') {
            if (char === '\\') {
                index++;
            } else if (char === '"') {
                quote = '';
            } else if (char === '`' || (char === '$' && text[index + 1] === '(')) {
                return 'unknown';
            }
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
        } else if (char === '`' || (char === '$' && text[index + 1] === '(')) {
            return 'unknown';
        } else if (char === '>') {
            return 'mutating';
        } else if (char === '<') {
            return 'unknown';
        }
    }
    return undefined;
}

function splitShellSegments(text: string): string[] {
    const segments: string[] = [];
    let current = '';
    let quote = '';
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (quote) {
            current += char;
            if (char === '\\' && quote === '"' && index + 1 < text.length) {
                current += text[++index];
            } else if (char === quote) {
                quote = '';
            }
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            current += char;
            continue;
        }
        if (char === '\n' || char === ';' || char === '&' || char === '|') {
            segments.push(current);
            current = '';
            if ((char === '&' || char === '|') && text[index + 1] === char) {
                index++;
            }
            continue;
        }
        current += char;
    }
    segments.push(current);
    return segments.map(item => item.trim()).filter(Boolean);
}

function tokenize(segment: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let quote = '';
    for (let index = 0; index < segment.length; index++) {
        const char = segment[index];
        if (quote) {
            if (char === '\\' && quote === '"' && index + 1 < segment.length) {
                current += segment[++index];
            } else if (char === quote) {
                quote = '';
            } else {
                current += char;
            }
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
        } else if (char === '\\' && index + 1 < segment.length) {
            current += segment[++index];
        } else if (/\s/.test(char)) {
            if (current) {
                tokens.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }
    if (current) {
        tokens.push(current);
    }
    return tokens;
}

function classifySegment(segment: string): ShellCommandVerdict {
    const tokens = tokenize(segment);
    while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) {
        tokens.shift();
    }
    if (!tokens.length) {
        return 'unknown';
    }
    let command = tokens[0].split('/').pop() || '';
    if (command === 'command') {
        if (tokens[1] === '-v' || tokens[1] === '-V') {
            return 'read-only';
        }
        tokens.shift();
        command = tokens[0]?.split('/').pop() || '';
    }
    if (!command) {
        return 'unknown';
    }
    if (command === 'git') {
        return classifyGit(tokens.slice(1));
    }
    if (command === 'find') {
        return classifyFind(tokens.slice(1));
    }
    if ((command === 'npm' || command === 'pnpm' || command === 'yarn')) {
        return classifyPackageManager(tokens.slice(1));
    }
    if (command === 'node' || command === 'python' || command === 'python3') {
        return tokens.slice(1).every(token => token === '-v' || token === '--version')
            ? 'read-only'
            : 'unknown';
    }
    if (MUTATING_COMMANDS.has(command)) {
        return 'mutating';
    }
    if (READ_ONLY_COMMANDS.has(command)) {
        return 'read-only';
    }
    return 'unknown';
}

function classifyGit(args: string[]): ShellCommandVerdict {
    let index = 0;
    while (index < args.length && args[index].startsWith('-')) {
        const flag = args[index];
        index += flag === '-C' || flag === '-c' ? 2 : 1;
    }
    const sub = args[index];
    if (!sub) {
        return 'read-only';
    }
    if (GIT_READ_ONLY.has(sub)) {
        return 'read-only';
    }
    if (GIT_MUTATING.has(sub)) {
        return 'mutating';
    }
    const rest = args.slice(index + 1);
    if (sub === 'branch') {
        return rest.some(flag => ['-d', '-D', '-m', '-M', '-c', '-C', '--delete', '--move', '--copy', '--edit-description'].includes(flag))
            ? 'mutating'
            : 'read-only';
    }
    if (sub === 'tag') {
        return rest.some(flag => ['-d', '--delete', '-a', '--annotate', '-s', '--sign', '-m', '--message', '-f', '--force'].includes(flag))
            ? 'mutating'
            : 'read-only';
    }
    if (sub === 'stash' || sub === 'worktree') {
        return rest[0] === 'list' || rest[0] === 'show' ? 'read-only' : 'mutating';
    }
    if (sub === 'remote') {
        return rest.some(arg => !arg.startsWith('-')) ? 'mutating' : 'read-only';
    }
    if (sub === 'config') {
        return rest.some(flag => flag === '--get' || flag === '--get-all' || flag === '--list' || flag === '-l')
            ? 'read-only'
            : 'mutating';
    }
    return 'unknown';
}

function classifyFind(args: string[]): ShellCommandVerdict {
    const mutatingFlags = ['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls'];
    return args.some(arg => mutatingFlags.includes(arg)) ? 'mutating' : 'read-only';
}

function classifyPackageManager(args: string[]): ShellCommandVerdict {
    const sub = args.find(arg => !arg.startsWith('-'));
    if (!sub) {
        return args.includes('--version') || args.includes('-v') || args.includes('--help') ? 'read-only' : 'unknown';
    }
    if (['ls', 'list', 'view', 'info', 'outdated', 'why', 'explain'].includes(sub)) {
        return 'read-only';
    }
    if (['test', 'run', 'start', 'install', 'ci', 'uninstall', 'update', 'publish', 'add', 'remove'].includes(sub)) {
        return 'mutating';
    }
    return 'unknown';
}
