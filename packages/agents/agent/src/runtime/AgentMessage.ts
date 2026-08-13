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

export type AgentMessagePart = AgentTextMessagePart | AgentImageMessagePart;

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
