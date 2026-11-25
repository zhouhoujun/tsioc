import type { AgentMessage } from '../runtime/AgentMessage';

export interface NativeCompactionOptions {
    level: 'light' | 'medium' | 'deep';
    maxTokens: number;
    sessionId?: string;
}

/** P2.2: provider-native context compaction/windowing. */
export interface NativeCompactionResult {
    summary?: string;
}

export interface AgentNativeCompactionProvider {
    compact(messages: AgentMessage[], options: NativeCompactionOptions): Promise<NativeCompactionResult>;
}

export const AGENT_NATIVE_COMPACTION = Symbol('AGENT_NATIVE_COMPACTION');
