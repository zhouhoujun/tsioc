import { ChannelCapability } from './ChannelCapability';
import { ChannelMessage } from './ChannelMessage';
import { SendMessage } from './SendMessage';
import { HealthStatus } from './HealthStatus';

export interface AgentConversationChannel {
    /** Unique channel name identifier */
    name(): string;

    /** Send an outbound message, returns platform-specific message ID */
    send(message: SendMessage): Promise<string>;

    /** Register an inbound message handler */
    listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> | void;

    /** Check channel health */
    healthCheck(): Promise<HealthStatus> | HealthStatus;

    /** Declare supported capabilities */
    capabilities(): ChannelCapability[];

    /** ── Typing indicators ── */
    startTyping?(channel: string, thread?: string): Promise<void>;
    stopTyping?(channel: string, thread?: string): Promise<void>;

    /** ── Reactions ── */
    addReaction?(channel: string, thread: string | undefined, messageId: string, emoji: string): Promise<void>;
    removeReaction?(channel: string, thread: string | undefined, messageId: string, emoji: string): Promise<void>;

    /** ── Draft / streaming output ── */
    sendDraft?(channel: string, thread: string | undefined, content: string, partial: boolean): Promise<void>;
    updateDraft?(channel: string, thread: string | undefined, content: string): Promise<void>;
    finalizeDraft?(channel: string, thread: string | undefined, content: string): Promise<void>;
    cancelDraft?(channel: string, thread: string | undefined): Promise<void>;

    /** ── Interactive prompts ── */
    requestChoice?(channel: string, thread: string | undefined, prompt: string, options: string[]): Promise<string>;
    requestApproval?(channel: string, thread: string | undefined, prompt: string, requestId: string): Promise<boolean>;

    /** ── Message management ── */
    redactMessage?(channel: string, thread: string | undefined, messageId: string): Promise<void>;

    /** ── Capability queries (always present) ── */

    /** Whether this channel supports free-form natural language input (vs. structured commands) */
    supportsFreeFormAsk(): boolean;

    /** Whether draft updates (edit-in-place) are supported */
    supportsDraftUpdates(): boolean;

    /** Whether multiple messages can be sent in sequence for streaming output */
    supportsMultiMessageStreaming(): boolean;

    /** Delay in ms between multi-message streaming sends */
    multiMessageDelayMs(): number;
}
