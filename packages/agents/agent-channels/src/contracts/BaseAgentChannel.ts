import { AgentConversationChannel } from './AgentConversationChannel';
import { ChannelCapability } from './ChannelCapability';
import { ChannelMessage } from './ChannelMessage';
import { SendMessage } from './SendMessage';
import { HealthStatus } from './HealthStatus';

/**
 * Abstract base class for channels with no-op defaults for all optional methods.
 * Concrete channels extend this and override what they support.
 */
export abstract class BaseAgentChannel implements AgentConversationChannel {
    abstract name(): string;
    abstract send(message: SendMessage): Promise<string>;
    abstract listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> | void;

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return { healthy: true };
    }

    capabilities(): ChannelCapability[] {
        return [];
    }

    supportsFreeFormAsk(): boolean {
        return false;
    }

    supportsDraftUpdates(): boolean {
        return false;
    }

    supportsMultiMessageStreaming(): boolean {
        return false;
    }

    multiMessageDelayMs(): number {
        return 0;
    }

    // ── Typing (no-op) ──

    startTyping?(channel: string, thread?: string): Promise<void> {
        return Promise.resolve();
    }

    stopTyping?(channel: string, thread?: string): Promise<void> {
        return Promise.resolve();
    }

    // ── Reactions (no-op) ──

    addReaction?(channel: string, thread: string | undefined, messageId: string, emoji: string): Promise<void> {
        return Promise.resolve();
    }

    removeReaction?(channel: string, thread: string | undefined, messageId: string, emoji: string): Promise<void> {
        return Promise.resolve();
    }

    // ── Draft (no-op) ──

    sendDraft?(channel: string, thread: string | undefined, content: string, partial: boolean): Promise<void> {
        return Promise.resolve();
    }

    updateDraft?(channel: string, thread: string | undefined, content: string): Promise<void> {
        return Promise.resolve();
    }

    finalizeDraft?(channel: string, thread: string | undefined, content: string): Promise<void> {
        return Promise.resolve();
    }

    cancelDraft?(channel: string, thread: string | undefined): Promise<void> {
        return Promise.resolve();
    }

    // ── Interactive prompts (no-op) ──

    requestChoice?(channel: string, thread: string | undefined, prompt: string, options: string[]): Promise<string> {
        return Promise.resolve(options[0] ?? '');
    }

    requestApproval?(channel: string, thread: string | undefined, prompt: string, requestId: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    // ── Message management (no-op) ──

    redactMessage?(channel: string, thread: string | undefined, messageId: string): Promise<void> {
        return Promise.resolve();
    }
}
