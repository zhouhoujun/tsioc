import expect = require('expect');
import { Buffer } from 'buffer';
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore } from '@tsdi/agent';
import { ChatWebSocket } from '../src/ws/ChatWebSocket';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { SessionQueue } from '../src/auth/SessionQueue';
import {
    StreamingTranscriptionAdapter,
    StreamingTranscriptionResult,
    StreamingTtsAdapter,
    StreamingTtsOptions,
    AudioSessionHandler,
    AgentGatewayAudioOptions
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
    synthesized: string[] = [];
    async *synthesizeStream(text: string, _options?: StreamingTtsOptions): AsyncIterable<Uint8Array> {
        this.synthesized.push(text);
        yield Buffer.from(`[tts:${text}]`);
    }
}

interface FakeSocket {
    writes: Buffer[];
    end: () => void;
    write: (buffer: Buffer) => boolean;
    on: () => void;
}

function makeSocket(): FakeSocket {
    return {
        writes: [],
        end: () => undefined,
        write(buffer: Buffer) {
            this.writes.push(buffer);
            return true;
        },
        on: () => undefined
    };
}

function framePayload(buffer: Buffer): Buffer {
    const payloadLength = buffer[1] & 0x7f;
    const offset = payloadLength < 126 ? 2 : 4;
    return buffer.subarray(offset);
}

@Suite('AudioSessionHandler')
export class AudioSessionHandlerTest {
    private makeHandler(overrides?: {
        transcription?: StreamingTranscriptionAdapter | null;
        tts?: StreamingTtsAdapter | null;
        options?: AgentGatewayAudioOptions;
    }): { handler: AudioSessionHandler; stt: EchoTranscriptionAdapter; tts: EchoTtsAdapter; turns: string[] } {
        const turns: string[] = [];
        const runtime = {
            runTurn: async (sessionId: string, input: string) => {
                turns.push(`${sessionId}|${input}`);
                return { sessionId, message: { role: 'assistant', content: `echo:${input}`, createdAt: 1, id: '1' } };
            }
        } as any;
        const stt = new EchoTranscriptionAdapter();
        const tts = new EchoTtsAdapter();
        const handler = new AudioSessionHandler(
            runtime,
            overrides?.transcription === undefined ? stt : overrides.transcription,
            overrides?.tts === undefined ? tts : overrides.tts,
            overrides?.options
        );
        return { handler, stt, tts, turns };
    }

    @Test('isAvailable requires both adapters and reports missing components')
    availability() {
        const full = this.makeHandler();
        expect(full.handler.isAvailable).toBe(true);
        expect(full.handler.missingComponents).toEqual([]);

        const noTts = this.makeHandler({ tts: null });
        expect(noTts.handler.isAvailable).toBe(false);
        expect(noTts.handler.missingComponents).toEqual(['streaming TTS adapter']);

        const noStt = this.makeHandler({ transcription: null });
        expect(noStt.handler.isAvailable).toBe(false);
        expect(noStt.handler.missingComponents).toEqual(['streaming STT adapter']);
    }

    @Test('startSession fails when adapters are missing and ok when present')
    startSessionAvailability() {
        const without = this.makeHandler({ transcription: null, tts: null });
        const state = without.handler.createSessionState();
        const failed = without.handler.startSession(state);
        expect(failed.ok).toBe(false);
        expect(failed.error).toContain('audio unavailable');

        const withAdapter = this.makeHandler();
        const okState = withAdapter.handler.createSessionState();
        const ok = withAdapter.handler.startSession(okState);
        expect(ok.ok).toBe(true);
        expect(okState.active).toBe(true);
    }

    @Test('startSession rejects audio formats not accepted by the transcription adapter')
    startSessionRejectsFormatMismatch() {
        const { handler } = this.makeHandler();
        const state = handler.createSessionState();

        const result = handler.startSession(state, 'webm');

        expect(result.ok).toBe(false);
        expect(result.format).toBe('pcm16k');
        expect(result.error).toContain("unsupported audio format 'webm'");
        expect(state.active).toBe(false);
    }

    @Test('feedAudio buffers chunks only while the session is active')
    async feedBuffersOnlyWhileActive() {
        const { handler } = this.makeHandler();
        const state = handler.createSessionState();
        const chunk = Buffer.from('hello');

        expect(handler.feedAudio(state, chunk)).toBe(false);
        expect(state.bufferedBytes).toBe(0);

        handler.startSession(state);
        expect(handler.feedAudio(state, chunk)).toBe(true);
        expect(state.bufferedBytes).toBe(5);
    }

    @Test('endSession transcribes audio, runs a turn and streams the reply as audio chunks')
    async endSessionFullFlow() {
        const { handler, stt, tts, turns } = this.makeHandler();
        const state = handler.createSessionState();
        handler.startSession(state);
        handler.feedAudio(state, Buffer.from('hel'));
        handler.feedAudio(state, Buffer.from('lo'));

        const events: string[] = [];
        const audioChunks: Uint8Array[] = [];
        await handler.endSession(state, {
            onTranscribed: text => events.push(`transcribed:${text}`),
            onReply: text => events.push(`reply:${text}`),
            onAudioChunk: chunk => audioChunks.push(chunk),
            onError: error => events.push(`error:${error.message}`)
        }, 'session-1');

        expect(stt.chunks.length).toBe(2);
        expect(turns).toEqual(['session-1|hello']);
        expect(tts.synthesized).toEqual(['echo:hello']);
        expect(events).toEqual(['transcribed:hello', 'reply:echo:hello']);
        expect(audioChunks.length).toBe(1);
        expect(Buffer.from(audioChunks[0]).toString('utf8')).toBe('[tts:echo:hello]');
        expect(state.active).toBe(false);
        expect(state.processing).toBe(false);
    }

    @Test('endSession emits an error when transcription produces no text')
    async endSessionEmptyTranscription() {
        const emptyStt = {
            format: 'pcm16k' as const,
            async feedAudio(): Promise<void> {},
            async endAudio(): Promise<StreamingTranscriptionResult> { return { text: '   ' }; },
            async cancelAudio(): Promise<void> {}
        };
        const { handler } = this.makeHandler({ transcription: emptyStt as any });
        const state = handler.createSessionState();
        handler.startSession(state);
        handler.feedAudio(state, Buffer.from('noise'));

        const events: string[] = [];
        await handler.endSession(state, { onError: error => events.push(error.message) }, 'session-1');

        expect(events).toEqual(['audio transcription produced no text']);
    }

    @Test('endSession does nothing when the session is not active')
    async endSessionInactive() {
        const { handler, stt, tts, turns } = this.makeHandler();
        const state = handler.createSessionState();
        await handler.endSession(state, {}, 'session-1');
        expect(stt.chunks.length).toBe(0);
        expect(turns.length).toBe(0);
        expect(tts.synthesized.length).toBe(0);
    }

    @Test('cancelSession clears buffered audio and cancels the adapter')
    async cancelSessionResetsState() {
        const { handler, stt } = this.makeHandler();
        const state = handler.createSessionState();
        handler.startSession(state);
        handler.feedAudio(state, Buffer.from('partial'));

        await handler.cancelSession(state);

        expect(stt.cancelled).toBe(true);
        expect(state.active).toBe(false);
        expect(state.buffered.length).toBe(0);
        expect(state.bufferedBytes).toBe(0);
    }

    @Test('maxBufferedBytes cap forces an automatic endAudio')
    async bufferCapForcesEndAudio() {
        const { handler, tts, turns } = this.makeHandler({ options: { maxBufferedBytes: 6 } });
        const state = handler.createSessionState();
        handler.startSession(state);
        const audioChunks: Uint8Array[] = [];
        const events = { onAudioChunk: (chunk: Uint8Array) => audioChunks.push(chunk) };
        handler.feedAudio(state, Buffer.from('aaa'), events, 'owned-session');
        handler.feedAudio(state, Buffer.from('bbb'), events, 'owned-session');
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(state.bufferedBytes).toBe(0);
        expect(turns.length).toBe(1);
        expect(turns[0]).toBe('owned-session|aaabbb');
        expect(tts.synthesized).toEqual(['echo:aaabbb']);
        expect(audioChunks.length).toBe(1);
    }
}

@Suite('ChatWebSocket audio channel')
export class ChatWebSocketAudioTest {
    private makeWs(): {
        ws: ChatWebSocket;
        stt: EchoTranscriptionAdapter;
        tts: EchoTtsAdapter;
        turns: string[];
        socket: FakeSocket;
    } {
        const turns: string[] = [];
        const runtime = {
            runTurn: async (sessionId: string, input: string) => {
                turns.push(`${sessionId}|${input}`);
                return { sessionId, message: { role: 'assistant', content: `echo:${input}`, createdAt: 1, id: '1' } };
            }
        } as any;
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        const stt = new EchoTranscriptionAdapter();
        const tts = new EchoTtsAdapter();
        const audio = new AudioSessionHandler(runtime, stt, tts);
        const ws = new ChatWebSocket(runtime, owners, new SessionQueue(), undefined, audio);
        const socket = makeSocket();
        (ws as any).handleSocket(socket, 's1', 'user-1');
        return { ws, stt, tts, turns, socket };
    }

    @Test('binary frames feed the audio session only after start')
    async binaryFramesFeedAfterStart() {
        const { ws, socket } = this.makeWs();

        (ws as any).handleAudioFrame(socket, Buffer.from('ignored'), 's1');
        expect((ws as any).audioStates.get(socket).buffered.length).toBe(0);

        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start' }, 's1');
        (ws as any).handleAudioFrame(socket, Buffer.from('hel'), 's1');
        (ws as any).handleAudioFrame(socket, Buffer.from('lo'), 's1');

        const frames = socket.writes.map(framePayload).map(buffer => JSON.parse(buffer.toString('utf8')));
        expect(frames[0].type).toBe('audio-status');
        expect(frames[0].available).toBe(true);
        expect(frames[0].active).toBe(true);
        const state = (ws as any).audioStates.get(socket);
        expect(state.buffered.length).toBe(2);
        expect(Buffer.concat(state.buffered as Buffer[]).toString('utf8')).toBe('hello');
    }

    @Test('end action transcribes, runs the turn and streams audio frames back')
    async endRunsFullAudioFlow() {
        const { ws, tts, turns, socket } = this.makeWs();

        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start' }, 's1');
        (ws as any).handleAudioFrame(socket, Buffer.from('hello'), 's1');
        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'end' }, 's1');
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(turns).toEqual(['s1|hello']);
        expect(tts.synthesized).toEqual(['echo:hello']);

        const frames = socket.writes.map(buffer => ({
            opcode: buffer[0] & 0x0f,
            payload: framePayload(buffer)
        }));
        const textFrames = frames
            .filter(frame => frame.opcode === 0x01)
            .map(frame => JSON.parse(frame.payload.toString('utf8')));
        const types = textFrames.map(frame => frame.type);
        expect(types).toContain('audio-transcribed');
        expect(types).toContain('audio-reply');
        expect(types).toContain('audio-status');

        const audioFrames = frames.filter(frame => frame.opcode === 0x02);
        expect(audioFrames.length).toBe(1);
        expect(audioFrames[0].payload.toString('utf8')).toBe('[tts:echo:hello]');
    }

    @Test('status reports availability and session state')
    async statusReportsState() {
        const { ws, socket } = this.makeWs();

        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'status' }, 's1');
        let frame = JSON.parse(framePayload(socket.writes[socket.writes.length - 1]).toString('utf8'));
        expect(frame.available).toBe(true);
        expect(frame.active).toBe(false);

        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start' }, 's1');
        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'status' }, 's1');
        frame = JSON.parse(framePayload(socket.writes[socket.writes.length - 1]).toString('utf8'));
        expect(frame.active).toBe(true);
    }

    @Test('audio control without an audio handler reports unavailable')
    async controlWithoutAudioHandler() {
        const runtime = { runTurn: async () => ({}) } as any;
        const store = new InMemorySessionStore();
        const ws = new ChatWebSocket(runtime, new SessionOwnerStore(store), new SessionQueue());
        const socket = makeSocket();

        (ws as any).handleAudioControl(socket, { type: 'audio', action: 'start' }, 's1');
        const frame = JSON.parse(framePayload(socket.writes[0]).toString('utf8'));
        expect(frame.available).toBe(false);
        expect(frame.error).toBe('audio not configured');
    }

    @Test('binary frames are ignored when no audio handler is configured')
    async binaryFramesIgnoredWithoutAudio() {
        const runtime = { runTurn: async () => ({}) } as any;
        const store = new InMemorySessionStore();
        const ws = new ChatWebSocket(runtime, new SessionOwnerStore(store), new SessionQueue());
        const socket = makeSocket();

        (ws as any).handleAudioFrame(socket, Buffer.from('noise'), 's1');
        expect(socket.writes.length).toBe(0);
    }
}
