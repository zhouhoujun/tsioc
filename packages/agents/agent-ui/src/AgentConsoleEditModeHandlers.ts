/**
 * Edit-mode handlers for AgentConsoleComponent (P199 batch E).
 *
 * Extracted verbatim from the component: logic is unchanged and every
 * dependency arrives through the minimal `EditModeHandlerContext`. The mutable
 * edit state (target message id, last-session message id, dismiss timestamp,
 * draft/attachment snapshots) stays on the component and is reached through
 * getter/setter hooks. The escape window constant is injected so handlers do
 not depend on the component class.
 */
import { AgentMessage } from '@tsdi/agent';
import { AgentConsolePendingAttachment } from './AgentConsoleSessionState';

// ── Edit-mode handler context ────────────────────────────────────────────────

export interface EditModeHandlerContext {
    state: {
        readonly input: string;
        readonly pendingAttachments: readonly AgentConsolePendingAttachment[];
        setInput(text: string, cursor?: number): unknown;
        setPendingAttachments(attachments: AgentConsolePendingAttachment[]): unknown;
        clearPendingAttachments(): unknown;
    };
    notify(message: string, duration?: number): void;
    editEscapeWindowMs: number;
    getEditableUserMessages(): AgentMessage[];
    extractEditableMessageText(target: AgentMessage): string;
    getEditableImageParts(target: AgentMessage): Array<{ imageUrl: string; name?: string; mediaType?: string }>;
    getTargetMessageId(): string;
    setTargetMessageId(value: string): void;
    getLastSessionMessageId(): string;
    setLastSessionMessageId(value: string): void;
    getDismissedAt(): number;
    setDismissedAt(value: number): void;
    getDraftBefore(): string;
    setDraftBefore(value: string): void;
    getAttachmentsBefore(): AgentConsolePendingAttachment[];
    setAttachmentsBefore(value: AgentConsolePendingAttachment[]): void;
    getLastEscapeAt(): number;
    setLastEscapeAt(value: number): void;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function enterEditMode(ctx: EditModeHandlerContext): Promise<boolean> {
    const editable = ctx.getEditableUserMessages();
    if (!editable.length) {
        ctx.notify('No user message to edit.');
        return true;
    }
    const recentDismiss = ctx.getDismissedAt() > 0
        && (Date.now() - ctx.getDismissedAt()) <= ctx.editEscapeWindowMs;
    if (recentDismiss && ctx.getLastSessionMessageId()) {
        const index = editable.findIndex(message => message.id === ctx.getLastSessionMessageId());
        if (index > 0) {
            startEditTarget(ctx, editable[index - 1]);
            return true;
        }
        ctx.notify('Already at the first user message.');
        return true;
    }
    startEditTarget(ctx, editable[editable.length - 1]);
    return true;
}

export function startEditTarget(ctx: EditModeHandlerContext, target: AgentMessage): void {
    ctx.setAttachmentsBefore(ctx.state.pendingAttachments.slice());
    ctx.setDraftBefore(ctx.state.input);
    ctx.setTargetMessageId(target.id);
    const text = ctx.extractEditableMessageText(target);
    ctx.state.setInput(text, text.length);
    const imageParts = ctx.getEditableImageParts(target);
    if (imageParts.length) {
        ctx.state.setPendingAttachments(imageParts.map((part, index) => ({
            id: `edit-${target.id}-${index}`,
            kind: 'image',
            path: part.imageUrl,
            name: part.name || `image-${index + 1}`,
            mediaType: part.mediaType,
            imageUrl: part.imageUrl
        })));
    } else {
        ctx.state.clearPendingAttachments();
    }
    ctx.notify(`Editing message ${target.id.slice(0, 8)}… Enter to submit, Esc cancels, Esc,Esc for previous.`);
}

export function dismissEditMode(ctx: EditModeHandlerContext): boolean {
    if (!ctx.getTargetMessageId()) return true;
    ctx.setLastSessionMessageId(ctx.getTargetMessageId());
    ctx.setDismissedAt(Date.now());
    ctx.setTargetMessageId('');
    const draft = ctx.getDraftBefore();
    ctx.state.setInput(draft, draft.length);
    ctx.state.setPendingAttachments(ctx.getAttachmentsBefore());
    ctx.notify('Edit cancelled — draft restored.');
    return true;
}

// ── Idle-escape state machine & editable-message helpers ──────────────────────

export async function handleIdleEscape(ctx: EditModeHandlerContext): Promise<boolean> {
    const now = Date.now();
    const withinWindow = now - ctx.getLastEscapeAt() <= ctx.editEscapeWindowMs;
    ctx.setLastEscapeAt(now);
    if (ctx.getTargetMessageId()) {
        dismissEditMode(ctx);
        return true;
    }
    if (withinWindow) {
        ctx.setLastEscapeAt(0);
        await enterEditMode(ctx);
        return true;
    }
    return false;
}

export function getEditableUserMessages(messages: AgentMessage[]): AgentMessage[] {
    return messages.filter(message =>
        message.role === 'user'
        && message.metadata?.kind !== 'steer'
        && !!String(message.content || '').trim()
    );
}

export function extractEditableMessageText(message: AgentMessage): string {
    const content = String(message?.content || '');
    const marker = '[Mention Context]';
    if (content.startsWith(marker)) {
        const separator = content.indexOf('\n\n', marker.length);
        if (separator >= 0) {
            return content.slice(separator + 2);
        }
    }
    return content;
}

export function getEditableImageParts(message: AgentMessage): Array<{ imageUrl: string; mediaType?: string; name?: string }> {
    const images: Array<{ imageUrl: string; mediaType?: string; name?: string }> = [];
    for (const part of message?.parts || []) {
        if (part?.type === 'image' && part?.imageUrl) {
            images.push({ imageUrl: part.imageUrl, mediaType: part.mediaType, name: part.name });
        }
    }
    return images;
}
