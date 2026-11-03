/**
 * Display-width helpers are renderer-neutral; keep a single implementation in
 * `@tsdi/components/common` for agent-ui, console and web chrome.
 */
export {
    fitByDisplayWidth,
    getDisplayWidth,
    isWideCodePoint,
    padByDisplayWidth,
    sliceByDisplayWidth
} from '@tsdi/components/common';
