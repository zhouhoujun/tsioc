export type UiPlacement = 'top' | 'bottom' | 'left' | 'right';

const OPPOSITE: Record<UiPlacement, UiPlacement> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
};

export interface OverlayShift {
    x: number;
    y: number;
}

/**
 * Flip a preferred overlay placement when it would overflow the viewport.
 *
 * DOM-only: terminals and jsdom report zero-sized rects and simply keep the
 * preferred placement. The caller measures after the popup is rendered.
 */
export function resolveFlippedPlacement(
    anchor: any,
    popup: any,
    preferred: UiPlacement,
    margin = 6
): UiPlacement {
    const view = anchor?.ownerDocument?.defaultView;
    const anchorRect = anchor?.getBoundingClientRect?.();
    const popupRect = popup?.getBoundingClientRect?.();
    if (!view || !anchorRect || !popupRect) {
        return preferred;
    }
    const width = Number(view.innerWidth) || 0;
    const height = Number(view.innerHeight) || 0;
    if (!width || !height || (!popupRect.width && !popupRect.height)) {
        return preferred;
    }
    const fits = {
        top: anchorRect.top - popupRect.height - margin >= 0,
        bottom: anchorRect.bottom + popupRect.height + margin <= height,
        left: anchorRect.left - popupRect.width - margin >= 0,
        right: anchorRect.right + popupRect.width + margin <= width
    };
    if (fits[preferred]) {
        return preferred;
    }
    const opposite = OPPOSITE[preferred];
    return fits[opposite] ? opposite : preferred;
}

/** Fixed viewport coordinates for a portaled overlay. */
export function resolvePortalStyle(
    anchor: any,
    popup: any,
    placement: UiPlacement,
    shiftX = 0,
    shiftY = 0,
    margin = 8
): Record<string, string> | undefined {
    const view = (anchor?.ownerDocument as { defaultView?: Window } | undefined)?.defaultView;
    const rect = anchor?.getBoundingClientRect?.();
    const popupRect = popup?.getBoundingClientRect?.();
    if (!view || !rect || !popupRect || (!popupRect.width && !popupRect.height)) {
        return undefined;
    }
    let left = rect.left + (rect.width - popupRect.width) / 2 + shiftX;
    let top = rect.top - popupRect.height - 6;
    if (placement === 'bottom') {
        top = rect.bottom + 6;
    } else if (placement === 'left' || placement === 'right') {
        left = placement === 'left' ? rect.left - popupRect.width - 6 : rect.right + 6;
        top = rect.top + (rect.height - popupRect.height) / 2 + shiftY;
    }
    const width = Number(view.innerWidth) || 0;
    const height = Number(view.innerHeight) || 0;
    left = Math.max(margin, Math.min(left, width - popupRect.width - margin));
    top = Math.max(margin, Math.min(top, height - popupRect.height - margin));
    return {
        position: 'fixed',
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        transform: 'none',
        'z-index': '40'
    };
}

/**
 * Shift an overlay along its cross axis so it stays inside the viewport.
 * `centered` matches tooltip-style centering; popover-style edge alignment
 * starts at the anchor edge instead.
 */
export function resolveOverlayShift(
    anchor: any,
    popup: any,
    placement: UiPlacement,
    margin = 6,
    centered = true
): OverlayShift {
    const view = anchor?.ownerDocument?.defaultView;
    const anchorRect = anchor?.getBoundingClientRect?.();
    const popupRect = popup?.getBoundingClientRect?.();
    if (!view || !anchorRect || !popupRect) {
        return { x: 0, y: 0 };
    }
    const width = Number(view.innerWidth) || 0;
    const height = Number(view.innerHeight) || 0;
    if (!width || !height || (!popupRect.width && !popupRect.height)) {
        return { x: 0, y: 0 };
    }
    if (placement === 'top' || placement === 'bottom') {
        const left = centered
            ? (anchorRect.left + anchorRect.right - popupRect.width) / 2
            : anchorRect.left;
        const right = left + popupRect.width;
        if (left < margin) {
            return { x: Math.round(margin - left), y: 0 };
        }
        if (right > width - margin) {
            return { x: Math.round(width - margin - right), y: 0 };
        }
        return { x: 0, y: 0 };
    }
    const top = centered
        ? (anchorRect.top + anchorRect.bottom - popupRect.height) / 2
        : anchorRect.top;
    const bottom = top + popupRect.height;
    if (top < margin) {
        return { x: 0, y: Math.round(margin - top) };
    }
    if (bottom > height - margin) {
        return { x: 0, y: Math.round(height - margin - bottom) };
    }
    return { x: 0, y: 0 };
}
