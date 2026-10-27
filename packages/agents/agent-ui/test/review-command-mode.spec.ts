import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { COMMAND_HANDLERS } from '../src/AgentConsoleCommandHandlers';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { navigationFor } from './test-transcript-navigation';

function metaFor(command: string) {
    return { command, matches: [command] };
}

function annotationCtx(options: { reviewOpen: boolean; sections?: any[] }) {
    const notices: string[] = [];
    const applied: Array<{ status: string; comment?: string }> = [];
    const ctx: any = {
        isTurnInProgress: () => false,
        notifyBusyState: () => undefined,
        notify: (message: string) => notices.push(message),
        translator: null,
        state: {
            reviewOpen: options.reviewOpen,
            reviewFileSections: options.sections || [],
            setReviewFileAnnotation: (status: string, comment?: string) => { applied.push({ status, comment }); },
            approveAllReviewFiles: () => { applied.push({ status: 'approve-all' }); },
            clearAllReviewAnnotations: () => { applied.push({ status: 'clear-all' }); },
            clearReviewFileAnnotation: () => { applied.push({ status: 'clear' }); }
        }
    };
    return { ctx, notices, applied };
}

@Suite('review panel command mode')
export class ReviewCommandModeTest {
    @Test('/ in the review panel focuses the composer, keeps the panel open, and Esc steps back')
    async slashEntersCommandMode() {
        const state = new AgentConsoleSessionState();
        state.reviewOpen = true;
        state.setInput('draft');
        state.focusLayers.sync();
        expect(state.focusLayers.blocksComposerInput()).toEqual(true);

        const handled = await state.processDecodedInput(
            { text: '/', controlKey: undefined, partial: false } as any,
            '',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state)
            }
        );

        expect(handled.handled).toEqual(true);
        expect(state.input).toEqual('/');
        expect(state.focusLayers.blocksComposerInput()).toEqual(false);
        expect(state.reviewOpen).toEqual(true);

        // The leading `/` opens the command suggestions; close them first so the
        // next Esc is about the review layer itself.
        if (state.selectMenu) {
            await state.cancelSelectMenu();
        }

        // Esc leaves command mode but keeps the review (and its selection) alive.
        expect(await state.focusLayers.handleEscape(navigationFor(state))).toEqual(true);
        expect(state.reviewOpen).toEqual(true);
        expect(state.focusLayers.blocksComposerInput()).toEqual(true);

        // A second Esc closes the panel.
        expect(await state.focusLayers.handleEscape(navigationFor(state))).toEqual(true);
        expect(state.reviewOpen).toEqual(false);
        expect(state.focusLayers.blocksComposerInput()).toEqual(false);
    }

    @Test('closing the review drops command mode so the next open starts focused on the panel')
    async closeResetsCommandMode() {
        const state = new AgentConsoleSessionState();
        state.reviewOpen = true;
        state.focusLayers.beginReviewCommand();
        expect(state.focusLayers.blocksComposerInput()).toEqual(false);

        state.closeReview();
        state.reviewOpen = true;
        state.focusLayers.sync();

        expect(state.focusLayers.blocksComposerInput()).toEqual(true);
    }

    @Test('/review approve reports an actionable message instead of success while the panel is closed')
    async approveNeedsOpenPanel() {
        const closed = annotationCtx({ reviewOpen: false });
        await COMMAND_HANDLERS['/review'](closed.ctx, 'approve', metaFor('/review'));
        expect(closed.applied).toEqual([]);
        expect(closed.notices).toEqual(['Open the review panel first (/review diff or /review run), then retry.']);

        const noFiles = annotationCtx({ reviewOpen: true, sections: [] });
        await COMMAND_HANDLERS['/review'](noFiles.ctx, 'approve-all', metaFor('/review'));
        expect(noFiles.applied).toEqual([]);
        expect(noFiles.notices).toEqual(['Open the review panel first (/review diff or /review run), then retry.']);
    }

    @Test('/review approve and reject annotate the selected file while the panel is open')
    async annotationsApplyWhileOpen() {
        const open = annotationCtx({ reviewOpen: true, sections: [{ path: 'src/a.ts' }] });
        await COMMAND_HANDLERS['/review'](open.ctx, 'approve looks good', metaFor('/review'));
        await COMMAND_HANDLERS['/review'](open.ctx, 'reject needs tests', metaFor('/review'));
        expect(open.applied).toEqual([
            { status: 'approved', comment: 'looks good' },
            { status: 'rejected', comment: 'needs tests' }
        ]);
        expect(open.notices).toEqual(['File approved: looks good', 'File rejected: needs tests']);

        await COMMAND_HANDLERS['/review'](open.ctx, 'approve-all', metaFor('/review'));
        expect(open.applied[open.applied.length - 1]).toEqual({ status: 'approve-all' });
    }
}
