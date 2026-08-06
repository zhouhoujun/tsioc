import { Injectable } from '@tsdi/ioc';
import { AudioCaptureAdapter, AudioCaptureSessionEvents, AudioCaptureAdapterOptions } from '@tsdi/common';

/**
 * Options for {@link MediaRecorderAudioCaptureAdapter}.
 */
export interface MediaRecorderAudioCaptureAdapterOptions extends AudioCaptureAdapterOptions {
    /**
     * MediaRecorder mime type (e.g. `audio/webm`). When omitted the browser
     * default is used.
     */
    mimeType?: string;
    /**
     * Timeslice passed to `MediaRecorder.start(timeslice)`; chunks are
     * emitted roughly every `timeslice` ms. Defaults to 1000.
     */
    timesliceMs?: number;
}

/**
 * Minimal structural typing for the browser MediaRecorder / getUserMedia
 * surfaces used by this adapter. Kept local so the package does not require
 * DOM lib types at compile time.
 */
interface MediaRecorderLike {
    start(timeslice?: number): void;
    stop(): void;
    ondataavailable: ((event: { data: BlobLike }) => void) | null;
    onstop: (() => void) | null;
    onerror: ((event: { error?: ErrorLike }) => void) | null;
}

interface BlobLike {
    size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
}

interface ErrorLike {
    message?: string;
}

interface MediaStreamLike {
    getTracks(): { stop(): void }[];
}

interface MediaDevicesLike {
    getUserMedia(constraints: { audio: boolean | object }): Promise<MediaStreamLike>;
}

/**
 * Browser audio capture adapter — captures the microphone through the
 * MediaRecorder API (`navigator.mediaDevices.getUserMedia` + `MediaRecorder`)
 * and streams audio chunks (typically webm) through
 * {@link AudioCaptureSessionEvents.onChunk}.
 *
 * Availability is probed lazily: when the browser MediaRecorder surface is
 * missing (Node.js / non-browser environments), {@link isAvailable} is
 * `false` and {@link missingComponents} names the unavailable API surface.
 * {@link start} rejects in that case instead of hanging.
 *
 * @example
 * const adapter = new MediaRecorderAudioCaptureAdapter({ mimeType: 'audio/webm' });
 * await adapter.start({
 *     onChunk: chunk => console.log('captured', chunk.byteLength, 'bytes'),
 *     onEnd: () => console.log('capture ended'),
 *     onError: error => console.error(error)
 * });
 * await adapter.stop();
 */
@Injectable()
export class MediaRecorderAudioCaptureAdapter extends AudioCaptureAdapter {
    readonly format: 'pcm16k' | 'wav' | 'webm' = 'webm';

    private recorder: MediaRecorderLike | null = null;
    private stream: MediaStreamLike | null = null;
    private session: AudioCaptureSessionEvents | null = null;
    private stopping = false;
    private cancelled = false;
    private ended = false;

    constructor(private readonly options: MediaRecorderAudioCaptureAdapterOptions = {}) {
        super();
    }

    get isAvailable(): boolean {
        return this.hasMediaRecorder();
    }

    get missingComponents(): string[] {
        const missing: string[] = [];
        if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
            missing.push('navigator.mediaDevices.getUserMedia');
        }
        if (typeof (globalThis as any).MediaRecorder !== 'function') {
            missing.push('MediaRecorder');
        }
        return missing;
    }

    async start(events: AudioCaptureSessionEvents, options?: AudioCaptureAdapterOptions): Promise<void> {
        if (!this.hasMediaRecorder()) {
            throw new Error(`media capture unavailable: missing ${this.missingComponents.join(', ')}`);
        }
        if (this.recorder) {
            throw new Error('media capture session already active; call stop() or cancel() first');
        }
        const stream = await (navigator.mediaDevices as MediaDevicesLike).getUserMedia({ audio: true });
        const mimeType = this.options.mimeType;
        const MediaRecorderCtor = (globalThis as any).MediaRecorder as new (stream: MediaStreamLike, options?: { mimeType?: string }) => MediaRecorderLike;
        const recorder = mimeType
            ? new MediaRecorderCtor(stream, { mimeType })
            : new MediaRecorderCtor(stream);

        this.stream = stream;
        this.recorder = recorder;
        this.session = events;
        this.stopping = false;
        this.cancelled = false;
        this.ended = false;

        recorder.ondataavailable = (event: { data: BlobLike }) => {
            if (event.data?.size && !this.cancelled) {
                void event.data.arrayBuffer().then(buffer => {
                    if (!this.cancelled) {
                        events.onChunk?.(new Uint8Array(buffer));
                    }
                });
            }
        };

        recorder.onstop = () => {
            if (this.ended) {
                return;
            }
            this.ended = true;
            this.recorder = null;
            this.stream?.getTracks().forEach(track => track.stop());
            this.stream = null;
            const session = this.session;
            this.session = null;
            if (!this.cancelled) {
                session?.onEnd?.();
            }
        };

        recorder.onerror = (event: { error?: ErrorLike }) => {
            if (this.ended) {
                return;
            }
            this.ended = true;
            this.recorder = null;
            const session = this.session;
            this.session = null;
            session?.onError?.(new Error(event.error?.message ?? 'MediaRecorder error'));
        };

        recorder.start(this.options.timesliceMs ?? 1000);
    }

    async stop(): Promise<void> {
        const recorder = this.recorder;
        if (!recorder) {
            return;
        }
        this.stopping = true;
        recorder.stop();
    }

    async cancel(): Promise<void> {
        const recorder = this.recorder;
        if (!recorder) {
            return;
        }
        this.cancelled = true;
        recorder.stop();
    }

    private hasMediaRecorder(): boolean {
        return typeof navigator !== 'undefined'
            && !!navigator?.mediaDevices?.getUserMedia
            && typeof (globalThis as any).MediaRecorder === 'function';
    }
}
