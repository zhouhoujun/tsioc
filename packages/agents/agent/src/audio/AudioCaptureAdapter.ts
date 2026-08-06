import { Abstract } from '@tsdi/ioc';

/**
 * Events delivered to the owner of an active audio capture session.
 */
export interface AudioCaptureSessionEvents {
    /**
     * Called with each raw audio chunk as it is captured.
     */
    onChunk?: (chunk: Uint8Array) => void;
    /**
     * Called when the capture source finishes naturally (before stop()).
     */
    onEnd?: () => void;
    /**
     * Called when the capture source fails.
     */
    onError?: (error: Error) => void;
}

/**
 * Optional audio capture configuration.
 */
export interface AudioCaptureAdapterOptions {
    /**
     * Declared format produced by this adapter.
     * Defaults to 'pcm16k' (raw 16 kHz mono PCM).
     */
    format?: 'pcm16k' | 'wav';
    /**
     * Sample rate hint (Hz). Defaults to 16000.
     */
    sampleRate?: number;
    /**
     * Channel count hint. Defaults to 1 (mono).
     */
    channels?: number;
}

/**
 * Audio capture adapter — captures microphone (or another source) audio and
 * streams raw chunks through {@link AudioCaptureSessionEvents}.
 *
 * One instance is shared across the console; the caller owns the capture
 * lifecycle: {@link start} begins streaming, {@link stop} ends it and
 * {@link cancel} aborts it without producing a final chunk.
 *
 * @abstract
 */
@Abstract()
export abstract class AudioCaptureAdapter {
    /**
     * Declared audio format produced by this adapter.
     */
    readonly format: 'pcm16k' | 'wav' = 'pcm16k';

    /**
     * Whether this adapter can currently capture audio.
     */
    get isAvailable(): boolean {
        return true;
    }

    /**
     * Human-readable list of missing runtime components (empty when available).
     */
    get missingComponents(): string[] {
        return [];
    }

    /**
     * Start capturing audio. Chunks are delivered through `events.onChunk`
     * until {@link stop} or {@link cancel} is called (or the source ends).
     */
    abstract start(events: AudioCaptureSessionEvents, options?: AudioCaptureAdapterOptions): Promise<void> | void;

    /**
     * Stop capturing and flush any pending buffered audio.
     */
    abstract stop(): Promise<void> | void;

    /**
     * Abort capturing immediately, discarding buffered audio.
     */
    abstract cancel(): Promise<void> | void;
}
