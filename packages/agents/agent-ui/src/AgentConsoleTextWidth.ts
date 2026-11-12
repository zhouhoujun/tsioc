/**
 * Display-width helpers live in the renderer-neutral common layer so the TUI,
 * web console and dialog chrome all measure columns the same way. Text
 * templating/ellipsis helpers are console-local and live beside this facade.
 */
export { fillTemplate, truncateByDisplayWidth } from './AgentConsoleText';
export {
    fitByDisplayWidth,
    getDisplayWidth,
    isWideCodePoint,
    padByDisplayWidth,
    sliceByDisplayWidth
} from '@tsdi/components/common';
