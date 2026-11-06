import type { AgentConsoleGlobalKeyInputHost } from './AgentConsoleGlobalKeyInputController';
import type { AgentConsoleGlobalAction } from './AgentConsoleKeymap';
import { formatAgentUiNotice } from './agent-ui.i18n';

export async function executeGlobalKeyActionView(
    host: AgentConsoleGlobalKeyInputHost,
    action: AgentConsoleGlobalAction
): Promise<boolean> {
    if (action === 'command-palette') {
        host.openCommandPalette();
        return true;
    }
    if (action === 'interrupt-turn') {
        await host.interruptTurn();
        return true;
    }
    if (action === 'theme') {
        await host.handleCommand('/theme');
        return true;
    }
    if (action === 'toggle-thinking') {
        host.state.setShowThinking(!host.state.showThinking);
        host.notify(host.state.showThinking ? formatAgentUiNotice(host.translator, 'showingReasoningMessages') : formatAgentUiNotice(host.translator, 'hidingReasoningMessages'));
        return true;
    }
    if (action === 'open-editor') {
        await host.runEditorCommand();
        return true;
    }
    if (action === 'thread-child-first') {
        return host.navigateThreadChildFirst();
    }
    if (action === 'thread-cycle-next') {
        return host.navigateThreadCycle(1);
    }
    if (action === 'thread-cycle-prev') {
        return host.navigateThreadCycle(-1);
    }
    if (action === 'thread-parent') {
        return host.navigateThreadParent();
    }
    if (action === 'message-page-up') {
        // Page keys scroll the viewport while the composer owns focus; they
        // must not silently enter message selection.
        if (!host.state.focusLayers.hasMessageFocus()
            && host.state.messageLayout !== 'scrollback'
            && host.state.scrollTranscriptAction) {
            host.state.scrollTranscriptAction(10);
            return true;
        }
        if (!host.state.focusLayers.hasMessageFocus()) {
            return host.state.focusLatestLongMessage();
        }
        host.transcriptNavigationController.movePage(-1);
        return true;
    }
    if (action === 'message-page-down') {
        if (!host.state.focusLayers.hasMessageFocus()
            && host.state.messageLayout !== 'scrollback'
            && host.state.scrollTranscriptAction) {
            host.state.scrollTranscriptAction(-10);
            return true;
        }
        host.transcriptNavigationController.movePage(1);
        return true;
    }
    if (action === 'message-half-page-up') {
        host.transcriptNavigationController.movePage(-1, Math.max(1, Math.floor(host.state.consoleOptions.messageSelectionPageSize / 2)));
        return true;
    }
    if (action === 'message-half-page-down') {
        host.transcriptNavigationController.movePage(1, Math.max(1, Math.floor(host.state.consoleOptions.messageSelectionPageSize / 2)));
        return true;
    }
    if (action === 'message-line-up') {
        host.transcriptNavigationController.movePage(-1, 1);
        return true;
    }
    if (action === 'message-line-down') {
        host.transcriptNavigationController.movePage(1, 1);
        return true;
    }
    if (action === 'message-first') {
        host.transcriptNavigationController.selectFirst();
        return true;
    }
    if (action === 'message-last') {
        host.transcriptNavigationController.selectLast();
        return true;
    }
    if (action === 'message-last-user') {
        host.transcriptNavigationController.selectLastUser();
        return true;
    }
    if (action === 'model-favorite-toggle') {
        await host.toggleModelFavorite();
        return true;
    }
    if (action === 'model-cycle-recent') {
        await host.cycleRecentModel(1);
        return true;
    }
    if (action === 'model-cycle-recent-back') {
        await host.cycleRecentModel(-1);
        return true;
    }
    if (action === 'model-variant-cycle') {
        await host.cycleModelVariant();
        return true;
    }
    if (action === 'which-key-toggle') {
        host.toggleWhichKeyOverlay();
        return true;
    }
    if (action === 'which-key-layout-toggle') {
        host.state.toggleWhichKeyLayout();
        if (host.state.whichKeyVisible) {
            host.refreshWhichKeyBindings();
        }
        return true;
    }
    if (action === 'which-key-pending-toggle') {
        host.state.toggleWhichKeyFilterCustom();
        if (host.state.whichKeyVisible) {
            host.refreshWhichKeyBindings();
        }
        return true;
    }
    if (action === 'status-health') {
        await host.toggleHealthPopover();
        return true;
    }
    if (action === 'timeline-mode') {
        await host.runTimelineModeCommand();
        return true;
    }
    if (action === 'queue-follow-up') {
        return host.queueDraft();
    }
    if (action === 'clear-scrollback') {
        return host.clearScrollback();
    }
    if (action === 'clear-input') {
        host.state.setInput('', 0);
        return true;
    }
    const commands: Record<Exclude<AgentConsoleGlobalAction, 'command-palette' | 'theme' | 'interrupt-turn' | 'toggle-thinking' | 'open-editor' | 'thread-child-first' | 'thread-cycle-next' | 'thread-cycle-prev' | 'thread-parent' | 'message-page-up' | 'message-page-down' | 'message-half-page-up' | 'message-half-page-down' | 'message-line-up' | 'message-line-down' | 'message-first' | 'message-last' | 'message-last-user' | 'model-favorite-toggle' | 'model-cycle-recent' | 'model-cycle-recent-back' | 'model-variant-cycle' | 'which-key-toggle' | 'which-key-layout-toggle' | 'which-key-pending-toggle' | 'status-health' | 'timeline-mode' | 'queue-follow-up' | 'clear-scrollback' | 'clear-input'>, string> = {
        'new-session': '/new',
        compact: '/compact',
        export: '/export',
        undo: '/undo',
        redo: '/redo',
        sessions: '/sessions',
        model: '/model',
        archetypes: '/archetype',
        status: '/status',
        copy: '/copy',
        'command-outputs': '/outputs',
        // The composer still holds the draft here (submitView is not involved), so
        // /stash push can capture it; the command clears it after saving.
        'stash-draft': '/stash push',
        // Same reason: the draft is only readable here, not after submitView clears it.
        'copy-draft': '/copy input'
    };
    await host.handleCommand(commands[action]);
    return true;
}
