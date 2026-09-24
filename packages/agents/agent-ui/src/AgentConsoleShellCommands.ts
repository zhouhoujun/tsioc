import { AgentMessage } from '@tsdi/agent';

export interface ShellCommandHost {
    state: any;
    shellMultilineMode: boolean;
    shellDraftLines: string[];
    isTurnInProgress(): boolean;
    notifyBusyState(message?: string): void;
    notify(message: string): void;
    invokeTerminalTool(command: string): Promise<any>;
    updateShellMessage(id: string, patch: Partial<AgentMessage>): void;
}

export async function handleShellBang(host: ShellCommandHost, value: string): Promise<boolean> {
    if (value === '!!') {
        host.shellMultilineMode = !host.shellMultilineMode;
        if (host.shellMultilineMode) {
            host.shellDraftLines = [];
            host.notify('Shell multiline draft mode: type lines, then submit with `!` to run. `!!` exits.');
        } else {
            host.notify(host.shellDraftLines.length
                ? 'Shell multiline draft discarded.'
                : 'Shell multiline draft mode exited.');
            host.shellDraftLines = [];
        }
        return true;
    }
    const command = value.slice(1).trim();
    if (!host.shellMultilineMode) {
        if (!command) {
            host.notify('Usage: `!<command>` runs a local shell command. `!!` enters multiline draft mode.');
            return true;
        }
        await runShellCommand(host, command);
        return true;
    }
    if (!command) {
        const draft = host.shellDraftLines.join('\n');
        if (!draft) {
            host.notify('Shell draft is empty. Type lines first, then submit with `!` to run.');
            return true;
        }
        host.shellDraftLines = [];
        host.shellMultilineMode = false;
        await runShellCommand(host, draft);
        return true;
    }
    host.shellDraftLines.push(command);
    host.notify(`Shell draft +${host.shellDraftLines.length} line(s). Submit with '!' alone, exit with '!!'.`);
    return true;
}

export async function runShellCommand(host: ShellCommandHost, command: string): Promise<void> {
    if (host.isTurnInProgress()) {
        host.notifyBusyState();
        return;
    }
    const messageId = `shell-${Date.now()}`;
    const shellMessage: AgentMessage = {
        id: messageId,
        role: 'tool',
        name: 'terminal',
        content: `$ ${command}`,
        createdAt: Date.now(),
        metadata: { type: 'shell', status: 'running' }
    };
    host.state.appendMessage(shellMessage);
    try {
        const result = await host.invokeTerminalTool(command);
        const stdout = String(result?.stdout ?? '');
        const stderr = String(result?.stderr ?? '');
        const exitCode = result?.exitCode;
        const body = [stdout, stderr].filter(Boolean).join('\n');
        const exitSuffix = exitCode === 0 || exitCode === undefined
            ? ''
            : `\n[exit code: ${exitCode}]`;
        host.updateShellMessage(messageId, {
            content: [`$ ${command}`, body, exitSuffix].filter(Boolean).join('\n\n'),
            metadata: {
                type: 'shell',
                status: exitCode === 0 || exitCode === undefined ? 'success' : 'failed',
                exitCode: exitCode ?? 0,
                error: exitCode !== 0 && exitCode !== undefined
            }
        });
    } catch (error: any) {
        const message = error?.message || String(error || 'Unknown error');
        host.updateShellMessage(messageId, {
            content: `$ ${command}\n\n${message}`,
            metadata: { type: 'shell', status: 'failed', error: true }
        });
    }
}
