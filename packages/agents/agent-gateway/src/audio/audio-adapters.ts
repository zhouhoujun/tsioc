import { Abstract } from '@tsdi/ioc';

/**
 * Result of a streaming transcription session (speech-to-text).
 */
export interface StreamingTranscriptionResult {
    text: string;
    language?: string;
    durationMs?: number;
}

/**
 * Streaming speech-to-text adapter.
 *
 * The gateway feeds raw audio chunks through {@link feedAudio} as they arrive
 * over the WebSocket audio channel and finalizes the transcription with
 * {@link endAudio}. Implementations may transcribe incrementally (partial
 * results) or buffer until {@link endAudio}; the contract only guarantees the
 * final text is delivered by {@link endAudio}.
 *
 * Audio chunk format: raw PCM (16-bit signed little-endian, mono, 16 kHz)
 * unless the adapter declares a different format via {@link format}.
 */
@Abstract()
export abstract class StreamingTranscriptionAdapter {
    /**
     * Declared audio format accepted by this adapter.
     * Defaults to 'pcm16k' (raw 16 kHz mono PCM).
     */
    readonly format: 'pcm16k' | 'wav' | 'webm' = 'pcm16k';

    /**
     * Feed an audio chunk into the current transcription session.
     * @param chunk raw audio bytes (base64-decoded)
     */
    abstract feedAudio(chunk: Uint8Array): Promise<void>;

    /**
     * End the current transcription session and return the final text.
     */
    abstract endAudio(): Promise<StreamingTranscriptionResult>;

    /**
     * Abort the current transcription session (client cancelled mid-stream).
     */
    abstract cancelAudio(): Promise<void>;
}

/**
 * Options for a single text-to-speech synthesis request.
 */
export interface StreamingTtsOptions {
    voice?: string;
    speed?: number;
    language?: string;
}

/**
 * Streaming text-to-speech adapter.
 *
 * The gateway synthesizes agent replies through {@link synthesizeStream} and
 * forwards the produced audio chunks back to the WebSocket client as binary
 * frames.
 */
@Abstract()
export abstract class StreamingTtsAdapter {
    /**
     * Declared audio format produced by this adapter.
     * Defaults to 'pcm16k' (raw 16 kHz mono PCM).
     */
    readonly format: 'pcm16k' | 'wav' | 'mp3' = 'pcm16k';

    /**
     * Synthesize text into a stream of audio chunks.
     */
    abstract synthesizeStream(text: string, options?: StreamingTtsOptions): AsyncIterable<Uint8Array>;
}

/**
 * Optional audio capability configuration for the gateway.
 */
export interface AgentGatewayAudioOptions {
    /**
     * Default voice identifier passed to {@link StreamingTtsAdapter}.
     */
    voice?: string;
    /**
     * Speaking speed multiplier passed to {@link StreamingTtsAdapter}.
     */
    speed?: number;
    /**
     * Language code hint passed to both adapters.
     */
    language?: string;
    /**
     * Maximum buffered audio bytes per session before the gateway forces
     * an {@link endAudio} (defensive cap, default 10 MiB).
     */
    maxBufferedBytes?: number;
}
