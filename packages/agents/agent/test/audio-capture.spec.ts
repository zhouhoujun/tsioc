import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { NodeAudioCaptureAdapter } from '../src/audio/NodeAudioCaptureAdapter';
import { MediaRecorderAudioCaptureAdapter } from '../src/audio/MediaRecorderAudioCaptureAdapter';

const PCM_STREAM_SCRIPT = `
const buf = Buffer.alloc(320, 1);
const iv = setInterval(() => process.stdout.write(buf), 20);
process.on('SIGTERM', () => {
    clearInterval(iv);
    process.exit(0);
});
`;

const PCM_EXIT_SCRIPT = `
const buf = Buffer.alloc(320, 1);
process.stdout.write(buf);
process.exit(0);
`;

const PCM_ERROR_SCRIPT = `process.exit(3);`;

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
    ondataavailable: ((event: { data: { size: number; arrayBuffer(): Promise<ArrayBuffer> } }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: { error?: { message?: string } }) => void) | null = null;

    constructor(public stream: any, public options?: { mimeType?: string }) {
        FakeMediaRecorder.instances.push(this);
    }

    start(_timeslice?: number) {
        return;
    }

    stop() {
        this.onstop?.();
    }

    emitChunk(size = 100) {
        this.ondataavailable?.({ data: { size, arrayBuffer: async () => new ArrayBuffer(size) } });
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

@Suite('Audio capture adapters')
export class AudioCaptureTest {
    @After()
    async cleanup() {
        delete (globalThis as any).navigator;
        delete (globalThis as any).MediaRecorder;
    }

    @Test('node adapter: missing command reports availability and errors on start')
    async nodeMissingCommand() {
        const adapter = new NodeAudioCaptureAdapter({ command: 'no-such-command-xyz' });
        expect(adapter.isAvailable).toBe(false);
        expect(adapter.missingComponents.length).toBeGreaterThan(0);
        const recorder = new SessionRecorder();
        adapter.start(recorder.events);
        await recorder.errorPromise;
        expect(recorder.error?.message).toContain('not found');
    }

    @Test('node adapter: streams chunks and stops with onEnd')
    async nodeStreamsAndStops() {
        const adapter = new NodeAudioCaptureAdapter({ command: 'node', args: ['-e', PCM_STREAM_SCRIPT] });
        expect(adapter.isAvailable).toBe(true);
        expect(adapter.missingComponents).toEqual([]);
        const recorder = new SessionRecorder();
        adapter.start(recorder.events);
        await waitFor(() => recorder.chunks.length >= 1);
        expect(recorder.ended).toBe(false);
        await adapter.stop();
        await recorder.endPromise;
        expect(recorder.ended).toBe(true);
        expect(recorder.chunks[0].byteLength).toBe(320);
    }

    @Test('node adapter: cancel discards without terminal callbacks')
    async nodeCancelDiscards() {
        const adapter = new NodeAudioCaptureAdapter({ command: 'node', args: ['-e', PCM_STREAM_SCRIPT] });
        const recorder = new SessionRecorder();
        adapter.start(recorder.events);
        await waitFor(() => recorder.chunks.length >= 1);
        await adapter.cancel();
        expect(recorder.ended).toBe(false);
        expect(recorder.error).toBe(null);
    }

    @Test('node adapter: natural exit triggers onEnd')
    async nodeNaturalEnd() {
        const adapter = new NodeAudioCaptureAdapter({ command: 'node', args: ['-e', PCM_EXIT_SCRIPT] });
        const recorder = new SessionRecorder();
        adapter.start(recorder.events);
        await recorder.endPromise;
        expect(recorder.ended).toBe(true);
        expect(recorder.chunks.length).toBeGreaterThan(0);
    }

    @Test('node adapter: non-zero exit triggers onError')
    async nodeNonZeroExit() {
        const adapter = new NodeAudioCaptureAdapter({ command: 'node', args: ['-e', PCM_ERROR_SCRIPT] });
        const recorder = new SessionRecorder();
        adapter.start(recorder.events);
        const error = await recorder.errorPromise;
        expect(error.message).toContain('exited with code 3');
    }

    @Test('node adapter: double start throws')
    async nodeDoubleStart() {
        const adapter = new NodeAudioCaptureAdapter({ command: 'node', args: ['-e', PCM_STREAM_SCRIPT] });
        const recorder = new SessionRecorder();
        adapter.start(recorder.events);
        expect(() => adapter.start({ onChunk: () => undefined })).toThrow(/already active/);
        await adapter.stop();
        await recorder.endPromise;
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
