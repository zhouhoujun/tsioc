/**
 * Fixed-position style for the tab overflow menu.
 *
 * The menu lives inside the horizontally scrolling strip in the template; a
 * viewport-fixed box keeps it from being clipped by the strip's overflow.
 * Terminal hosts (or jsdom without layout) return undefined and keep the CSS
 * fallback.
 */
export function positionTabOverflowMenu(strip: any, measure = false): Record<string, string> | undefined {
    const trigger = strip?.querySelector?.('.tab-overflow') as HTMLElement | undefined;
    const view = (trigger?.ownerDocument as { defaultView?: Window } | undefined)?.defaultView;
    const rect = trigger?.getBoundingClientRect?.();
    if (!view || !rect || (!rect.width && !rect.height)) {
        return undefined;
    }
    const menu = strip?.querySelector?.('.tab-overflow-menu') as HTMLElement | undefined;
    const menuRect = measure ? menu?.getBoundingClientRect?.() : undefined;
    const width = Number(menuRect?.width) || 240;
    const height = Number(menuRect?.height) || 0;
    const margin = 8;
    const innerWidth = Number(view.innerWidth) || width + margin * 2;
    const innerHeight = Number(view.innerHeight) || height + margin * 2;
    const left = Math.max(margin, Math.min(rect.right - width, innerWidth - width - margin));
    const below = rect.bottom + 4;
    const above = rect.top - height - 4;
    const top = height && below + height > innerHeight - margin && above >= margin ? above : below;
    return {
        position: 'fixed',
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        right: 'auto',
        'max-height': `${Math.max(120, Math.round(innerHeight - top - margin))}px`,
        'z-index': '40'
    };
}
