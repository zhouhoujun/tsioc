import { spawn } from 'child_process';
import { LspServerOptions } from './types';

/**
 * Language-server install mapping and availability checks (G22, P89).
 *
 * Each entry maps a file extension to the server binary it expects and the
 * commands needed to install that binary. The mapping mirrors the common
 * auto-installable LSP servers (npm/brew/pip/go) used by opencode-style LSP
 * configs; operators can override it per server through
 * `LspServerOptions.install`.
 */
export interface LspInstallSpec {
    extension: string;
    command: string;
    installCommands: string[];
    packageHint: string;
}

const DEFAULT_INSTALLS: LspInstallSpec[] = [
    {
        extension: '.ts',
        command: 'typescript-language-server',
        installCommands: ['npm', 'install', '-g', 'typescript-language-server'],
        packageHint: 'npm install -g typescript-language-server'
    },
    {
        extension: '.tsx',
        command: 'typescript-language-server',
        installCommands: ['npm', 'install', '-g', 'typescript-language-server'],
        packageHint: 'npm install -g typescript-language-server'
    },
    {
        extension: '.js',
        command: 'typescript-language-server',
        installCommands: ['npm', 'install', '-g', 'typescript-language-server'],
        packageHint: 'npm install -g typescript-language-server'
    },
    {
        extension: '.jsx',
        command: 'typescript-language-server',
        installCommands: ['npm', 'install', '-g', 'typescript-language-server'],
        packageHint: 'npm install -g typescript-language-server'
    },
    {
        extension: '.py',
        command: 'pyright-langserver',
        installCommands: ['npm', 'install', '-g', 'pyright'],
        packageHint: 'npm install -g pyright'
    },
    {
        extension: '.go',
        command: 'gopls',
        installCommands: ['go', 'install', 'golang.org/x/tools/gopls@latest'],
        packageHint: 'go install golang.org/x/tools/gopls@latest'
    },
    {
        extension: '.rs',
        command: 'rust-analyzer',
        installCommands: ['rustup', 'component', 'add', 'rust-analyzer'],
        packageHint: 'rustup component add rust-analyzer'
    },
    {
        extension: '.json',
        command: 'vscode-json-languageserver',
        installCommands: ['npm', 'install', '-g', 'vscode-langservers-extracted'],
        packageHint: 'npm install -g vscode-langservers-extracted'
    },
    {
        extension: '.html',
        command: 'vscode-html-languageserver',
        installCommands: ['npm', 'install', '-g', 'vscode-langservers-extracted'],
        packageHint: 'npm install -g vscode-langservers-extracted'
    },
    {
        extension: '.css',
        command: 'vscode-css-languageserver',
        installCommands: ['npm', 'install', '-g', 'vscode-langservers-extracted'],
        packageHint: 'npm install -g vscode-langservers-extracted'
    },
    {
        extension: '.md',
        command: 'markdown-language-server',
        installCommands: ['npm', 'install', '-g', 'markdown-language-server'],
        packageHint: 'npm install -g markdown-language-server'
    },
    {
        extension: '.sh',
        command: 'bash-language-server',
        installCommands: ['npm', 'install', '-g', 'bash-language-server'],
        packageHint: 'npm install -g bash-language-server'
    },
    {
        extension: '.bash',
        command: 'bash-language-server',
        installCommands: ['npm', 'install', '-g', 'bash-language-server'],
        packageHint: 'npm install -g bash-language-server'
    }
];

const DEFAULT_BY_EXTENSION = new Map(DEFAULT_INSTALLS.map(spec => [spec.extension, spec]));
const DEFAULT_BY_COMMAND = new Map<string, LspInstallSpec>();
for (const spec of DEFAULT_INSTALLS) {
    if (!DEFAULT_BY_COMMAND.has(spec.command)) {
        DEFAULT_BY_COMMAND.set(spec.command, spec);
    }
}

export type CommandAvailabilityChecker = (command: string) => Promise<boolean>;
export type InstallCommandRunner = (commands: string[], command: string) => Promise<void>;

const AVAILABILITY_CHECK_TIMEOUT_MS = 5000;
const INSTALL_TIMEOUT_MS = 120_000;

function defaultAvailabilityChecker(command: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
        const isWin = process.platform === 'win32';
        const bin = isWin ? 'where' : 'sh';
        const args = isWin ? [command] : ['-c', `command -v "${command}"`];
        const child = spawn(bin, args, { stdio: 'ignore' });
        const timer = setTimeout(() => {
            child.kill();
            resolve(false);
        }, AVAILABILITY_CHECK_TIMEOUT_MS);
        child.on('error', () => {
            clearTimeout(timer);
            resolve(false);
        });
        child.on('exit', code => {
            clearTimeout(timer);
            resolve(code === 0);
        });
    });
}

function defaultInstallRunner(commands: string[], _command: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(commands[0], commands.slice(1), { stdio: 'pipe' });
        let stderr = '';
        child.stderr?.on('data', chunk => {
            stderr += String(chunk);
        });
        const timer = setTimeout(() => {
            child.kill();
            reject(new Error(`LSP server install timed out after ${INSTALL_TIMEOUT_MS}ms.`));
        }, INSTALL_TIMEOUT_MS);
        child.on('error', err => {
            clearTimeout(timer);
            reject(err);
        });
        child.on('exit', code => {
            clearTimeout(timer);
            if (code === 0) {
                resolve();
                return;
            }
            const detail = stderr.trim() ? `: ${stderr.trim().slice(-200)}` : '';
            reject(new Error(`LSP server install failed with exit code ${code ?? 'null'}${detail}`));
        });
    });
}

/**
 * Resolves the install spec for an extension or server and drives
 * availability checks + auto-installation.
 */
export class LspInstallManager {
    constructor(
        private checkCommand: CommandAvailabilityChecker = defaultAvailabilityChecker,
        private runInstall: InstallCommandRunner = defaultInstallRunner
    ) {
    }

    specForExtension(extension: string): LspInstallSpec | undefined {
        const trimmed = extension.trim().toLowerCase();
        const key = trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
        return DEFAULT_BY_EXTENSION.get(key);
    }

    specForCommand(command: string): LspInstallSpec | undefined {
        return DEFAULT_BY_COMMAND.get(command);
    }

    async isAvailable(command: string): Promise<boolean> {
        return this.checkCommand(command);
    }

    /**
     * Ensure the server binary for `server` is available. When the binary is
     * missing and `autoInstall` is true, runs the resolved install commands
     * and re-checks. Returns availability plus an install hint for callers.
     */
    async ensureAvailable(
        server: LspServerOptions,
        extension: string,
        autoInstall?: boolean | 'prompt'
    ): Promise<{ available: boolean; installed?: boolean; hint?: string; error?: string; }> {
        if (await this.isAvailable(server.command)) {
            return { available: true };
        }
        const spec = this.resolveSpec(server, extension);
        const hint = spec
            ? `Install it with: ${spec.packageHint}`
            : `The '${server.command}' executable was not found on PATH. Install it and ensure it is reachable, or add an 'install' command to the server config.`;
        if (autoInstall !== true || !spec) {
            return { available: false, hint };
        }
        try {
            await this.runInstall(spec.installCommands, server.command);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { available: false, hint, error: message };
        }
        if (await this.isAvailable(server.command)) {
            return { available: true, installed: true };
        }
        return { available: false, hint };
    }

    private resolveSpec(server: LspServerOptions, extension: string): LspInstallSpec | undefined {
        if (Array.isArray(server.install) && server.install.length > 0) {
            const commands = server.install.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
            if (commands.length > 0) {
                return {
                    extension: this.normalizeExtension(extension),
                    command: server.command,
                    installCommands: commands,
                    packageHint: commands.join(' ')
                };
            }
        }
        if (typeof server.install === 'string' && server.install.trim()) {
            return {
                extension: this.normalizeExtension(extension),
                command: server.command,
                installCommands: [server.install.trim()],
                packageHint: server.install.trim()
            };
        }
        return this.specForCommand(server.command) ?? this.specForExtension(extension);
    }

    private normalizeExtension(extension: string): string {
        const trimmed = extension.trim().toLowerCase();
        return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
    }
}
