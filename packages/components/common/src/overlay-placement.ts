export type UiPlacement = 'top' | 'bottom' | 'left' | 'right';

const OPPOSITE: Record<UiPlacement, UiPlacement> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
};

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
