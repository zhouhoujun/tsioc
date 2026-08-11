import expect = require('expect');
import { Buffer } from 'buffer';
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore } from '@tsdi/agent';
import { ChatWebSocket } from '../src/ws/ChatWebSocket';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { SessionQueue } from '../src/auth/SessionQueue';
import {
    AudioFrameQuota,
    AudioSessionHandler,
    StreamingTranscriptionAdapter,
    StreamingTranscriptionResult,
    StreamingTtsAdapter,
    StreamingTtsOptions
} from '../src/audio';

class EchoTranscriptionAdapter extends StreamingTranscriptionAdapter {
    readonly format: 'pcm16k' | 'wav' = 'pcm16k';
    chunks: Uint8Array[] = [];
    cancelled = false;
    async feedAudio(chunk: Uint8Array): Promise<void> {
        this.chunks.push(chunk);
    }
    async endAudio(): Promise<StreamingTranscriptionResult> {
        return { text: Buffer.concat(this.chunks as Buffer[]).toString('utf8') };
    }
    async cancelAudio(): Promise<void> {
        this.cancelled = true;
    }
}

class EchoTtsAdapter extends StreamingTtsAdapter {
    readonly format: 'pcm16k' | 'wav' | 'mp3' = 'pcm16k';
    async *synthesizeStream(text: string, _options?: StreamingTtsOptions): AsyncIterable<Uint8Array> {
        yield Buffer.from(`[tts:${text}]`);
    }
}

interface FakeSocket {
    writes: Buffer[];
    ended: boolean;
    closeHandler: (() => void) | null;
    end: () => void;
    write: (buffer: Buffer) => boolean;
    on: (event: string, handler: () => void) => void;
}

function makeSocket(): FakeSocket {
    return {
        writes: [],
        ended: false,
        closeHandler: null,
        end() {
            this.ended = true;
        },
        write(buffer: Buffer) {
            this.writes.push(buffer);
            return true;
        },
        on(event: string, handler: () => void) {
            if (event === 'close') {
                this.closeHandler = handler;
            }
        }
    };
}

function framePayload(buffer: Buffer): Buffer {
    const payloadLength = buffer[1] & 0x7f;
    const offset = payloadLength < 126 ? 2 : 4;
    return buffer.subarray(offset);
}

function lastTextFrame(socket: FakeSocket): any {
    const frames = socket.writes.map(buffer => ({
        opcode: buffer[0] & 0x0f,
        payload: framePayload(buffer)
    }));
    const textFrame = frames.filter(frame => frame.opcode === 0x01).pop()!;
    return JSON.parse(textFrame.payload.toString('utf8'));
}

@Suite('AudioFrameQuota')
export class AudioFrameQuotaTest {
    @Test('rejects frames larger than maxFrameBytes without accounting')
    frameSizeExceedsMax() {
        const quota = new AudioFrameQuota({ audioQuota: { maxFrameBytes: 8 } });

        const rejected = quota.check('k', Buffer.alloc(9));
        expect(rejected.allowed).toBe(false);
        expect(rejected.reason).toBe('frame-size');
        expect(quota.sessionUsage('k')).toBe(0);

        const accepted = quota.check('k', Buffer.alloc(8));
        expect(accepted.allowed).toBe(true);
        expect(quota.sessionUsage('k')).toBe(8);
    }

    @Test('caps cumulative session bytes and reports remainingBytes')
    sessionBytesCap() {
        const quota = new AudioFrameQuota({ audioQuota: { maxSessionBytes: 10 } });

        const first = quota.check('k', Buffer.alloc(6));
        expect(first.allowed).toBe(true);
        expect(first.remainingBytes).toBe(4);

        const second = quota.check('k', Buffer.alloc(6));
        expect(second.allowed).toBe(false);
        expect(second.reason).toBe('session-bytes');
        expect(second.remainingBytes).toBe(4);
        expect(quota.sessionUsage('k')).toBe(6);
    }

    @Test('leaves accounting untouched when a frame is rejected')
    rejectedFrameConsumesNothing() {
        const quota = new AudioFrameQuota({ audioQuota: { maxSessionBytes: 10 } });
        quota.check('k', Buffer.alloc(6));

        quota.check('k', Buffer.alloc(6));
        quota.check('k', Buffer.alloc(10));

        expect(quota.sessionUsage('k')).toBe(6);
        quota.check('k', Buffer.alloc(4));
        expect(quota.sessionUsage('k')).toBe(10);
    }

    @Test('enforces a sliding-window frame rate cap')
    async slidingWindowFrameRate() {
        const quota = new AudioFrameQuota({ audioQuota: { maxFramesPerWindow: 3, windowMs: 50 } });

        for (let i = 0; i < 3; i++) {
            expect(quota.check('k', Buffer.alloc(1)).allowed).toBe(true);
        }
        const rejected = quota.check('k', Buffer.alloc(1));
        expect(rejected.allowed).toBe(false);
        expect(rejected.reason).toBe('frame-rate');

        await new Promise(resolve => setTimeout(resolve, 70));
        expect(quota.check('k', Buffer.alloc(1)).allowed).toBe(true);
    }

    @Test('keeps quota accounting isolated per key')
    keyIsolation() {
        const quota = new AudioFrameQuota({ audioQuota: { maxSessionBytes: 10 } });

        expect(quota.check('a', Buffer.alloc(10)).allowed).toBe(true);
        expect(quota.check('a', Buffer.alloc(1)).allowed).toBe(false);
        expect(quota.check('b', Buffer.alloc(10)).allowed).toBe(true);
        expect(quota.check('b', Buffer.alloc(1)).allowed).toBe(false);
    }

    @Test('resetSession clears accumulated accounting')
    resetSessionClearsAccounting() {
        const quota = new AudioFrameQuota({ audioQuota: { maxSessionBytes: 10 } });
        quota.check('k', Buffer.alloc(6));

        quota.resetSession('k');

        expect(quota.sessionUsage('k')).toBe(0);
        expect(quota.check('k', Buffer.alloc(6)).allowed).toBe(true);
    }
}

@Suite('ChatWebSocket audio quota')
export class ChatWebSocketQuotaTest {
    private makeWs(quota?: AudioFrameQuota): {
        ws: ChatWebSocket;
        stt: EchoTranscriptionAdapter;
        socket: FakeSocket;
        quota: AudioFrameQuota;
    } {
        const runtime = { runTurn: async () => ({}) } as any;
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        const stt = new EchoTranscriptionAdapter();
        const tts = new EchoTtsAdapter();
        const audio = new AudioSessionHandler(runtime, stt, tts);
        const quotaInstance = quota ?? new AudioFrameQuota();
        const ws = new ChatWebSocket(runtime, owners, new SessionQueue(), undefined, audio, quotaInstance);
        const socket = makeSocket();
        (ws as any).handleSocket(socket, 's1', 'user-1');
        return { ws, stt, socket, quota: quotaInstance };
    }

    private start(ws: ChatWebSocket, socket: FakeSocket): void {
        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start' }, 's1');
    }

    @Test('oversized audio frame sends audio-error, ends the socket and cancels the session')
    oversizedFrameBreach() {
        const { ws, stt, socket } = this.makeWs(new AudioFrameQuota({ audioQuota: { maxFrameBytes: 8 } }));
        this.start(ws, socket);
        (ws as any).handleAudioFrame(socket, Buffer.from('partial'), 's1');

        const result = (ws as any).handleAudioFrame(socket, Buffer.alloc(9), 's1');

        expect(result).toBe(true);
        expect(socket.ended).toBe(true);
        expect(stt.cancelled).toBe(true);
        const errorFrame = lastTextFrame(socket);
        expect(errorFrame.type).toBe('audio-error');
        expect(errorFrame.error).toBe('audio quota exceeded: frame-size');
    }

    @Test('session byte cap breach cancels the connection after the budget is exhausted')
    sessionBytesBreach() {
        const { ws, stt, socket } = this.makeWs(new AudioFrameQuota({ audioQuota: { maxSessionBytes: 10 } }));
        this.start(ws, socket);
        (ws as any).handleAudioFrame(socket, Buffer.alloc(6), 's1');
        expect((ws as any).audioStates.get(socket).bufferedBytes).toBe(6);

        const result = (ws as any).handleAudioFrame(socket, Buffer.alloc(6), 's1');

        expect(result).toBe(true);
        expect(socket.ended).toBe(true);
        expect(stt.cancelled).toBe(true);
        const errorFrame = lastTextFrame(socket);
        expect(errorFrame.type).toBe('audio-error');
        expect(errorFrame.error).toBe('audio quota exceeded: session-bytes');
    }

    @Test('start action resets the session quota budget')
    startResetsSessionQuota() {
        const { ws, socket, quota } = this.makeWs(new AudioFrameQuota({ audioQuota: { maxSessionBytes: 10 } }));
        this.start(ws, socket);
        (ws as any).handleAudioFrame(socket, Buffer.alloc(6), 's1');
        expect(quota.sessionUsage('s1')).toBe(6);

        this.start(ws, socket);

        expect(quota.sessionUsage('s1')).toBe(0);
    }

    @Test('start action reports incompatible and invalid audio formats')
    startRejectsUnsupportedFormat() {
        const { ws, socket } = this.makeWs();

        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start', format: 'webm' }, 's1');
        expect(lastTextFrame(socket).error).toContain("transcription adapter accepts 'pcm16k'");
        expect((ws as any).audioStates.get(socket).active).toBe(false);

        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start', format: 'mp3' }, 's1');
        expect(lastTextFrame(socket).error).toBe("unsupported audio format 'mp3'");
        expect((ws as any).audioStates.get(socket).active).toBe(false);
    }

    @Test('socket close resets the session quota budget')
    closeResetsSessionQuota() {
        const { ws, socket, quota } = this.makeWs(new AudioFrameQuota({ audioQuota: { maxSessionBytes: 10 } }));
        this.start(ws, socket);
        (ws as any).handleAudioFrame(socket, Buffer.alloc(6), 's1');
        expect(quota.sessionUsage('s1')).toBe(6);

        socket.closeHandler?.();

        expect(quota.sessionUsage('s1')).toBe(0);
    }

    @Test('quota enforcement is skipped when no AudioFrameQuota is configured')
    quotaBypassedWhenNotConfigured() {
        const runtime = { runTurn: async () => ({}) } as any;
        const store = new InMemorySessionStore();
        const stt = new EchoTranscriptionAdapter();
        const tts = new EchoTtsAdapter();
        const audio = new AudioSessionHandler(runtime, stt, tts);
        const ws = new ChatWebSocket(runtime, new SessionOwnerStore(store), new SessionQueue(), undefined, audio);
        const socket = makeSocket();
        (ws as any).handleSocket(socket, 's1', 'user-1');
        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start' }, 's1');

        const result = (ws as any).handleAudioFrame(socket, Buffer.alloc(2048), 's1');

        expect(result).toBe(false);
        expect(socket.ended).toBe(false);
        expect(socket.writes.length).toBe(1);
    }
}
