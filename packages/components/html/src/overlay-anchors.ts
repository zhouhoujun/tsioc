/**
 * Renderer-neutral DOM anchoring for floating console chrome.
 *
 * The business layer supplies the concrete footer/composer/indicator elements
 * and variable name; this module only measures and positions. It keeps the
 * layout mechanics in `components/html` instead of duplicating them in hosts.
 */
export interface DomOverlayAnchorsOptions {
    document: Document;
    /** Element that receives the measured footer height as a CSS variable. */
    container: HTMLElement;
    /** Measured footer/composer container. */
    footer?: HTMLElement | null;
    /** Element whose top-right corner anchors the indicator. */
    composer?: HTMLElement | null;
    /** Floating affordance to position (optional). */
    indicator?: HTMLElement | null;
    /** CSS variable name for the measured footer height. */
    footerVariable?: string;
    /** Gap above the composer and from the right edge, in px. */
    offset?: number;
}

export class DomOverlayAnchors {
    private footerObserver: ResizeObserver | null = null;
    private composerObserver: ResizeObserver | null = null;

    constructor(private readonly options: DomOverlayAnchorsOptions) {
    }

    attach(): void {
        this.syncFooterHeight();
        this.positionIndicator();
        const view = this.options.document.defaultView as (Window & typeof globalThis) | null | undefined;
        const Observer = (view as any)?.ResizeObserver as typeof ResizeObserver | undefined;
        if (Observer) {
            if (this.options.footer) {
                this.footerObserver = new Observer(() => this.syncFooterHeight());
                this.footerObserver.observe(this.options.footer);
            }
            if (this.options.composer) {
                this.composerObserver = new Observer(() => this.positionIndicator());
                this.composerObserver.observe(this.options.composer);
            }
        }
        view?.addEventListener?.('resize', this.onViewportResize, { passive: true });
        (view as any)?.visualViewport?.addEventListener?.('resize', this.onViewportResize);
    }

    dispose(): void {
        const view = this.options.document.defaultView as (Window & typeof globalThis) | null | undefined;
        this.footerObserver?.disconnect();
        this.composerObserver?.disconnect();
        this.footerObserver = null;
        this.composerObserver = null;
        view?.removeEventListener?.('resize', this.onViewportResize);
        (view as any)?.visualViewport?.removeEventListener?.('resize', this.onViewportResize);
    }

    /** Position the floating affordance at the composer's top-right corner. */
    positionIndicator(): void {
        const composer = this.options.composer;
        const indicator = this.options.indicator;
        if (!composer || !indicator) {
            return;
        }
        const rect = composer.getBoundingClientRect();
        const viewport = this.options.document.documentElement;
        const offset = this.options.offset ?? 8;
        indicator.style.right = `${Math.max(offset, viewport.clientWidth - rect.right)}px`;
        indicator.style.bottom = `${Math.max(offset, viewport.clientHeight - rect.top + offset)}px`;
    }

    /** Expose the real footer height so overlays can anchor above the composer. */
    syncFooterHeight(): void {
        const footer = this.options.footer;
        const rect = footer?.getBoundingClientRect();
        if (rect && rect.height > 0) {
            this.options.container.style.setProperty(
                this.options.footerVariable ?? '--console-footer-height',
                `${Math.ceil(rect.height)}px`
            );
        }
    }

    private readonly onViewportResize = (): void => {
        this.syncFooterHeight();
        this.positionIndicator();
    };
}
