import { Injectable } from '@tsdi/ioc';
import { AgentEditorBridge, AgentEditorResult } from '@tsdi/agent-ui';
import { loadSandboxSpawnModule } from '@tsdi/agent';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * P129 (G53): node host implementation of the external editor bridge.
 *
 * Resolves $VISUAL > $EDITOR > platform default (vim/nano on posix,
 * notepad.exe on win32), seeds a temporary file with the current draft,
 * spawns the editor and waits for it to exit, then reads the buffer back.
 * The editor command is split with shell-style quoting so paths with spaces
 * survive; the editor itself is spawned without a shell wrapper.
 */
@Injectable()
export class NodeAgentEditorBridge implements AgentEditorBridge {
    readonly available = true;

    async open(initial: string): Promise<AgentEditorResult> {
        const editor = this.resolveEditor();
        if (!editor) {
            return { cancelled: true, content: undefined };
        }
        const directory = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'tsdi-agent-editor-'));
        const file = path.join(directory, 'draft.txt');
        try {
            await fsPromises.writeFile(file, initial || '', 'utf8');
            const { spawn } = await loadSandboxSpawnModule();
            const exitCode = await new Promise<number | null>((resolve) => {
                let settled = false;
                const child = spawn(editor.command, editor.args, {
                    cwd: directory,
                    env: process.env,
                    stdio: 'inherit'
                });
                child.on('close', (code: number | null) => {
                    if (!settled) {
                        settled = true;
                        resolve(code);
                    }
                });
                child.on('error', () => {
                    if (!settled) {
                        settled = true;
                        resolve(null);
                    }
                });
            });
            if (exitCode !== 0) {
                return { cancelled: true };
            }
            const content = await fsPromises.readFile(file, 'utf8');
            return {
                content,
                cancelled: content === initial
            };
        } catch {
            return { cancelled: true };
        } finally {
            await fsPromises.rm(directory, { recursive: true, force: true }).catch(() => undefined);
        }
    }

    protected resolveEditor(): { command: string; args: string[] } | undefined {
        const spec = (process.env.VISUAL || process.env.EDITOR || '').trim();
        if (spec) {
            const parts = splitShellWords(spec);
            if (parts.length) {
                return { command: parts[0], args: [...parts.slice(1), 'draft.txt'] };
            }
        }
        if (process.platform === 'win32') {
            return { command: 'notepad.exe', args: ['draft.txt'] };
        }
        const candidates = [
            { command: 'vim', args: [] },
            { command: 'nano', args: [] },
            { command: 'vi', args: [] },
            { command: 'code', args: ['--wait'] }
        ];
        for (const candidate of candidates) {
            if (commandExists(candidate.command)) {
                return { command: candidate.command, args: [...candidate.args, 'draft.txt'] };
            }
        }
        return undefined;
    }
}

function splitShellWords(value: string): string[] {
    const words: string[] = [];
    let current = '';
    let quote: string | null = null;
    let escaped = false;
    for (const char of value.trim()) {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            continue;
        }
        if (quote) {
            if (char === quote) quote = null;
            else current += char;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        if (char === ' ' || char === '\t') {
            if (current) {
                words.push(current);
                current = '';
            }
            continue;
        }
        current += char;
    }
    if (escaped) current += '\\';
    if (current) words.push(current);
    return words;
}

function commandExists(command: string): boolean {
    const pathEnv = process.env.PATH || '';
    const extensions = process.platform === 'win32'
        ? ['.exe', '.cmd', '.bat', '']
        : [''];
    const directories = pathEnv.split(path.delimiter).filter(Boolean);
    return directories.some(directory => extensions.some(extension => {
        try {
            fs.accessSync(path.join(directory, command + extension));
            return true;
        } catch {
            return false;
        }
    }));
}
