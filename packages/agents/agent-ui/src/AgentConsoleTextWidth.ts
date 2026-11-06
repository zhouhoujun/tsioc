/**
 * Display-width helpers live in the renderer-neutral common layer so the TUI,
 * web console and dialog chrome all measure columns the same way.
 */
export {
    fillTemplate,
    fitByDisplayWidth,
    getDisplayWidth,
    isWideCodePoint,
    padByDisplayWidth,
    sliceByDisplayWidth,
    truncateByDisplayWidth
} from '@tsdi/components/common';
