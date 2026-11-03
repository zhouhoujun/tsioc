/**
 * Display-width helpers live in the renderer-neutral common layer so the TUI,
 * web console and dialog chrome all measure columns the same way.
 */
export {
    fitByDisplayWidth,
    getDisplayWidth,
    isWideCodePoint,
    padByDisplayWidth,
    sliceByDisplayWidth
} from '@tsdi/components/common';
