import type { AnimationClock } from '@tsdi/components';
import { ToastService } from '@tsdi/components/common';
import { AgentConsoleNoticeExpiry } from './AgentConsoleNoticeExpiry';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/**
 * Host surface the toast/notice helpers need. Call them with the component
 * proxy (`this` from a lifecycle hook or method), never the raw constructor
 * instance: raw state writes bypass the reactive proxy.
 */
export interface AgentConsoleToastHost {
    /** Resolved at call time so a rebound proxy state is honoured. */
    getState(): AgentConsoleSessionState;
    toastService?: ToastService | null;
    toastUnsubscribe?: () => void;
    noticeExpiry?: AgentConsoleNoticeExpiry;
    animationClock?: AnimationClock | null;
}

/** Keep a queue even when the host did not provide one (tests, standalone). */
export function ensureConsoleToasts(host: AgentConsoleToastHost): void {
    host.toastService = host.toastService || new ToastService();
}

export function bindConsoleToasts(host: AgentConsoleToastHost): void {
    if (host.toastUnsubscribe) {
        return;
    }
    host.toastUnsubscribe = host.toastService?.subscribe(entries => host.getState().setToasts(entries));
}

export function disposeConsoleToasts(host: AgentConsoleToastHost): void {
    host.toastUnsubscribe?.();
    host.toastUnsubscribe = undefined;
    host.toastService?.clear();
    host.getState().setToasts([]);
}

export function dismissConsoleToast(host: AgentConsoleToastHost, id: string): void {
    host.toastService?.dismiss(id);
    host.getState().setToasts(host.toastService?.current || []);
}

/**
 * Route a console notice. Transient confirmations (copy, model switch,
 * reasoning effort) go to the toast strip so they stay out of the transcript
 * and status stream while auto-dismissing and staying closable; persistent
 * notices keep the status line; long output keeps the scrollable overlay.
 */
export function notifyConsole(
    host: AgentConsoleToastHost,
    message: string,
    duration: number | undefined,
    overlayTitle: () => string
): void {
    const lines = String(message || '').split('\n').filter(line => line.trim().length);
    if (Number(duration) > 0 && lines.length <= 3) {
        host.toastService?.show(message, { durationMs: Number(duration) });
        host.getState().setToasts(host.toastService?.current || []);
        return;
    }
    host.getState().setNotice(message);
    host.noticeExpiry ??= new AgentConsoleNoticeExpiry(() => host.getState().setNotice(''), host.animationClock);
    host.noticeExpiry.schedule(duration);
    if (lines.length > 3) {
        host.getState().openTextOverlay(overlayTitle(), lines);
    }
}
