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

/** Alerts (multi-line notices) close themselves unless the host timed them. */
export const NOTICE_OVERLAY_AUTO_CLOSE_MS = 20_000;

const overlayTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

function scheduleOverlayAutoClose(host: AgentConsoleToastHost, state: AgentConsoleSessionState, ms: number): void {
    const pending = overlayTimers.get(host);
    if (pending) {
        clearTimeout(pending);
    }
    const opened = state.textOverlay;
    const timer = setTimeout(() => {
        overlayTimers.delete(host);
        // Only close the alert we opened; a newer panel must survive.
        if (opened && host.getState().textOverlay === opened) {
            host.getState().closeTextOverlay();
        }
    }, Math.max(1, ms));
    (timer as { unref?: () => void }).unref?.();
    overlayTimers.set(host, timer);
}

/** Keep a queue even when the host did not provide one (tests, standalone). */
export function ensureConsoleToasts(host: AgentConsoleToastHost): void {
    host.toastService = host.toastService || new ToastService();
}

export function bindConsoleToasts(host: AgentConsoleToastHost): void {
    if (host.toastUnsubscribe) {
        return;
    }
    host.toastUnsubscribe = host.toastService?.subscribe(entries => {
        host.getState().setToasts(entries);
        if (!entries.length) {
            host.getState().setNotice('');
        }
    });
}

export function disposeConsoleToasts(host: AgentConsoleToastHost): void {
    const pending = overlayTimers.get(host);
    if (pending) {
        clearTimeout(pending);
        overlayTimers.delete(host);
    }
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
    if (lines.length <= 3) {
        // Short prompt-level feedback always belongs to the shared toast queue.
        // Keep the notice projection for non-TUI hosts and accessibility, but
        // the TUI status rail hides it while a toast is visible.
        const ms = Number(duration) > 0 ? Number(duration) : 4000;
        host.toastService?.show(message, { durationMs: ms });
        host.getState().setToasts(host.toastService?.current || []);
        if (!(Number(duration) > 0)) {
            // Keep the notice projection for persistent callers/tests; the TUI
            // hides it while the toast is visible.
            host.getState().setNotice(message);
            host.noticeExpiry ??= new AgentConsoleNoticeExpiry(() => host.getState().setNotice(''), host.animationClock);
            host.noticeExpiry.schedule(ms);
        }
        return;
    }
    host.getState().setNotice(message);
    host.noticeExpiry ??= new AgentConsoleNoticeExpiry(() => host.getState().setNotice(''), host.animationClock);
    host.noticeExpiry.schedule(duration);
    host.getState().openTextOverlay(overlayTitle(), lines);
    scheduleOverlayAutoClose(host, host.getState(), Number(duration) > 0 ? Number(duration) : NOTICE_OVERLAY_AUTO_CLOSE_MS);
}
