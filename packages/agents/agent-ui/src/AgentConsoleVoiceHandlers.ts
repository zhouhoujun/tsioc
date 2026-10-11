/**
 * Voice command handlers for AgentConsoleComponent (P199 batch B).
 *
 * Extracted verbatim from the component: logic is unchanged and every
 * dependency arrives through the minimal `VoiceHandlerContext`. The mutable
 * capture state (`voiceCaptureSessionId` / `voiceCaptureFeed`) stays on the
 * component and is reached through getter/setter hooks.
 */
import { AudioCaptureAdapter, AudioPlaybackAdapter, AudioPlaybackFormat } from '@tsdi/common';
import type { AgentConsoleCommandOutputEntry } from './AgentConsoleSessionState';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

// ── Voice handler context ────────────────────────────────────────────────────

export interface VoiceSessionServiceLike {
    startVoiceSession(
        sessionId: string,
        options?: { format?: 'pcm16k' | 'wav' | 'webm' },
        context?: any
    ): Promise<Record<string, any>>;
    feedVoiceAudio(sessionId: string, chunk: Uint8Array, context?: any): Promise<Record<string, any>>;
    endVoiceSession(sessionId: string, context?: any): Promise<Record<string, any>>;
    cancelVoiceSession(sessionId: string, context?: any): Promise<Record<string, any>>;
    getVoiceStatus(sessionId?: string, context?: any): Promise<Record<string, any>>;
}

export interface VoiceHandlerContext {
    translator?: AgentUiTranslator | null;
    state: { readonly sessionId: string };
    sessionService: VoiceSessionServiceLike | null | undefined;
    audioCapture: AudioCaptureAdapter | null | undefined;
    audioPlayback: AudioPlaybackAdapter | null | undefined;
    notify(message: string, duration?: number): void;
    pushCommandOutput(command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']): void;
    getCaptureSessionId(): string;
    setCaptureSessionId(value: string): void;
    getCaptureFeed(): Promise<void>;
    setCaptureFeed(feed: Promise<void>): void;
}

// ── Audio decoding ───────────────────────────────────────────────────────────

export function decodeVoiceAudioChunk(value: string): Uint8Array {
    const runtimeBuffer = (globalThis as { Buffer?: { from(value: string, encoding: string): Uint8Array } }).Buffer;
    if (runtimeBuffer) return new Uint8Array(runtimeBuffer.from(value, 'base64'));
    if (typeof globalThis.atob === 'function') {
        const binary = globalThis.atob(value);
        return Uint8Array.from(binary, char => char.charCodeAt(0));
    }
    throw new Error(formatAgentUiNotice(undefined, 'base64DecodingUnavailable'));
}

// ── Playback ─────────────────────────────────────────────────────────────────

export async function playVoiceReply(ctx: VoiceHandlerContext, result: Record<string, any>): Promise<string | undefined> {
    const audio = result?.audio;
    if (!ctx.audioPlayback || !Array.isArray(audio?.chunks) || audio.chunks.length === 0) {
        return undefined;
    }
    if (!ctx.audioPlayback.isAvailable) {
        return ctx.audioPlayback.missingComponents.join(', ') || 'playback adapter unavailable';
    }
    try {
        const chunks = audio.chunks.map((chunk: string) => decodeVoiceAudioChunk(chunk));
        await ctx.audioPlayback.play(chunks, {
            format: audio.format as AudioPlaybackFormat,
            sampleRate: 16000,
            channels: 1
        });
        return undefined;
    } catch (error: any) {
        return error?.message ?? String(error);
    }
}

// ── Capture lifecycle ────────────────────────────────────────────────────────

export async function startVoiceCapture(ctx: VoiceHandlerContext, sessionId: string): Promise<string | undefined> {
    if (!ctx.audioCapture) {
        return undefined;
    }
    if (!ctx.audioCapture.isAvailable) {
        return ctx.audioCapture.missingComponents.join(', ') || 'capture adapter unavailable';
    }
    if (ctx.getCaptureSessionId()) {
        return `capture already active for ${ctx.getCaptureSessionId()}`;
    }
    ctx.setCaptureSessionId(sessionId);
    ctx.setCaptureFeed(Promise.resolve());
    try {
        await ctx.audioCapture.start({
            onChunk: chunk => {
                ctx.setCaptureFeed(ctx.getCaptureFeed().then(async () => {
                    if (ctx.getCaptureSessionId() !== sessionId || !ctx.sessionService) {
                        return;
                    }
                    const result = await ctx.sessionService.feedVoiceAudio(sessionId, chunk);
                    if (result?.ok === false) {
                        throw new Error(result.error || formatAgentUiNotice(ctx.translator, 'audioUploadFailed'));
                    }
                }).catch(error => {
                    if (ctx.getCaptureSessionId() === sessionId) {
                        ctx.setCaptureSessionId('');
                        ctx.notify(formatAgentUiNotice(ctx.translator, 'voiceCaptureError', { error: error?.message ?? String(error) }));
                        void Promise.resolve(ctx.audioCapture?.cancel()).catch(() => undefined);
                        void ctx.sessionService?.cancelVoiceSession(sessionId).catch(() => undefined);
                    }
                }));
            },
            // Keep the session id until stopVoiceCapture drains queued chunks.
            onEnd: () => undefined,
            onError: error => {
                if (ctx.getCaptureSessionId() === sessionId) {
                    ctx.setCaptureSessionId('');
                    ctx.notify(formatAgentUiNotice(ctx.translator, 'voiceCaptureError', { error: error.message }));
                    void ctx.sessionService?.cancelVoiceSession(sessionId).catch(() => undefined);
                }
            }
        }, { format: ctx.audioCapture.format, sampleRate: 16000, channels: 1 });
        return undefined;
    } catch (error: any) {
        ctx.setCaptureSessionId('');
        return error?.message ?? String(error);
    }
}

export async function stopVoiceCapture(ctx: VoiceHandlerContext, cancel: boolean): Promise<void> {
    if (!ctx.audioCapture || !ctx.getCaptureSessionId()) {
        return;
    }
    if (cancel) {
        ctx.setCaptureSessionId('');
        await ctx.audioCapture.cancel();
        return;
    }
    await ctx.audioCapture.stop();
    await ctx.getCaptureFeed();
    ctx.setCaptureSessionId('');
}

// ── /voice dispatch ──────────────────────────────────────────────────────────

export async function handleVoiceCommand(ctx: VoiceHandlerContext, arg: string): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'voiceControlUnavailable'));
        return true;
    }
    const sessionId = ctx.state.sessionId;
    if (!sessionId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionSelectedStart'));
        return true;
    }
    const sub = (arg || '').trim().split(/\s+/)[0];
    switch (sub) {
        case 'start': {
            const result = await ctx.sessionService.startVoiceSession(
                sessionId,
                ctx.audioCapture ? { format: ctx.audioCapture.format } : undefined
            );
            if (result?.ok) {
                const captureError = await startVoiceCapture(ctx, sessionId);
                if (captureError) {
                    await ctx.sessionService.cancelVoiceSession(sessionId).catch(() => undefined);
                    ctx.notify(formatAgentUiNotice(ctx.translator, 'voiceCaptureCould', { captureError: captureError }));
                    return true;
                }
                ctx.notify(formatAgentUiNotice(ctx.translator, 'voiceSessionStarted', { sessionId: sessionId }));
            } else {
                ctx.notify(result?.error || formatAgentUiNotice(ctx.translator, 'voiceSessionStartFailed'));
            }
            return true;
        }
        case 'stop': {
            await stopVoiceCapture(ctx, false);
            const result = await ctx.sessionService.endVoiceSession(sessionId);
            if (result?.ok && result.transcribed) {
                const playbackError = await playVoiceReply(ctx, result);
                ctx.pushCommandOutput('/voice stop', `Transcribed: ${result.transcribed}\nReply: ${result.reply ?? ''}${playbackError ? `\nAudio playback unavailable: ${playbackError}` : ''}`);
            } else {
                ctx.notify(result?.error || (result?.transcribed ? formatAgentUiNotice(ctx.translator, 'voiceTranscribed', { text: result.transcribed }) : formatAgentUiNotice(ctx.translator, 'voiceNoTranscription')));
            }
            return true;
        }
        case 'cancel': {
            await stopVoiceCapture(ctx, true);
            const result = await ctx.sessionService.cancelVoiceSession(sessionId);
            if (result?.ok) {
                ctx.notify(result.cancelled ? formatAgentUiNotice(ctx.translator, 'voiceSessionCancelled') : formatAgentUiNotice(ctx.translator, 'voiceNoActiveSession'));
            } else {
                ctx.notify(result?.error || formatAgentUiNotice(ctx.translator, 'voiceSessionCancelFailed'));
            }
            return true;
        }
        default: {
            const status = await ctx.sessionService.getVoiceStatus(sessionId);
            const available = status?.available ? 'available' : 'unavailable';
            const missing = Array.isArray(status?.missing) && status.missing.length
                ? ` (missing ${status.missing.join(', ')})`
                : '';
            const active = status?.active ? 'active' : 'inactive';
            ctx.pushCommandOutput('/voice status', `voice ${available}${missing} · session ${active}${Number(status?.bufferedBytes ?? 0) > 0 ? ` · buffered ${status.bufferedBytes} bytes` : ''}\nUsage: /voice start|stop|cancel|status`);
            return true;
        }
    }
}
