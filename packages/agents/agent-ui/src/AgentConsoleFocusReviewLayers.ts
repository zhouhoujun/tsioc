import type { AgentConsoleFocusLayer, AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import type { AgentConsoleOverlayController } from './AgentConsoleOverlay';

/** Review and approval key routing split from the focus-layer facade. */
export abstract class AgentConsoleFocusReviewLayers {
    protected abstract readonly state: AgentConsoleSessionState;
    protected abstract readonly overlay: AgentConsoleOverlayController;
    protected reviewCommandMode = false;
    abstract isDismissKey(key: string): boolean;
    abstract dismiss(transcriptNavigation: AgentConsoleTranscriptNavigationController): Promise<boolean>;
    abstract sync(): void;

    handleReviewKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.reviewOpen) return undefined;
        if (normalized === '/') { this.beginReviewCommand(); return true; }
        if ((normalized === 'esc' || normalized === 'escape') && state.canCancelFocusedCodingTask()) {
            return this.cancelFocusedTask();
        }
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'copy': return this.copyReview();
            case ',': state.moveReviewGroupSelection(-1); return true;
            case '.': state.moveReviewGroupSelection(1); return true;
            case 'a': state.setReviewPatchFilter('additions'); return true;
            case 'u': state.setReviewPatchFilter('all'); return true;
            case '[': state.moveReviewFileSelection(-1); return true;
            case ']': state.moveReviewFileSelection(1); return true;
            case 'p': return state.navigateReviewLineage(-1);
            case 'n': return state.navigateReviewLineage(1);
            case 'down': state.scrollReviewDetail(1); return true;
            case 'up': state.scrollReviewDetail(-1); return true;
            case 'left': state.scrollReviewDetailColumns(-4); return true;
            case 'right': state.scrollReviewDetailColumns(4); return true;
            case 'pageup': state.scrollReviewDetailPage(-1); return true;
            case 'pagedown': state.scrollReviewDetailPage(1); return true;
            case 'home': state.scrollReviewDetailToEdge('start'); return true;
            case 'end': state.scrollReviewDetailToEdge('end'); return true;
            case '{': state.jumpReviewHunk(-1); return true;
            case '}': state.jumpReviewHunk(1); return true;
            case 'f': state.toggleReviewHunkFold(); return true;
            case 's': state.toggleReviewSideBySide(); return true;
            case 'r': return state.canRetryFocusedCodingTask() ? this.retryFocusedTask() : false;
            default: return false;
        }
    }

    handleApprovalKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.approvalsFocused) return undefined;
        // opencode maps Escape on a permission prompt to reject, never to
        // cancelling the running turn.
        if (this.isDismissKey(normalized)) return this.resolveApproval('deny');
        const decision = this.overlay.resolveListKey(normalized);
        switch (decision.action) {
            case 'move': state.moveApprovalSelection(decision.delta); return true;
            case 'home': state.selectFirstApproval(); return true;
            case 'end': state.selectLastApproval(); return true;
            case 'page': state.moveApprovalSelectionPage(decision.direction); return true;
            case 'escape': return this.resolveApproval('deny');
        }
        if (normalized === 'copy') return this.copyApproval();
        if (normalized === 'approve-always') return this.resolveApprovalAlways();
        if (normalized === 'approve' || normalized === 'deny') return this.resolveApproval(normalized);
        return false;
    }

    private async cancelFocusedTask(): Promise<boolean> { await this.state.cancelFocusedCodingTask(); return true; }
    private async retryFocusedTask(): Promise<boolean> { await this.state.retryFocusedCodingTask(); return true; }
    private async copyReview(): Promise<boolean> {
        await this.state.copyFocusedTextAction?.(this.state.buildSelectedReviewCopyText(), this.state.translateLabel('agent.notice.copyLabelReview', undefined, 'review')); return true;
    }
    private async copyApproval(): Promise<boolean> {
        await this.state.copyFocusedTextAction?.(this.state.buildSelectedApprovalCopyText(), this.state.translateLabel('agent.notice.copyLabelSelectedApproval', undefined, 'selected approval')); return true;
    }
    private async resolveApprovalAlways(): Promise<boolean> {
        const state = this.state;
        if (!state.selectedApproval?.id) return false;
        await state.approvalAlwaysAllowAction?.(state.selectedApproval.id);
        return true;
    }

    private async resolveApproval(action: 'approve' | 'deny'): Promise<boolean> {
        const state = this.state;
        if (!state.selectedApproval?.id) return false;
        await state.resolveApprovalAction?.(action, state.selectedApproval.id);
        return true;
    }

    /** `/` in the review panel: keep the review open (annotations still apply) and focus the composer. */
    beginReviewCommand(): boolean {
        if (!this.state.reviewOpen) return false;
        this.reviewCommandMode = true;
        this.state.setInput('/');
        this.sync();
        return true;
    }

    endReviewCommand(): boolean {
        if (!this.reviewCommandMode) return false;
        this.reviewCommandMode = false;
        this.sync();
        return true;
    }
}
