/** Shared semantic tone for the generic UI primitives. */
export type UiTone = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'error' | 'accent' | 'muted';

/** Shared size scale for the generic UI primitives. */
export type UiSize = 'xs' | 'sm' | 'md' | 'lg';

const TONES = new Set<UiTone>(['default', 'info', 'success', 'warning', 'danger', 'error', 'accent', 'muted']);
const SIZES = new Set<UiSize>(['xs', 'sm', 'md', 'lg']);

/** Normalize a host-supplied tone without allowing unsafe class names. */
export function normalizeTone(value: unknown, fallback: UiTone = 'default'): UiTone {
    const tone = String(value ?? '').trim().toLowerCase() as UiTone;
    return TONES.has(tone) ? tone : fallback;
}

/** Normalize a host-supplied size without allowing unsafe class names. */
export function normalizeSize(value: unknown, fallback: UiSize = 'md'): UiSize {
    const size = String(value ?? '').trim().toLowerCase() as UiSize;
    return SIZES.has(size) ? size : fallback;
}

/** Map a UI size to the icon size scale. */
export function iconSizeFor(size: UiSize): 'xs' | 'sm' | 'md' | 'lg' {
    return size === 'xs' ? 'xs' : size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm';
}

/** Normalize plain attributes (`""`, `"true"`, `true`) to a boolean. */
export function normalizeBoolean(value: unknown, fallback = false): boolean {
    if (value === '' || value === true || value === 'true' || value === 1 || value === '1') {
        return true;
    }
    if (value === false || value === 'false' || value === 0 || value === '0' || value == null) {
        return false;
    }
    return fallback;
}

let uiIdSequence = 0;

/**
 * Allocate a stable element id for `aria-labelledby` / `aria-describedby`
 * wiring. Hosts can still pass an explicit id through the component's
 * `inputId` attribute; this only supplies a unique fallback.
 */
export function nextUiId(prefix = 'ui'): string {
    uiIdSequence += 1;
    return `${prefix}-${uiIdSequence}`;
}
