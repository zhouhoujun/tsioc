import { Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime } from '@tsdi/agent';
import {
    StreamingTranscriptionAdapter,
    StreamingTtsAdapter,
    AgentGatewayAudioOptions
} from './audio-adapters';

/**
 * Per-connection audio session state.
 */
export interface AudioSessionState {
    /**
     * Active when a voice session is open (audio frames accepted).
     */
    active: boolean;
    /**
     * Buffered raw audio bytes (base64-decoded) awaiting transcription.
     */
    buffered: Uint8Array[];
    /**
     * Total buffered bytes for the defensive cap check.
     */
    bufferedBytes: number;
    /**
     * Whether a transcription/turn is currently in flight.
     */
    processing: boolean;
}

export interface AudioSessionEvents {
    /**
     * Called with each synthesized audio chunk for the client.
     */
    onAudioChunk?: (chunk: Uint8Array) => void;
    /**
     * Called with the final transcribed text (before it is injected as a turn).
     */
    onTranscribed?: (text: string) => void;
    /**
     * Called with the agent's final reply text (before synthesis).
     */
    onReply?: (text: string) => void;
    /**
     * Called when the audio session encounters an error.
     */
    onError?: (error: Error) => void;
}

/**
 * Audio session handler — routes streaming audio frames to a transcription
 * adapter, injects the resulting text as a turn, and streams the agent reply
 * back through a TTS adapter.
 *
 * One instance is shared across WebSocket connections; the WebSocket layer
 * owns per-connection {@link AudioSessionState} instances and passes them in.
 */
@Injectable()
export class AudioSessionHandler {
    private readonly defaultOptions: Required<Pick<AgentGatewayAudioOptions, 'maxBufferedBytes'>> = {
        maxBufferedBytes: 10 * 1024 * 1024
    };

    constructor(
        private runtime: AgentRuntime,
        @Optional() private transcription?: StreamingTranscriptionAdapter | null,
        @Optional() private tts?: StreamingTtsAdapter | null,
        @Optional() private options?: AgentGatewayAudioOptions | null
    ) {
    }

    /**
     * Whether the audio pipeline is usable (both adapters available).
     */
    get isAvailable(): boolean {
        return !!this.transcription && !!this.tts;
    }

    get missingComponents(): string[] {
        const missing: string[] = [];
        if (!this.transcription) { missing.push('streaming STT adapter'); }
        if (!this.tts) { missing.push('streaming TTS adapter'); }
        return missing;
    }

    createSessionState(): AudioSessionState {
        return {
            active: false,
            buffered: [],
            bufferedBytes: 0,
            processing: false
        };
    }

    startSession(state: AudioSessionState): { ok: boolean; error?: string } {
        if (!this.isAvailable) {
            return { ok: false, error: `audio unavailable: missing ${this.missingComponents.join(' and ')}` };
        }
        state.active = true;
        state.buffered = [];
        state.bufferedBytes = 0;
        state.processing = false;
        return { ok: true };
    }

    /**
     * Feed one audio chunk into the current session.
     * Returns false when no session is active (caller should ignore the frame).
     */
    feedAudio(state: AudioSessionState, chunk: Uint8Array, events: AudioSessionEvents = {}): boolean {
        if (!state.active || state.processing || !this.transcription) {
            return false;
        }
        state.buffered.push(chunk);
        state.bufferedBytes += chunk.byteLength;
        const cap = this.options?.maxBufferedBytes ?? this.defaultOptions.maxBufferedBytes;
        if (state.bufferedBytes >= cap) {
            void this.endSession(state, events);
        }
        return true;
    }

    /**
     * End the current session: transcribe buffered audio, inject the text as a
     * turn, and stream the reply back as audio chunks.
     * @param sessionId owning session id, or undefined for a new ad-hoc session
     */
    async endSession(state: AudioSessionState, events: AudioSessionEvents = {}, sessionId?: string): Promise<void> {
        if (!state.active || state.processing || !this.transcription) {
            return;
        }
        state.active = false;
        state.processing = true;
        const chunks = state.buffered;
        state.buffered = [];
        state.bufferedBytes = 0;
        try {
            for (const chunk of chunks) {
                await this.transcription.feedAudio(chunk);
            }
            const result = await this.transcription.endAudio();
            const text = result.text?.trim();
            if (!text) {
                events.onError?.(new Error('audio transcription produced no text'));
                return;
            }
            events.onTranscribed?.(text);

            const reply = await this.runtime.runTurn(sessionId ?? `audio-${Date.now()}`, text);
            const replyText = reply?.message?.content ?? '';
            events.onReply?.(replyText);
            await this.streamReply(replyText, events);
        } catch (error: any) {
            events.onError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
            state.processing = false;
        }
    }

    /**
     * Cancel the current session without injecting a turn.
     * Any in-flight transcription is aborted and buffered audio is discarded.
     */
    async cancelSession(state: AudioSessionState): Promise<void> {
        state.active = false;
        state.processing = false;
        state.buffered = [];
        state.bufferedBytes = 0;
        await this.transcription?.cancelAudio().catch(() => undefined);
    }

    private async streamReply(replyText: string, events: AudioSessionEvents): Promise<void> {
        if (!replyText || !this.tts || !events.onAudioChunk) {
            return;
        }
        for await (const chunk of this.tts.synthesizeStream(replyText, {
            voice: this.options?.voice,
            speed: this.options?.speed,
            language: this.options?.language
        })) {
            events.onAudioChunk?.(chunk);
        }
    }
}
