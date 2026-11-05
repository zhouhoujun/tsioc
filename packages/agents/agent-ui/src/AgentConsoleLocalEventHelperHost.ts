import type { TranslatorService } from '@tsdi/i18n';
import type { AgentConsolePendingQuestion, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { formatToolEventRow, resolveAgentToolLabel } from './AgentConsoleStreamHelpers';

/** Pure helper surface shared by local event bindings. */
export abstract class AgentConsoleLocalEventHelperHost {
    protected abstract readonly state: AgentConsoleSessionState;
    protected abstract readonly translator?: TranslatorService;

    protected normalizePlanTodos(output: any): Array<{ id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }> {
        const todos = Array.isArray(output?.todos) ? output.todos : [];
        return todos
            .map((item: any) => ({
                id: String(item?.id || '').trim(),
                content: String(item?.content || '').trim(),
                status: this.normalizeTodoStatus(item?.status)
            }))
            .filter((item: { id: string; content: string }) => !!item.id && !!item.content);
    }

    protected normalizePendingQuestion(output: any): AgentConsolePendingQuestion | null {
        const question = String(output?.question || '').trim();
        if (!question) {
            return null;
        }
        return {
            questionId: this.resolveQuestionId(output, question),
            sessionId: String(output?.sessionId || this.state.sessionId),
            question,
            options: Array.isArray(output?.options) ? output.options.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
            context: typeof output?.context === 'string' && output.context.trim() ? output.context.trim() : undefined,
            severity: ['low', 'medium', 'high'].includes(output?.severity) ? output.severity : 'medium',
            createdAt: Number(output?.createdAt) || Date.now(),
            updatedAt: Number(output?.updatedAt) || Date.now(),
            expiresAt: Number(output?.expiresAt) || undefined,
            status: 'pending'
        };
    }

    protected resolveQuestionId(output: any, question: string): string {
        const explicit = String(output?.questionId || '').trim();
        return explicit || `legacy-question-${String(output?.sessionId || this.state.sessionId)}-${question}`;
    }

    protected normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
        switch (String(status || '').trim()) {
            case 'in_progress':
            case 'completed':
            case 'cancelled':
                return status as 'in_progress' | 'completed' | 'cancelled';
            default:
                return 'pending';
        }
    }

    protected describeToolTimelineEvent(toolName: string, inputSummary?: string, outputSummary?: string, error?: string): string {
        return formatToolEventRow(toolName, inputSummary, outputSummary, error, this.translator);
    }

    protected describeToolName(toolName: string): string {
        return resolveAgentToolLabel(this.translator, toolName);
    }

    protected describeToolActivity(toolName: string, status: 'running' | 'completed'): string {
        const name = this.describeToolName(toolName);
        return status === 'running'
            ? (this.translator?.translate('agent.tool.invoked', { label: name }) || `Running ${name}`)
            : (this.translator?.translate('agent.tool.completed', { label: name }) || `${name} completed`);
    }

    protected truncateNotification(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > 120 ? `${text.slice(0, 120)}...` : text;
    }

    protected resolveToolEventKey(toolName: string, toolCallId?: string, receiptId?: string): string {
        return toolCallId || receiptId ? `tool:${toolCallId || receiptId}` : `tool:${toolName}`;
    }
}
