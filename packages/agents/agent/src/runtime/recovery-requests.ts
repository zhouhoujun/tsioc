import { AgentMessage } from './AgentMessage';
import { ModelRequest } from '../model/ModelRequest';

export const EMPTY_RESPONSE_RETRY_SYSTEM_PROMPT = 'Your previous reply was empty. Use the existing conversation context and provide a non-empty helpful answer. If the latest user message already answers a prior clarification, continue the original task directly and call tools if needed. If you still need information, ask one concise follow-up question.';
export const FOLLOW_UP_EMPTY_RESPONSE_RECOVERY_SYSTEM_PROMPT = 'The latest user message already contains follow-up context answering a prior clarification. Continue the original task directly using that follow-up context. Provide a non-empty response, and call tools if needed. Do not repeat the same clarification question.';
export const TOOL_ERROR_RECOVERY_SYSTEM_PROMPT = 'A tool call in your previous step failed. Read the tool error below, correct the arguments and continue the task. Stay inside the workspace root: prefer workspace-relative paths and never invent absolute paths outside it. Do not end the turn after a single recoverable tool error; only stop when the failure is genuinely unrecoverable, and then explain why briefly.';

export type RecoveryMessageFactory = (role: 'system', content: string) => AgentMessage;

export function findLatestFollowUpContextUserMessage(messages: AgentMessage[]): AgentMessage | undefined {
    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index];
        if (message?.role !== 'user') {
            continue;
        }
        if (String(message.content || '').includes('[Follow-up Context]')) {
            return message;
        }
    }
    return undefined;
}

export function buildEmptyResponseRetryRequest(request: ModelRequest, createMessage: RecoveryMessageFactory): ModelRequest {
    return {
        ...request,
        messages: [
            createMessage('system', EMPTY_RESPONSE_RETRY_SYSTEM_PROMPT),
            ...request.messages
        ]
    };
}

export function buildFollowUpRecoveryRequest(request: ModelRequest, createMessage: RecoveryMessageFactory): ModelRequest {
    const latestFollowUpUser = findLatestFollowUpContextUserMessage(request.messages);
    if (!latestFollowUpUser) {
        return buildEmptyResponseRetryRequest(request, createMessage);
    }
    const systemMessages = request.messages.filter(message => message.role === 'system');
    return {
        ...request,
        messages: [
            ...systemMessages,
            createMessage('system', FOLLOW_UP_EMPTY_RESPONSE_RECOVERY_SYSTEM_PROMPT),
            { ...latestFollowUpUser }
        ]
    };
}

export function buildToolErrorRecoveryRequest(request: ModelRequest, toolError: string, createMessage: RecoveryMessageFactory): ModelRequest {
    return {
        ...request,
        messages: [
            createMessage('system', `${TOOL_ERROR_RECOVERY_SYSTEM_PROMPT}\n\nTool error: ${toolError}`),
            ...request.messages
        ]
    };
}
