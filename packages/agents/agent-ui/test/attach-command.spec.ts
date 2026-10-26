import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { runAttachCommand, loadPendingAttachment, resolveAttachmentTargetPath } from '../src/AgentConsoleExportHandlers';

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

class FakeFileAdapter {
    constructor(private files: Record<string, Uint8Array> = {}) {}

    isAbsolute(value: string): boolean {
        return String(value || '').startsWith('/');
    }

    normalize(value: string): string {
        return String(value || '');
    }

    resolve(base: string, value: string): string {
        return `${String(base || '').replace(/\/$/, '')}/${String(value || '')}`;
    }

    read(path: string): any {
        const bytes = this.files[path];
        if (!bytes) {
            throw new Error(`ENOENT: no such file or directory '${path}'`);
        }
        return {
            async *[Symbol.asyncIterator]() {
                yield bytes;
            }
        };
    }
}

function createCtx(translator: any, files: Record<string, Uint8Array> = {}) {
    const adapter = new FakeFileAdapter(files);
    const notices: string[] = [];
    const attachments: any[] = [];
    const ctx: any = {
        translator,
        workspace: '/ws',
        state: {
            sessionId: 's1',
            pendingAttachments: attachments,
            setPendingAttachments(value: any[]) {
                attachments.length = 0;
                attachments.push(...value);
            },
            clearPendingAttachments() {
                attachments.length = 0;
            }
        },
        notify: (message: string) => notices.push(message),
        app: { get: () => adapter }
    };
    return { ctx, notices, attachments };
}

@Suite('attach command uses the active locale')
export class AttachCommandLocaleTest {

    @Test('an unsupported format reports the localized reason, not the English fallback')
    async unsupportedFormatIsLocalized() {
        const { ctx, notices } = createCtx(zh);
        await runAttachCommand(ctx, '/ws/notes.weird');
        expect(notices.length).toEqual(1);
        expect(notices[0]).toContain('不支持的附件格式');
        expect(notices[0]).not.toContain('Unsupported attachment format');
        // Actionable: the user has to know what is accepted.
        expect(notices[0]).toContain('png');
        expect(notices[0]).toContain('txt');
    }

    @Test('the English catalog still renders the English reason')
    async unsupportedFormatEnglish() {
        const { ctx, notices } = createCtx(en);
        await runAttachCommand(ctx, '/ws/notes.weird');
        expect(notices[0]).toContain('Unsupported attachment format');
        expect(notices[0]).toContain('Supported:');
        expect(notices[0]).toContain('png');
    }

    @Test('a missing image reports the localized failure wrapper and reason')
    async missingFileIsLocalized() {
        const { ctx, notices } = createCtx(zh);
        await runAttachCommand(ctx, '/ws/missing.png');
        expect(notices[0]).toContain('附加失败');
        expect(notices[0]).toContain('ENOENT');
    }

    @Test('loadPendingAttachment keeps the translator optional for existing callers')
    async translatorIsOptional() {
        const bytes = new Uint8Array([1, 2, 3]);
        const adapter = new FakeFileAdapter({ '/ws/a.png': bytes });
        const attachment = await loadPendingAttachment('/ws/a.png', '/ws', adapter as any);
        expect(attachment.kind).toEqual('image');
        expect(attachment.name).toEqual('a.png');
        let message = '';
        try {
            resolveAttachmentTargetPath('', '/ws', adapter as any);
        } catch (error: any) {
            message = error.message;
        }
        expect(message).toContain('Usage: /attach');
    }
}
