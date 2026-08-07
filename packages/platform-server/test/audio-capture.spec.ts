import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { NodeAudioCaptureAdapter, NodeAudioPlaybackAdapter } from '@tsdi/platform-server/common';

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

@Suite('Node audio capture adapter')
export class NodeAudioCaptureTest {
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
}

@Suite('Node audio playback adapter')
export class NodeAudioPlaybackTest {
    @Test('node playback reports a missing configured command')
    missingCommand() {
        const adapter = new NodeAudioPlaybackAdapter({ command: 'no-such-player-xyz' });
        expect(adapter.isAvailable).toBe(false);
        expect(adapter.missingComponents[0]).toContain('not found');
    }

    @Test('node playback pipes all chunks to the configured player')
    async pipesChunks() {
        const script = "const fs=require('fs');process.exit(fs.readFileSync(process.argv[1]).length===5?0:4);";
        const adapter = new NodeAudioPlaybackAdapter({ command: 'node', args: ['-e', script] });

        await adapter.play([Buffer.from('he'), Buffer.from('llo')], { format: 'pcm16k' });

        expect(adapter.isAvailable).toBe(true);
    }
}
