import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import { formatAgentUiNotice } from './agent-ui.i18n';

/**
 * `/btw <question>` — ask the model about the current conversation without
 * saving the exchange. opencode keeps the answer out of the transcript; here it
 * opens in a read-only text dialog so later turns never see it.
 */
export async function handleSideQuestion(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    const question = String(args || '').trim();
    if (!question) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sideQuestionUsage'));
        return true;
    }
    let answer = '';
    try {
        const runtime: any = ctx.runtime;
        if (typeof runtime?.askSideQuestion === 'function') {
            answer = String(await runtime.askSideQuestion(ctx.state.sessionId, question) || '');
        } else if (ctx.appRpc) {
            const result = await ctx.appRpc.request(
                'session.side_question',
                { sessionId: ctx.state.sessionId, question },
                ctx.rpcRequestContext?.()
            );
            answer = String(result?.answer || '');
        } else {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'sideQuestionUnavailable'));
            return true;
        }
    } catch (error: any) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sideQuestionFailed', {
            error: error?.message || String(error)
        }));
        return true;
    }
    const text = answer.trim();
    if (!text) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sideQuestionEmpty'));
        return true;
    }
    const lines = text.split(/\r?\n/);
    ctx.state.openTextOverlay(
        formatAgentUiNotice(ctx.translator, 'sideQuestionTitle'),
        lines,
        Math.min(24, lines.length)
    );
    return true;
}
