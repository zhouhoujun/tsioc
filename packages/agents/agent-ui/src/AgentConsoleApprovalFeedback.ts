/** P1.1: `D` on an approval prompt moves focus to the composer and the next submit rejects with a note. */
export interface ApprovalFeedbackHost {
    feedbackRequestId(): string | undefined;
    feedbackText(): string;
    pendingApprovalCount(): number;
    clearFeedbackRequest(): void;
    setInput(value: string, cursor?: number): void;
    setNotice(message: string): void;
    setApprovalsFocused(focused: boolean): void;
    applyApprovalDecision(decision: 'approve' | 'deny', requestId: string, feedback?: string): Promise<boolean>;
}

/** Consume the pending feedback submit; returns false when no feedback is being typed. */
export async function consumeApprovalFeedbackView(host: ApprovalFeedbackHost): Promise<boolean> {
    const requestId = host.feedbackRequestId();
    if (!requestId) {
        return false;
    }
    const feedback = host.feedbackText().trim();
    host.clearFeedbackRequest();
    host.setInput('');
    host.setNotice('');
    await host.applyApprovalDecision('deny', requestId, feedback || undefined);
    if (host.pendingApprovalCount()) {
        host.setApprovalsFocused(true);
    }
    return true;
}

/** Component adapter: read/mutate the live session state without exposing protected members. */
export function consumeApprovalFeedbackFor(component: any): Promise<boolean> {
    return consumeApprovalFeedbackView({
        feedbackRequestId: () => component.state.approvalFeedbackRequestId,
        feedbackText: () => component.state.input,
        pendingApprovalCount: () => component.state.pendingApprovals.length,
        clearFeedbackRequest: () => { component.state.approvalFeedbackRequestId = undefined; },
        setInput: (value) => component.state.setInput(value),
        setNotice: (message) => component.state.setNotice(message),
        setApprovalsFocused: (focused) => component.state.setApprovalsFocused(focused),
        applyApprovalDecision: (decision, requestId, feedback) => component.applyApprovalDecision(decision, requestId, feedback)
    });
}
