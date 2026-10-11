import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { formatAgentUiNotice, agentUiEnglish, agentUiChinese, type AgentUiTranslator } from '../src/agent-ui.i18n';
import { AGENT_UI_NOTICE_EN } from '../src/agent-ui.i18n.notice.en';
import { AGENT_UI_NOTICE_ZH } from '../src/agent-ui.i18n.notice.zh';
import { AGENT_UI_ERROR_EN, AGENT_UI_ERROR_ZH } from '../src/agent-ui.i18n.error';

function translateFrom(bundle: typeof agentUiEnglish) {
    return (key: string, params?: Record<string, any>) => {
        const parts = key.split('.');
        let current: any = bundle.messages;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return key;
            }
        }
        if (typeof current !== 'string') {
            return key;
        }
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const en: AgentUiTranslator = { translate: translateFrom(agentUiEnglish) };
const zh: AgentUiTranslator = { translate: translateFrom(agentUiChinese) };

const CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

/**
 * The only notice entries allowed to stay byte-identical across locales: they
 * are language-neutral data-row templates (placeholders + punctuation only).
 */
const LANGUAGE_NEUTRAL_ROWS = new Set(['workspaceArrow', 'reviewFindingItem', 'riskTableRow']);

/**
 * U4 locale snapshot regression: locks the en/zh catalogs in lockstep, proves
 * no English residue leaks into zh, and proves the guarded formatter never
 * renders a raw key while keeping the no-translator English fallback intact.
 */
@Suite('agent-ui locale catalog regression (U4)')
export class AgentUiLocaleRegressionTest {

    @Test('notice catalogs stay in lockstep: same count, same keys, same order')
    noticeParity() {
        const enKeys = Object.keys(AGENT_UI_NOTICE_EN);
        const zhKeys = Object.keys(AGENT_UI_NOTICE_ZH);
        expect(enKeys.length).toEqual(460);
        expect(zhKeys).toEqual(enKeys);
    }

    @Test('error catalogs stay in lockstep')
    errorParity() {
        const enKeys = Object.keys(AGENT_UI_ERROR_EN);
        expect(enKeys.length).toEqual(14);
        expect(Object.keys(AGENT_UI_ERROR_ZH)).toEqual(enKeys);
    }

    @Test('no English residue in zh notice copy (except language-neutral row templates)')
    noEnglishResidue() {
        const offenders: string[] = [];
        for (const key of Object.keys(AGENT_UI_NOTICE_EN)) {
            const enText = String((AGENT_UI_NOTICE_EN as Record<string, string>)[key]);
            const zhText = String((AGENT_UI_NOTICE_ZH as Record<string, string>)[key]);
            if (LANGUAGE_NEUTRAL_ROWS.has(key)) {
                expect(zhText).toEqual(enText);
                continue;
            }
            if (zhText === enText) {
                offenders.push(`identical: ${key} -> ${enText}`);
                continue;
            }
            if (!CJK.test(zhText)) {
                offenders.push(`no CJK: ${key} -> ${zhText}`);
            }
        }
        expect(offenders).toEqual([]);
    }

    @Test('no English residue in zh error copy')
    noEnglishErrorResidue() {
        const offenders: string[] = [];
        for (const key of Object.keys(AGENT_UI_ERROR_EN)) {
            const enText = String((AGENT_UI_ERROR_EN as Record<string, string>)[key]);
            const zhText = String((AGENT_UI_ERROR_ZH as Record<string, string>)[key]);
            if (zhText === enText || !CJK.test(zhText)) {
                offenders.push(`${key} -> ${zhText}`);
            }
        }
        expect(offenders).toEqual([]);
    }

    @Test('formatAgentUiNotice falls back to English without a translator and never renders a raw key')
    guardedFormatterBackwardCompatible() {
        expect(formatAgentUiNotice(null, 'sshNoHosts')).toEqual('No SSH hosts configured.');
        expect(formatAgentUiNotice(undefined, 'sshConnected', { hostId: 'h1' })).toEqual('Connected to h1.');
        expect(formatAgentUiNotice(null, 'doesNotExistKey')).toEqual('');
        expect(formatAgentUiNotice(null, 'sseConnectionFailed', { status: 500 })).toEqual('SSE connection failed: HTTP 500');
    }

    @Test('formatAgentUiNotice resolves localized copy when a translator is wired')
    guardedFormatterLocalized() {
        expect(formatAgentUiNotice(zh, 'sshNoHosts')).toEqual('未配置 SSH 主机。');
        expect(formatAgentUiNotice(en, 'sshNoHosts')).toEqual('No SSH hosts configured.');
        expect(formatAgentUiNotice(zh, 'sshConnected', { hostId: 'myhost' })).toEqual('已连接到 myhost。');
    }

    @Test('newly localized ssh/settings/diagnostics/approval/side copy carries CJK under zh')
    localizedSamplesCarryCjk() {
        const samples: Array<[string, Record<string, any> | undefined]> = [
            ['sshConnected', { hostId: 'myhost' }],
            ['sshTunnelEstablished', { srcAddr: '127.0.0.1', srcPort: 0, destAddr: 'db', destPort: 5432, hostId: 'h1' }],
            ['timelineModeCompact', undefined],
            ['layoutViewportSet', undefined],
            ['harnessTaskCancelled', { id: 't1' }],
            ['turnDiagnosticsNoRecords', { sessionId: 's1' }],
            ['approvedTool', { toolName: 'Bash', id: 'abcd1234' }],
            ['deniedTool', { toolName: 'Bash', id: 'abcd1234' }],
            ['openedSideSession', { forked: 'sess-1' }],
            ['forkedSession', { forked: 'sess-1' }],
            ['cancellingTurn', undefined],
            ['experimentalFeatureEnabled', { name: 'multiAgent' }]
        ];
        for (const [key, params] of samples) {
            const text = formatAgentUiNotice(zh, key, params);
            expect(text.length).toBeGreaterThan(0);
            expect(CJK.test(text)).toEqual(true);
        }
    }
}
