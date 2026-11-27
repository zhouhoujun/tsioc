/**
 * DOM focus helpers for the menu bar. Kept renderer-neutral: every helper
 * checks for a real browser document, so terminal hosts (where `ownerDocument`
 * has no `defaultView`) simply skip focus work.
 */

/** Focus a node only when it belongs to a real browser document. */
export function focusDomElement(node: any): void {
    const view = node?.ownerDocument?.defaultView;
    const ElementCtor = view?.HTMLElement;
    if (node && node.isConnected !== false && ElementCtor && node instanceof ElementCtor) {
        node.focus();
    }
}

/**
 * DOM focus can only land once the popup is no longer hidden. Bindings may
 * clear `hidden` on a later microtask, so retry briefly instead of dropping
 * the focus move.
 */
export function scheduleDomFocus(doc: any, pick: () => any, attempts = 3): void {
    if (!doc?.defaultView?.HTMLElement) {
        return;
    }
    const step = (remaining: number) => {
        const node = pick();
        if (node) {
            focusDomElement(node);
        }
        if (remaining > 0 && (!node || doc.activeElement !== node)) {
            void Promise.resolve().then(() => step(remaining - 1));
        }
    };
    void Promise.resolve().then(() => step(attempts));
}

/**
 * Enabled buttons at the container's own menu level. Entry wrappers are
 * traversed, nested flyouts are not, so a three-level menu keeps roving focus
 * inside the level the user is currently in.
 */
export function menuButtons(container: any): HTMLElement[] {
    const output: HTMLElement[] = [];
    const visit = (node: any) => {
        Array.from(node?.children || []).forEach((child: any) => {
            const tag = String(child?.tagName || '').toLowerCase();
            if (tag === 'button') {
                if (!child.disabled) {
                    output.push(child);
                }
            } else if (tag && !child.classList?.contains('menu-bar-submenu')) {
                visit(child);
            }
        });
    };
    visit(container);
    return output;
}

/** Accessible label text for a menu button (falls back to textContent). */
export function menuButtonLabel(button: any): string {
    return String(button?.querySelector?.('.menu-bar-item-label')?.textContent ?? button?.textContent ?? '').trim();
}

/** Top-level (non-flyout) menu buttons in the rendered bar. */
export function topLevelMenuButtons(root: any): HTMLElement[] {
    const popup = root?.querySelector?.('.menu-bar-popup');
    const nodes = Array.from(popup?.querySelectorAll?.('.menu-bar-item') || []) as HTMLElement[];
    return nodes.filter(node =>
        !node.closest?.('.menu-bar-submenu') && !(node as HTMLButtonElement).disabled);
}

/** The flyout owned by the entry with `id`. */
export function submenuElementFor(root: any, id: string): HTMLElement | undefined {
    return root?.querySelector?.(`.menu-bar-submenu[data-submenu-id="${id}"]`) as HTMLElement | undefined;
}

/** The currently open flyout, preferring the one owned by `id`. */
export function openSubmenuElement(root: any, id?: string): HTMLElement | undefined {
    if (id) {
        const scoped = submenuElementFor(root, id);
        if (scoped?.classList?.contains('is-open')) {
            return scoped;
        }
    }
    return root?.querySelector?.('.menu-bar-submenu.is-open') as HTMLElement | undefined;
}

/**
 * Enabled items at the current roving level: the top-level bar, or the direct
 * children of the open flyout when focus is already inside it.
 */
export function menuLevelButtons(root: any, doc: any): HTMLElement[] {
    const openSubmenu = doc?.activeElement?.closest?.('.menu-bar-submenu') as HTMLElement | undefined;
    if (openSubmenu?.classList.contains('is-open')) {
        return menuButtons(openSubmenu);
    }
    return topLevelMenuButtons(root);
}


export interface MenuBarDismissBinding {
    /** Whether the menu is currently open. */
    isOpen(): boolean;
    /** The menu root element used for containment checks. */
    root(): any;
    /** Called for a pointer press outside the menu. */
    outside(): void;
    /** Called for the Escape key. */
    escape(): void;
}

/**
 * Bind document-level outside/Escape dismissal. Returns a cleanup function so
 * the component never keeps listeners after it is destroyed.
 */
export function bindMenuBarDismiss(doc: any, binding: MenuBarDismissBinding): () => void {
    if (!doc || typeof doc.addEventListener !== 'function') {
        return () => undefined;
    }
    const pointer = (event: any) => {
        if (!binding.isOpen()) {
            return;
        }
        const root = binding.root();
        const target = event?.target as any;
        if (root && target && typeof root.contains === 'function' && root.contains(target)) {
            return;
        }
        binding.outside();
    };
    const key = (event: any) => {
        if (!binding.isOpen() || event?.key !== 'Escape') {
            return;
        }
        event.preventDefault?.();
        event.stopPropagation?.();
        binding.escape();
    };
    doc.addEventListener('mousedown', pointer, true);
    doc.addEventListener('keydown', key, true);
    return () => {
        doc.removeEventListener?.('mousedown', pointer, true);
        doc.removeEventListener?.('keydown', key, true);
    };
}


export interface SubmenuLayout {
    side: 'left' | 'right';
    left: number;
    right: number;
    top: number;
    bottom: number;
    above: boolean;
    maxHeight: number;
}

/**
 * Compute fixed coordinates for a flyout anchored to its parent row. The popup
 * is a scroll container, so flyouts must escape it with fixed coordinates.
 */
export function measureSubmenuLayout(target: any): SubmenuLayout | undefined {
    const rect = target?.getBoundingClientRect?.();
    if (!rect) {
        return undefined;
    }
    const win = target?.ownerDocument?.defaultView
        || (globalThis as { innerHeight?: number });
    const width = 240;
    const viewWidth = Number((win as any)?.innerWidth) || 1024;
    const viewHeight = Number((win as any)?.innerHeight) || 768;
    const openLeft = rect.right + width + 8 > viewWidth;
    const side: 'left' | 'right' = openLeft ? 'left' : 'right';
    const left = Math.round(rect.right + 2);
    const right = Math.max(8, Math.round(viewWidth - rect.left + 2));
    const top = Math.max(8, rect.top - 6);
    const visibleBottom = Math.min(rect.bottom, viewHeight - 8);
    const below = viewHeight - top - 8;
    const above = visibleBottom - 8;
    const flip = below < 160 && above > below;
    return {
        side,
        left,
        right,
        top: Math.round(top),
        bottom: Math.max(8, Math.round(viewHeight - visibleBottom - 6)),
        above: flip,
        maxHeight: Math.max(120, Math.round(flip ? above : below))
    };
}

export interface PopupLayout {
    above: boolean;
    maxHeight: number;
}

/** Bound the popup by the space between the trigger and the viewport edge. */
export function measurePopupLayout(trigger: any, margin = 12): PopupLayout {
    const rect = trigger?.getBoundingClientRect?.();
    const win = trigger?.ownerDocument?.defaultView
        || (globalThis as { innerHeight?: number });
    const viewHeight = Number((win as any)?.innerHeight) || 768;
    // jsdom and non-layout hosts report a zero rect; fall back to the full
    // viewport so CSS max-height still never becomes a fixed cap.
    if (!rect || (!rect.height && !rect.top && !rect.bottom)) {
        return { above: false, maxHeight: Math.max(160, viewHeight - margin * 2) };
    }
    const below = viewHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const flip = below < 240 && above > below;
    return { above: flip, maxHeight: Math.max(160, flip ? above : below) };
}
