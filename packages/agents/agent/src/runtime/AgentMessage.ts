export type AgentRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentTextMessagePart {
    type: 'text';
    text: string;
}

export interface AgentImageMessagePart {
    type: 'image';
    imageUrl: string;
    mediaType?: string;
    detail?: 'auto' | 'low' | 'high';
    name?: string;
}

export interface AgentFileMessagePart {
    type: 'file';
    dataUrl: string;
    mediaType: string;
    name?: string;
}

export type AgentMessagePart = AgentTextMessagePart | AgentImageMessagePart | AgentFileMessagePart;

export interface AgentMessage {
    id: string;
    role: AgentRole;
    content: string;
    parts?: AgentMessagePart[];
    name?: string;
    toolCallId?: string;
    sectionId?: string;
    createdAt: number;
    metadata?: Record<string, any>;
}

/**
 * Metadata key marking a message that was imported into a session from a child
 * (delegated) session for display only. The message stays in the session store so
 * the console can render the sub-agent's work inline, but it MUST be excluded from
 * the model-facing transcript: the sub-agent's user/assistant/tool turns copied
 * into the parent conversation sit between the parent's assistant `tool_calls`
 * message and the `spawn_agent` tool result, and providers reject the next request
 * with "An assistant message with 'tool_calls' must be followed by tool messages
 * responding to each 'tool_call_id'" (400).
 */
export const IMPORTED_MESSAGE_METADATA_KEY = 'importedFromSessionId';

/** True when `message` was imported from a child session (display-only). */
export function isImportedChildMessage(message: { metadata?: Record<string, any> } | undefined | null): boolean {
    return Boolean(message?.metadata?.[IMPORTED_MESSAGE_METADATA_KEY]);
}

export interface AgentTurnMessageInput {
    content?: string;
    parts?: AgentMessagePart[];
    metadata?: Record<string, any>;
}

export function normalizeAgentMessageParts(parts?: AgentMessagePart[] | null): AgentMessagePart[] | undefined {
    if (!Array.isArray(parts) || !parts.length) {
        return undefined;
    }
    const normalized = parts
        .map(part => {
            if (!part || typeof part !== 'object') {
                return null;
            }
            if (part.type === 'text') {
                const text = String(part.text || '');
                return text ? { type: 'text', text } satisfies AgentTextMessagePart : null;
            }
            if (part.type === 'image') {
                const imageUrl = String(part.imageUrl || '').trim();
                if (!imageUrl) {
                    return null;
                }
                return {
                    type: 'image',
                    imageUrl,
                    mediaType: part.mediaType ? String(part.mediaType).trim() || undefined : undefined,
                    detail: part.detail,
                    name: part.name ? String(part.name).trim() || undefined : undefined
                } satisfies AgentImageMessagePart;
            }
            if (part.type === 'file') {
                const dataUrl = String((part as any).dataUrl || '').trim();
                if (!dataUrl) {
                    return null;
                }
                return {
                    type: 'file',
                    dataUrl,
                    mediaType: String(part.mediaType || 'application/octet-stream').trim(),
                    name: part.name ? String(part.name).trim() || undefined : undefined
                } satisfies AgentFileMessagePart;
            }
            return null;
        })
        .filter((part): part is AgentMessagePart => !!part);
    return normalized.length ? normalized : undefined;
}

export function resolveAgentMessageParts(message?: Pick<AgentMessage, 'content' | 'parts'> | null): AgentMessagePart[] {
    const content = String(message?.content || '');
    const normalized = normalizeAgentMessageParts(message?.parts);
    if (!normalized?.length) {
        return content ? [{ type: 'text', text: content }] : [];
    }
    const hasTextPart = normalized.some(part => part.type === 'text' && !!String(part.text || '').trim());
    if (!hasTextPart && content) {
        return [{ type: 'text', text: content }, ...normalized];
    }
    return normalized;
}

export function getAgentMessageText(message?: Pick<AgentMessage, 'content' | 'parts'> | null): string {
    const content = String(message?.content || '');
    if (content) {
        return content;
    }
    return resolveAgentMessageParts(message)
        .filter((part): part is AgentTextMessagePart => part.type === 'text')
        .map(part => part.text)
        .join('\n')
        .trim();
}

export function getAgentMessageImageParts(message?: Pick<AgentMessage, 'content' | 'parts'> | null): AgentImageMessagePart[] {
    return resolveAgentMessageParts(message)
        .filter((part): part is AgentImageMessagePart => part.type === 'image');
}

/**
 * Workspace-relative paths of every file read through the `read_file` tool.
 * Used to progressively attach nearby AGENTS.md instructions once the agent
 * works inside a subtree.
 */
export function collectToolReadPaths(messages: AgentMessage[]): string[] {
    const paths = new Set<string>();
    for (const message of messages) {
        if (message.role !== 'tool' || message.name !== 'read_file') {
            continue;
        }
        let parsed: any;
        try {
            parsed = JSON.parse(message.content);
        } catch {
            continue;
        }
        if (parsed && typeof parsed.path === 'string' && parsed.path.trim()) {
            paths.add(parsed.path.trim());
        }
    }
    return [...paths];
}
