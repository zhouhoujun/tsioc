import type { AgentMessage } from '@tsdi/agent';
import type { AgentUiTranslator } from './agent-ui.i18n';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { presentAgentConsoleSessionContent } from './AgentConsoleSessionContentPresenter';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

export type AgentConsoleActivityCategory = 'tools' | 'reasoning' | 'plan' | 'diff' | 'errors' | 'answer';

export const AGENT_CONSOLE_ACTIVITY_CATEGORIES: AgentConsoleActivityCategory[] = [
    'tools', 'reasoning', 'plan', 'diff', 'errors', 'answer'
];

export interface AgentConsoleActivityJumpHost {
    state: AgentConsoleSessionState;
    translator?: AgentUiTranslator | null;
    notify(message: string): void;
    select(title: string, options: Array<{ label: string; value: string; description?: string }>, selectedIndex?: number, hint?: string): Promise<string | undefined>;
}

const CATEGORY_KEYS: Record<AgentConsoleActivityCategory, string> = {
    tools: 'activityJumpTools',
    reasoning: 'activityJumpReasoning',
    plan: 'activityJumpPlan',
    diff: 'activityJumpDiff',
    errors: 'activityJumpErrors',
    answer: 'activityJumpAnswer'
};

function categoryLabel(translator: AgentUiTranslator | null | undefined, category: AgentConsoleActivityCategory): string {
    return formatAgentUiNotice(translator, CATEGORY_KEYS[category]);
}

function isCategoryMessage(message: AgentMessage, category: AgentConsoleActivityCategory): boolean {
    const metadata: any = message?.metadata || {};
    const status = String(metadata.status || '').toLowerCase();
    if (category === 'errors') {
        return !!metadata.error || status === 'failed' || status === 'error'
            || presentAgentConsoleSessionContent(message).kind === 'error';
    }
    if (category === 'plan') {
        return message?.id === '__plan_todo_inline__' || metadata.uiKind === 'plan-todo';
    }
    if (category === 'diff') {
        return message?.id === '__file_change_inline__' || metadata.uiKind === 'file-change';
    }
    const kind = presentAgentConsoleSessionContent(message).kind;
    if (category === 'tools') {
        if (metadata.uiKind === 'command-execution') {
            // The /activity echo itself is a command row appended after the
            // handler runs; it must not become the "latest tool".
            const command = String(metadata.command || '').trim().toLowerCase();
            if (command === '/activity' || command === '/jump'
                || command.startsWith('/activity ') || command.startsWith('/jump ')) {
                return false;
            }
        }
        return kind === 'tool' || kind === 'command';
    }
    if (category === 'reasoning') {
        return kind === 'thought';
    }
    // While the turn streams there is no final row yet; jump to the live
    // partial answer instead of reporting "no answer".
    return kind === 'assistant-final' || kind === 'assistant-partial';
}

/**
 * `/activity [tools|reasoning|plan|diff|errors|answer]`
 *
 * Selects the latest transcript row of the requested category and reveals it.
 * With no argument it opens the category tabs as a select menu.
 */
export async function runActivityJumpCommand(host: AgentConsoleActivityJumpHost, args?: string): Promise<boolean> {
    const raw = String(args || '').trim();
    const requested = raw.toLowerCase() as AgentConsoleActivityCategory;
    if (raw && !AGENT_CONSOLE_ACTIVITY_CATEGORIES.includes(requested)) {
        // A typo must not silently open the category menu.
        host.notify(formatAgentUiNotice(host.translator, 'activityJumpUsage'));
        return true;
    }
    let category = raw ? requested : undefined;
    const messages = host.state.displayMessages || [];
    const countFor = (value: AgentConsoleActivityCategory): number => {
        let count = 0;
        for (const message of messages) {
            if (isCategoryMessage(message, value)) {
                count += 1;
            }
        }
        return count;
    };
    if (!category) {
        const selected = await host.select(
            formatAgentUiNotice(host.translator, 'activityJumpTitle'),
            AGENT_CONSOLE_ACTIVITY_CATEGORIES.map(value => ({
                label: `${categoryLabel(host.translator, value)} (${countFor(value)})`,
                value
            })),
            0,
            formatAgentUiNotice(host.translator, 'activityJumpHint')
        ) as AgentConsoleActivityCategory | undefined;
        if (!selected) {
            return true;
        }
        category = selected;
    }
    let target: AgentMessage | undefined;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (isCategoryMessage(messages[index], category)) {
            target = messages[index];
            break;
        }
    }
    if (!target?.id) {
        host.notify(formatAgentUiNotice(host.translator, 'activityJumpNone', { category: categoryLabel(host.translator, category) }));
        return true;
    }
    // Focusing the transcript expands the viewport window so the target row is
    // laid out; the reveal action retries after the next frame.
    host.state.setMessagesFocused(true);
    host.state.setSelectedMessageId(target.id);
    host.state.revealMessageAction?.(target.id);
    host.notify(formatAgentUiNotice(host.translator, 'activityJumped', { category: categoryLabel(host.translator, category) }));
    return true;
}
