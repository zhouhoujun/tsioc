/**
 * Browser-only layout anchors for console overlays.
 *
 * - dialogs are anchored above the composer (real footer height)
 * - the jump-to-bottom affordance is anchored to the composer's top-right
 */
export interface WebOverlayAnchorOptions {
    doc: Document;
    mount: HTMLElement;
    indicator: HTMLElement;
    root?: HTMLElement;
}

export class WebOverlayAnchors {
    private footerObserver: ResizeObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(private readonly options: WebOverlayAnchorOptions) {
    }

    attach(): void {
        this.syncFooterHeight();
        this.positionIndicator();
        const view = this.options.doc.defaultView as (Window & typeof globalThis) | null | undefined;
        const Observer = (view as any)?.ResizeObserver as typeof ResizeObserver | undefined;
        if (Observer) {
            const footer = this.footerElement();
            this.footerObserver = footer ? new Observer(() => this.syncFooterHeight()) : null;
            this.footerObserver?.observe(footer as Element);
            const composer = this.composerElement();
            this.resizeObserver = composer ? new Observer(() => this.positionIndicator()) : null;
            this.resizeObserver?.observe(composer as Element);
        }
        view?.addEventListener?.('resize', this.onViewportResize, { passive: true });
        (view as any)?.visualViewport?.addEventListener?.('resize', this.onViewportResize);
    }

    dispose(): void {
        const view = this.options.doc.defaultView as (Window & typeof globalThis) | null | undefined;
        this.footerObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.footerObserver = null;
        this.resizeObserver = null;
        view?.removeEventListener?.('resize', this.onViewportResize);
        (view as any)?.visualViewport?.removeEventListener?.('resize', this.onViewportResize);
    }

    positionIndicator(): void {
        const composer = this.composerElement();
        if (!composer) {
            return;
        }
        const rect = composer.getBoundingClientRect();
        const viewport = this.options.doc.documentElement;
        this.options.indicator.style.right = `${Math.max(8, viewport.clientWidth - rect.right)}px`;
        this.options.indicator.style.bottom = `${Math.max(8, viewport.clientHeight - rect.top + 8)}px`;
    }

    syncFooterHeight(): void {
        const footer = this.footerElement();
        const rect = footer?.getBoundingClientRect();
        if (rect && rect.height > 0) {
            this.options.mount.style.setProperty('--agent-web-footer-height', `${Math.ceil(rect.height)}px`);
        }
    }

    private readonly onViewportResize = (): void => {
        this.syncFooterHeight();
        this.positionIndicator();
    };

    private footerElement(): HTMLElement | null {
        return (this.options.root?.querySelector?.('[renderregion="footer"]') as HTMLElement | null)
            ?? (this.options.root?.querySelector?.('.console-input-panel') as HTMLElement | null);
    }

    private composerElement(): HTMLElement | null {
        return (this.options.root?.querySelector?.('.input-shell') as HTMLElement | null)
            ?? (this.options.root?.querySelector?.('textarea.agent-input') as HTMLElement | null);
    }
}
