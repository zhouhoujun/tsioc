import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { BrowserAudioPlaybackAdapter, MediaRecorderAudioCaptureAdapter } from '@tsdi/platform-browser/common';

function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
            if (condition()) {
                clearInterval(timer);
                resolve();
            } else if (Date.now() - started > timeoutMs) {
                clearInterval(timer);
                reject(new Error('condition not met within timeout'));
            }
        }, 10);
    });
}

class SessionRecorder {
    chunks: Uint8Array[] = [];
    ended = false;
    error: Error | null = null;
    private endResolve!: () => void;
    private errorResolve!: (error: Error) => void;
    endPromise: Promise<void>;
    errorPromise: Promise<Error>;

    constructor() {
        this.endPromise = new Promise(resolve => {
            this.endResolve = resolve;
        });
        this.errorPromise = new Promise(resolve => {
            this.errorResolve = resolve;
        });
    }

    get events() {
        return {
            onChunk: (chunk: Uint8Array) => this.chunks.push(chunk),
            onEnd: () => {
                this.ended = true;
                this.endResolve();
            },
            onError: (error: Error) => {
                this.error = error;
                this.errorResolve(error);
            }
        };
    }
}

interface FakeMediaRecorderLike {
    instances: FakeMediaRecorder[];
}

class FakeMediaRecorder {
    static instances: FakeMediaRecorder[] = [];
    ondataavailable: ((event: { data: { size: number; arrayBuffer: () => Promise<ArrayBuffer> } }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: { error?: { message?: string } }) => void) | null = null;
    private buffer: number[] = [];

    constructor(_stream: any, _options?: any) {
        FakeMediaRecorder.instances.push(this);
    }

    start(_timeslice?: number): void {
        return;
    }

    stop(): void {
        this.ondataavailable?.({ data: { size: this.buffer.length, arrayBuffer: async () => Uint8Array.from(this.buffer).buffer } });
        this.onstop?.();
    }

    emitChunk(size: number): void {
        this.buffer = Array.from({ length: size }, () => 0);
        this.ondataavailable?.({ data: { size, arrayBuffer: async () => Uint8Array.from(this.buffer).buffer } });
    }
}

function installMediaRecorderStubs(): FakeMediaRecorderLike {
    FakeMediaRecorder.instances = [];
    Object.defineProperty(globalThis, 'navigator', {
        value: {
            mediaDevices: {
                getUserMedia: async () => ({ getTracks: () => [{ stop() { return; } }] })
            }
        },
        configurable: true,
        writable: true
    });
    (globalThis as any).MediaRecorder = FakeMediaRecorder;
    return { instances: FakeMediaRecorder.instances };
}

@Suite('MediaRecorder audio capture adapter')
export class MediaRecorderAudioCaptureTest {
    @After()
    async cleanup() {
        delete (globalThis as any).navigator;
        delete (globalThis as any).MediaRecorder;
        delete (globalThis as any).Audio;
    }

    @Test('media recorder adapter: reports missing surface when unavailable')
    async mediaUnavailable() {
        const adapter = new MediaRecorderAudioCaptureAdapter();
        expect(adapter.isAvailable).toBe(false);
        expect(adapter.missingComponents.length).toBeGreaterThan(0);
        let threw = false;
        try {
            await adapter.start({});
        } catch (error) {
            threw = true;
            expect((error as Error).message).toContain('media capture unavailable');
        }
        expect(threw).toBe(true);
    }

    @Test('media recorder adapter: streams chunks and ends on stop')
    async mediaStreamsAndStops() {
        const { instances } = installMediaRecorderStubs();
        const adapter = new MediaRecorderAudioCaptureAdapter();
        expect(adapter.isAvailable).toBe(true);
        const recorder = new SessionRecorder();
        await adapter.start(recorder.events);
        const instance = instances[instances.length - 1];
        instance.emitChunk(100);
        await waitFor(() => recorder.chunks.length >= 1);
        expect(recorder.chunks[0].byteLength).toBe(100);
        await adapter.stop();
        await recorder.endPromise;
        expect(recorder.ended).toBe(true);
    }

    @Test('media recorder adapter: cancel discards')
    async mediaCancelDiscards() {
        const { instances } = installMediaRecorderStubs();
        const adapter = new MediaRecorderAudioCaptureAdapter();
        const recorder = new SessionRecorder();
        await adapter.start(recorder.events);
        const instance = instances[0];
        instance.emitChunk(100);
        await waitFor(() => recorder.chunks.length >= 1);
        await adapter.cancel();
        expect(recorder.ended).toBe(false);
        expect(recorder.error).toBe(null);
    }
}

@Suite('Browser audio playback adapter')
export class BrowserAudioPlaybackTest {
    @After()
    cleanup() {
        delete (globalThis as any).Audio;
    }

    @Test('browser playback reports unavailable audio surface')
    unavailable() {
        const adapter = new BrowserAudioPlaybackAdapter();
        expect(adapter.isAvailable).toBe(false);
    }

    @Test('browser playback creates, plays and releases an object URL')
    async playsAndStops() {
        const calls: string[] = [];
        (globalThis as any).Audio = class {
            constructor(public url: string) { calls.push(`create:${url}`); }
            async play() { calls.push('play'); }
            pause() { calls.push('pause'); }
        };
        const originalCreate = (globalThis as any).URL.createObjectURL;
        const originalRevoke = (globalThis as any).URL.revokeObjectURL;
        (globalThis as any).URL.createObjectURL = () => 'blob:test-audio';
        (globalThis as any).URL.revokeObjectURL = (url: string) => calls.push(`revoke:${url}`);
        try {
            const adapter = new BrowserAudioPlaybackAdapter();
            await adapter.play([Uint8Array.from([1, 2, 3])], { format: 'mp3' });
            await adapter.stop();
            expect(calls).toEqual(['create:blob:test-audio', 'play', 'pause', 'revoke:blob:test-audio']);
        } finally {
            (globalThis as any).URL.createObjectURL = originalCreate;
            (globalThis as any).URL.revokeObjectURL = originalRevoke;
        }
    }
}
