/** Named sizes understood by the icon directive and the shared icon CSS. */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg';

/** SVG namespace used when creating vector nodes through the renderer. */
export const ICON_SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * One drawable path of an icon. Paths live in a shared `0 0 16 16` viewBox so
 * every icon can be rendered at the exact same size.
 */
export interface IconPath {
    /** SVG path data in a `0 0 16 16` viewBox. */
    d: string;
    /** Fill this path instead of stroking it (solid shapes such as play/stop). */
    filled?: boolean;
}

/**
 * One reusable icon.
 *
 * `paths` is the vector form drawn by the DOM renderers. `glyph` is the
 * icon-font fallback used by renderers without vector support (the console/TUI)
 * and by hosts that only need text.
 */
export interface IconDefinition {
    /** Icon-font character for renderers without SVG support. */
    glyph: string;
    /** Vector paths rendered inside the shared `0 0 16 16` viewBox. */
    paths?: Array<string | IconPath>;
    /** Fill every path instead of stroking it (solid icons such as run/stop). */
    filled?: boolean;
    /** Stroke width inside the 16x16 viewBox. Defaults to 1.6. */
    strokeWidth?: number;
}
