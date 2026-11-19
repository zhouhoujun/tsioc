import type { AgentMessage } from '@tsdi/agent';

/**
 * Slash-command echoes (`✓ $ /sessions completed`) are status/toast material,
 * not conversation rows. opencode does not append a transcript row for a
 * command that opened a dialog or only produced a notice, and the same is true
 * here: dialogs, notices and the status line already carry the feedback.
 *
 * Failed rows stay visible because they carry the actionable error, and shell
 * command executions (`npm test`) stay part of the turn's execution narrative.
 */
export function shouldProjectCommandExecution(message: AgentMessage): boolean {
    const metadata: any = (message as any)?.metadata || {};
    const command = String(metadata.command || '').trim();
    const content = String((message as any)?.content || '').trim();
    // Only slash commands are console echoes; `command`/`args` shell rows keep
    // their execution rows even when the content starts with a glyph.
    const isSlashCommand = command.startsWith('/')
        || (!command && /^[$›>]\s*\/\S/.test(content))
        || (!command && /^\/\S/.test(content));
    if (!isSlashCommand) {
        return true;
    }
    const status = String(metadata.status || '').toLowerCase();
    // Keep failures (and the raw error tail); running/success/cancelled echoes
    // are transient feedback that the composer/status lane already owns.
    return status === 'failed' || status === 'error';
}
