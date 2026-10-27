import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { handleVoiceCommand } from '../src/AgentConsoleVoiceHandlers';

function translateFrom(bundle: any) {
    return (key: string, params?: Record<string, any>) => {
        const current = String(key || '').split('.').reduce<any>((acc, part) => {
            if (acc && typeof acc === 'object' && part in acc) return acc[part];
            return undefined;
        }, (bundle as any)?.messages ?? bundle);
        if (typeof current !== 'string') return key;
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const zh = { translate: translateFrom(agentUiChinese) } as any;
const en = { translate: translateFrom(agentUiEnglish) } as any;

function createCtx(translator: any, service: any) {
    const notices: string[] = [];
    const outputs: string[] = [];
    const ctx: any = {
        translator,
        state: { sessionId: 'session-1' },
        sessionService: service,
        audioCapture: null,
        audioPlayback: null,
        notify: (message: string) => notices.push(message),
        pushCommandOutput: (_command: string, text: string) => outputs.push(text),
        getCaptureSessionId: () => '',
        setCaptureSessionId: () => undefined,
        getCaptureFeed: () => Promise.resolve(),
        setCaptureFeed: () => undefined
    };
    return { ctx, notices, outputs };
}

@Suite('voice command failures are localized')
export class VoiceCommandFailureTest {

    @Test('/voice stop without an active session reports the localized notice')
    async stopWithoutSession() {
        const { ctx, notices } = createCtx(zh, {
            endVoiceSession: async () => ({ ok: false, error: 'no active audio session; call audio.start first' })
        });
        await handleVoiceCommand(ctx, 'stop');
        expect(notices.length).toEqual(1);
        expect(notices[0]).toEqual('没有进行中的语音会话。');
        expect(notices[0]).not.toContain('audio.start');
    }

    @Test('/voice start without streaming adapters reports the missing adapters in the active locale')
    async startWithoutAdapters() {
        const { ctx, notices } = createCtx(zh, {
            startVoiceSession: async () => ({ ok: false, error: 'audio unavailable: missing streaming STT and TTS adapters' }),
            getVoiceStatus: async () => ({ available: false, active: false, missing: ['streaming STT adapter', 'streaming TTS adapter'] })
        });
        await handleVoiceCommand(ctx, 'start');
        expect(notices.length).toEqual(1);
        expect(notices[0]).toContain('语音不可用');
        expect(notices[0]).toContain('streaming STT adapter');
        expect(notices[0]).toContain('/voice start');
    }

    @Test('/voice start without app rpc reports the localized control notice')
    async startWithoutGateway() {
        const { ctx, notices } = createCtx(en, {
            startVoiceSession: async () => ({ ok: false, error: 'voice session requires a connected gateway and sessionId' })
        });
        await handleVoiceCommand(ctx, 'start');
        expect(notices[0]).toEqual('Voice control is unavailable without app RPC.');
    }

    @Test('an unknown gateway failure stays visible as a diagnostic')
    async unknownFailureIsPreserved() {
        const { ctx, notices } = createCtx(en, {
            endVoiceSession: async () => ({ ok: false, error: 'upstream exploded' })
        });
        await handleVoiceCommand(ctx, 'stop');
        expect(notices[0]).toContain('upstream exploded');
    }
}
