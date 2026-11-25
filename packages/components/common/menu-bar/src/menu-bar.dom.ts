/**
 * DOM focus helpers for the menu bar. Kept renderer-neutral: every helper
 * checks for a real browser document, so terminal hosts (where `ownerDocument`
 * has no `defaultView`) simply skip focus work.
 */

/** Focus a node only when it belongs to a real browser document. */
export function focusDomElement(node: any): void {
    const view = node?.ownerDocument?.defaultView;
    const ElementCtor = view?.HTMLElement;
    if (node && ElementCtor && node instanceof ElementCtor) {
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

/** Enabled direct child buttons of a menu container. */
export function menuButtons(container: any): HTMLElement[] {
    return Array.from(container?.children || []).filter(node =>
        (node as HTMLElement).tagName?.toLowerCase() === 'button'
        && !(node as HTMLButtonElement).disabled) as HTMLElement[];
}

/** Top-level (non-flyout) menu buttons in the rendered bar. */
export function topLevelMenuButtons(root: any): HTMLElement[] {
    const popup = root?.querySelector?.('.menu-bar-popup');
    const nodes = Array.from(popup?.querySelectorAll?.('.menu-bar-item') || []) as HTMLElement[];
    return nodes.filter(node =>
        !node.closest?.('.menu-bar-submenu') && !(node as HTMLButtonElement).disabled);
}

/** The currently open flyout, if any. */
export function openSubmenuElement(root: any): HTMLElement | undefined {
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
