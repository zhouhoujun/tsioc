import { DomScrollBox } from './scroll-box-dom';

export interface TranscriptFollowLabels {
    /** New-message count label; `{count}` is replaced with the number. */
    newMessages: string;
    jumpToBottom: string;
}

export interface DomTranscriptFollowerOptions {
    labels?: Partial<TranscriptFollowLabels>;
    /** Called when the user reaches the oldest rendered row. */
    onReachTop?: () => void;
}

const DEFAULT_LABELS: TranscriptFollowLabels = {
    newMessages: '{count} new messages',
    jumpToBottom: 'jump to bottom'
};

/**
 * Binds a transcript scroll element (and optional indicator element) to the
 * renderer-neutral base ScrollBox: keeps the reading position stable when new
 * content arrives, counts new rows while scrolled away, shows the indicator, and
 * re-follows on jump-to-latest or when the user scrolls back to the bottom.
 * The scrolling/follow semantics live in ScrollBox; this is the DOM adaptation.
 */
export class DomTranscriptFollower {
    private readonly box: DomScrollBox;
    private readonly labels: TranscriptFollowLabels;
    private observer?: MutationObserver | null;
    private previousScrollHeight = 0;
    private lastScrollTop = 0;
    private prependPending = false;

    private readonly onScroll = (): void => {
        const scrollTop = this.transcript.scrollTop;
        const movedUp = scrollTop < this.lastScrollTop;
        this.lastScrollTop = scrollTop;
        this.box.sync();
        if (this.box.atBottom) {
            this.resumeFollow();
        } else {
            this.updateIndicator();
        }
        this.previousScrollHeight = this.transcript.scrollHeight;
        if (movedUp && this.box.atTop) {
            this.options.onReachTop?.();
        }
    };

    constructor(
        private readonly transcript: HTMLElement,
        private readonly indicator?: HTMLElement | null,
        private readonly options: DomTranscriptFollowerOptions = {}
    ) {
        this.box = new DomScrollBox(transcript);
        this.labels = { ...DEFAULT_LABELS, ...(options.labels || {}) };
        this.previousScrollHeight = transcript.scrollHeight;
    }

    attach(): void {
        this.box.scrollToBottom();
        this.previousScrollHeight = this.transcript.scrollHeight;
        this.lastScrollTop = this.transcript.scrollTop;
        this.updateIndicator();
        this.transcript.addEventListener('scroll', this.onScroll);
        const view = this.transcript.ownerDocument?.defaultView as (Window & typeof globalThis) | null | undefined;
        const Observer = view?.MutationObserver ?? (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver;
        if (Observer) {
            this.observer = new Observer(() => this.onContentGrew());
            this.observer.observe(this.transcript, { childList: true, subtree: true, characterData: true });
        }
    }

    detach(): void {
        this.transcript.removeEventListener('scroll', this.onScroll);
        this.observer?.disconnect();
        this.observer = null;
    }

    sync(): void {
        this.box.sync();
        this.updateIndicator();
    }

    wheel(delta: number): boolean {
        const moved = this.box.wheel(delta);
        this.updateIndicator();
        return moved;
    }

    /** Preserve the reading row when an older page is prepended. */
    notifyPrepend(): void {
        this.prependPending = true;
    }

    /** Called when the transcript content grows (new rows appended or prepended). */
    onContentGrew(): void {
        const wasAtBottom = this.box.atBottom;
        const previousHeight = this.previousScrollHeight;
        this.box.sync();
        const height = this.transcript.scrollHeight;
        if (this.prependPending) {
            this.prependPending = false;
            if (wasAtBottom) {
                this.box.scrollToBottom();
            } else if (height > previousHeight) {
                this.transcript.scrollTop += height - previousHeight;
                this.box.sync();
            }
        } else if (wasAtBottom) {
            this.box.scrollToBottom();
        } else {
            this.box.noteNewItems(1);
        }
        this.previousScrollHeight = height;
        this.updateIndicator();
    }

    resumeFollow(): void {
        this.box.scrollToBottom();
        this.updateIndicator();
    }

    get newItemCount(): number {
        return this.box.newItemCount;
    }

    get following(): boolean {
        return this.box.following;
    }

    get atTop(): boolean {
        return this.box.atTop;
    }

    private updateIndicator(): void {
        if (!this.indicator) {
            return;
        }
        const count = this.box.newItemCount;
        const show = !this.box.following && count > 0;
        this.indicator.style.display = show ? '' : 'none';
        if (show) {
            this.indicator.textContent = `${this.labels.newMessages.replace('{count}', String(count))} · ${this.labels.jumpToBottom}`;
        }
    }
}
