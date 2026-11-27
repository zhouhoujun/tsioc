/** Palette, canvas grid, nodes and edges. */
export const WORKFLOW_DESIGNER_CANVAS_CSS = `/* Palette */
.workflow-palette {
    width: 100%;
    flex: 1 1 auto;
    border-right: 1px solid #e2e8f0;
    background: #f8fafc;
    overflow: visible;
    padding: 10px;
    box-sizing: border-box;
}

.workflow-palette-search {
    position: sticky;
    top: -10px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0 8px;
    background: #f8fafc;
}

.workflow-palette-search-input {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    padding: 7px 9px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #0f172a;
    font-size: 12px;
    outline: none;
}

.workflow-palette-search-input:focus {
    border-color: #93c5fd;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.workflow-palette-quick-add {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    border: 1px solid var(--wf-theme-border, #cbd5e1);
    border-radius: 8px;
    background: var(--wf-theme-surface-alt, #ffffff);
    color: var(--wf-theme-muted, #475569);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
}

.workflow-palette-quick-add:hover,
.workflow-palette-quick-add:focus-visible {
    border-color: var(--wf-theme-primary, #2563eb);
    color: var(--wf-theme-primary, #2563eb);
    outline: none;
}

.workflow-palette-empty {
    padding: 8px 2px;
    font-size: 11px;
    color: #64748b;
}

.workflow-palette-group {
    display: flex;
    flex-direction: column;
    /* The shared accordion owns the header/body markup; the palette only maps
       its skin variables to the designer theme tokens. */
    --ui-accordion-margin: 10px 0 6px;
    --ui-accordion-title-color: var(--wf-theme-muted, #64748b);
    --ui-accordion-caret-color: var(--wf-theme-text, #0f172a);
    --ui-accordion-hover-background: var(--wf-theme-hover, #e2e8f0);
    --ui-accordion-hover-border: var(--wf-theme-border, #e2e8f0);
    --ui-accordion-hover-color: var(--wf-theme-text, #0f172a);
    --ui-accordion-focus-ring: var(--wf-theme-focus-ring, rgba(37, 99, 235, 0.2));
    --ui-accordion-count-background: var(--wf-theme-surface-alt, #e2e8f0);
    --ui-accordion-count-color: var(--wf-theme-muted, #64748b);
    --ui-accordion-item-gap: 8px;
    --ui-accordion-item-icon-size: 24px;
    --ui-accordion-item-icon-radius: 6px;
    --ui-accordion-item-icon-background: var(--wf-accent, #64748b);
    --ui-accordion-item-icon-color: #ffffff;
}

.workflow-palette-group.is-protocol {
    --ui-accordion-title-color: var(--wf-theme-primary, #2563eb);
    --ui-accordion-hover-color: var(--wf-theme-text, #0f172a);
}

.workflow-palette-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    margin-bottom: 6px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    cursor: grab;
    user-select: none;
}

.workflow-palette-item:hover {
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
}

.workflow-palette-item:active {
    cursor: grabbing;
}

.workflow-palette-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 13px;
    flex: 0 0 24px;
    background: var(--wf-accent, #64748b);
}

.workflow-palette-item .ui-accordion-item-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-palette-item .ui-accordion-item-description {
    font-size: 10px;
    color: var(--wf-theme-muted, #64748b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Canvas */
.workflow-canvas {
    position: relative;
    overflow: auto;
    flex: 1;
    min-height: 0;
    min-width: 0;
    outline: none;
    background-color: #f8fafc;
    cursor: grab;
}

/*
 * The grid is its own paint layer. Repainting the canvas root background would
 * repaint every node on each pan frame, and CSS custom properties for the grid
 * on an ancestor of the nodes would recalc style for the whole graph.
 */
.workflow-canvas-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: radial-gradient(circle, var(--wf-theme-grid, #cbd5e1) 1px, transparent 1px);
    background-size: 24px 24px;
    background-position: 0 0;
}

.workflow-canvas:focus-visible {
    box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.35);
}

.workflow-canvas-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: #94a3b8;
    font-size: 13px;
    text-align: center;
    pointer-events: none;
    z-index: 1;
}

.workflow-canvas-content {
    position: relative;
    transform-origin: 0 0;
}

.workflow-group {
    position: absolute;
    z-index: 0;
    box-sizing: border-box;
    border: 1px dashed var(--wf-group-color, #60a5fa);
    border-radius: 12px;
    background: rgba(96, 165, 250, 0.06);
    pointer-events: none;
}

.workflow-group-title {
    position: absolute;
    top: 7px;
    left: 28px;
    max-width: calc(100% - 64px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 700;
    color: var(--wf-group-color, #60a5fa);
    cursor: grab;
    pointer-events: auto;
    user-select: none;
}

.workflow-group-toggle {
    position: absolute;
    top: 4px;
    left: 6px;
    border: 0;
    background: transparent;
    color: var(--wf-group-color, #60a5fa);
    font-size: 11px;
    line-height: 1;
    padding: 2px 4px;
    cursor: pointer;
    pointer-events: auto;
}

.workflow-group-remove {
    position: absolute;
    top: 4px;
    right: 6px;
    border: 0;
    background: transparent;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1;
    padding: 2px 4px;
    cursor: pointer;
    pointer-events: auto;
}

.workflow-group-remove:hover {
    color: #b91c1c;
}

.workflow-align-bar {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 7;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.14);
}

.workflow-align-button {
    width: 26px;
    height: 24px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: #475569;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
}

.workflow-align-button:hover {
    background: #eff6ff;
    color: #2563eb;
}

.workflow-designer[data-theme="dark"] .workflow-align-bar,
.workflow-designer[data-theme="solarized"] .workflow-align-bar,
.workflow-designer[data-theme="high-contrast"] .workflow-align-bar {
    background: var(--wf-theme-surface, #0b1220);
    border-color: var(--wf-theme-border, #1e293b);
}

.workflow-designer[data-theme="dark"] .workflow-align-button,
.workflow-designer[data-theme="solarized"] .workflow-align-button,
.workflow-designer[data-theme="high-contrast"] .workflow-align-button {
    color: var(--wf-theme-text, #e2e8f0);
}

.workflow-selection-box {
    position: fixed;
    z-index: 8;
    border: 1px dashed var(--wf-theme-primary, #2563eb);
    border-radius: 2px;
    background: rgba(37, 99, 235, 0.08);
    pointer-events: none;
}

.workflow-canvas-edges {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
}

.workflow-canvas-nodes {
    position: absolute;
    left: 0;
    top: 0;
}

/* Nodes */
.workflow-node {
    position: absolute;
    background: #ffffff;
    border: 2px solid var(--wf-status, var(--wf-theme-border, #cbd5e1));
    border-radius: 10px;
    box-sizing: border-box;
    cursor: grab;
    user-select: none;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.10);
    transition: box-shadow 120ms ease, border-color 120ms ease, opacity 120ms ease;
}

.workflow-node:active {
    cursor: grabbing;
}

.workflow-node.is-selected {
    border-width: 3px;
    border-color: var(--wf-theme-primary, #2563eb);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
}

.workflow-node.is-disabled {
    opacity: 0.55;
    border-style: dashed;
}

.workflow-node.is-disabled .workflow-node-title {
    text-decoration: line-through;
}

.workflow-node[data-status="pending"] { --wf-status: #94a3b8; }
.workflow-node[data-status="running"] {
    --wf-status: #2563eb;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.16);
}
.workflow-node[data-status="success"] { --wf-status: #16a34a; }
.workflow-node[data-status="failed"] {
    --wf-status: #dc2626;
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.14);
}
.workflow-node[data-status="skipped"],
.workflow-node[data-status="cancelled"] {
    --wf-status: #94a3b8;
    opacity: 0.55;
}

.workflow-node[data-node-type="start"],
.workflow-palette-icon[data-node-type="start"] { --wf-accent: #22c55e; }
.workflow-node[data-node-type="end"],
.workflow-palette-icon[data-node-type="end"] { --wf-accent: #ef4444; }
.workflow-node[data-node-type="task"],
.workflow-palette-icon[data-node-type="task"] { --wf-accent: #3b82f6; }
.workflow-node[data-node-type="inject"],
.workflow-palette-icon[data-node-type="inject"] { --wf-accent: #0ea5e9; }
.workflow-node[data-node-type="function"],
.workflow-palette-icon[data-node-type="function"] { --wf-accent: #10b981; }
.workflow-node[data-node-type="template"],
.workflow-palette-icon[data-node-type="template"] { --wf-accent: #0891b2; }
.workflow-node[data-node-type="json"],
.workflow-palette-icon[data-node-type="json"] { --wf-accent: #eab308; }
.workflow-node[data-node-type="csv"],
.workflow-palette-icon[data-node-type="csv"] { --wf-accent: #0e7490; }
.workflow-node[data-node-type="change"],
.workflow-palette-icon[data-node-type="change"] { --wf-accent: #f43f5e; }
.workflow-node[data-node-type="statistics"],
.workflow-palette-icon[data-node-type="statistics"] { --wf-accent: #6d28d9; }
.workflow-node[data-node-type="merge"],
.workflow-palette-icon[data-node-type="merge"] { --wf-accent: #059669; }
.workflow-node[data-node-type="event-emit"],
.workflow-palette-icon[data-node-type="event-emit"] { --wf-accent: #db2777; }
.workflow-node[data-node-type="event-wait"],
.workflow-palette-icon[data-node-type="event-wait"] { --wf-accent: #9333ea; }
.workflow-node[data-node-type="command"],
.workflow-palette-icon[data-node-type="command"] { --wf-accent: #334155; }
.workflow-node[data-node-type="split"],
.workflow-palette-icon[data-node-type="split"] { --wf-accent: #65a30d; }
.workflow-node[data-node-type="map"],
.workflow-palette-icon[data-node-type="map"] { --wf-accent: #22c55e; }
.workflow-node[data-node-type="filter"],
.workflow-palette-icon[data-node-type="filter"] { --wf-accent: #84cc16; }
.workflow-node[data-node-type="sort"],
.workflow-palette-icon[data-node-type="sort"] { --wf-accent: #0d9488; }
.workflow-node[data-node-type="range"],
.workflow-palette-icon[data-node-type="range"] { --wf-accent: #7c3aed; }
.workflow-node[data-node-type="batch"],
.workflow-palette-icon[data-node-type="batch"] { --wf-accent: #4f46e5; }
.workflow-node[data-node-type="trigger"],
.workflow-palette-icon[data-node-type="trigger"] { --wf-accent: #ea580c; }
.workflow-node[data-node-type="comment"],
.workflow-palette-icon[data-node-type="comment"] { --wf-accent: #94a3b8; }
.workflow-node[data-node-type="condition"],
.workflow-palette-icon[data-node-type="condition"] { --wf-accent: #f59e0b; }
.workflow-node[data-node-type="switch"],
.workflow-palette-icon[data-node-type="switch"] { --wf-accent: #f97316; }
.workflow-node[data-node-type="parallel"],
.workflow-palette-icon[data-node-type="parallel"] { --wf-accent: #a855f7; }
.workflow-node[data-node-type="join"],
.workflow-palette-icon[data-node-type="join"] { --wf-accent: #0ea5e9; }
.workflow-node[data-node-type="loop"],
.workflow-palette-icon[data-node-type="loop"] { --wf-accent: #b45309; }
.workflow-node[data-node-type="delay"],
.workflow-palette-icon[data-node-type="delay"] { --wf-accent: #64748b; }
.workflow-node[data-node-type="log"],
.workflow-palette-icon[data-node-type="log"] { --wf-accent: #06b6d4; }
.workflow-node[data-node-type="http-request"],
.workflow-palette-icon[data-node-type="http-request"] { --wf-accent: #6366f1; }
.workflow-node[data-node-type="assign"],
.workflow-palette-icon[data-node-type="assign"] { --wf-accent: #8b5cf6; }
.workflow-node[data-node-type="transform"],
.workflow-palette-icon[data-node-type="transform"] { --wf-accent: #14b8a6; }
.workflow-node[data-node-type="trycatch"],
.workflow-palette-icon[data-node-type="trycatch"] { --wf-accent: #ec4899; }
.workflow-node[data-node-type="subprocess"],
.workflow-palette-icon[data-node-type="subprocess"] { --wf-accent: #0f766e; }
.workflow-node[data-node-type="custom"],
.workflow-palette-icon[data-node-type="custom"] { --wf-accent: #6b7280; }

.workflow-node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 8px 8px 0 0;
    background: var(--wf-accent, #64748b);
    color: var(--wf-node-text, #ffffff);
    font-size: 12px;
    font-weight: 600;
    box-sizing: border-box;
}

.workflow-node-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 14px;
    height: 14px;
    font-size: 13px;
    line-height: 1;
}

.workflow-node-title {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-node-status {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    white-space: nowrap;
}

.workflow-node-status-shape {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 4px;
    border-radius: 50%;
    vertical-align: middle;
}

.workflow-node-body {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.workflow-node-type {
    font-size: 10px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.workflow-node-desc {
    font-size: 10px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-node-port {
    position: absolute;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    cursor: crosshair;
    user-select: none;
    touch-action: none;
    z-index: 3;
}

/* Keep a 12px visual dot while the 24px element provides a forgiving hit area. */
.workflow-node-port::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 12px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--wf-theme-surface, #ffffff);
    border: 2px solid var(--wf-theme-muted, #64748b);
    box-sizing: border-box;
    transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
}

.workflow-node-port-output::after {
    border-color: var(--wf-theme-primary, #2563eb);
}

.workflow-node-port:hover::after {
    background: #dbeafe;
    transform: translate(-50%, -50%) scale(1.18);
}

/* While a wire is active, make valid target ports obvious. */
.workflow-canvas[data-connecting="true"],
.workflow-canvas[data-connecting="true"] .workflow-node {
    cursor: crosshair;
}

.workflow-canvas[data-connecting="true"][data-connecting-side="output"] .workflow-node-port-input::after,
.workflow-canvas[data-connecting="true"][data-connecting-side="input"] .workflow-node-port-output::after {
    background: #dcfce7;
    border-color: #16a34a;
    transform: translate(-50%, -50%) scale(1.25);
}

.workflow-canvas[data-connecting="true"] .workflow-node:hover {
    border-color: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16), 0 8px 24px rgba(15, 23, 42, 0.16);
}

/* Edges */
.workflow-edge {
    fill: none;
    stroke: #94a3b8;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 6 6;
    pointer-events: none;
}

.workflow-edge-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
    cursor: pointer;
}

.workflow-edge[data-status="active"] {
    stroke: #2563eb;
    stroke-width: 2.5;
    stroke-dasharray: none;
}

.workflow-edge[data-status="traversed"] {
    stroke: #16a34a;
    stroke-width: 2.5;
    stroke-dasharray: none;
}

.workflow-edge[data-status="skipped"] {
    stroke: #94a3b8;
}

.workflow-edge.is-selected {
    stroke: #2563eb;
    stroke-width: 3;
}

.workflow-edge-draft {
    fill: none;
    stroke: #8b5cf6;
    stroke-width: 2;
    stroke-dasharray: 5 5;
    pointer-events: none;
}

.workflow-edge-label {
    fill: #475569;
    font-size: 11px;
    text-anchor: middle;
    pointer-events: none;
}

.workflow-arrow-idle { fill: #94a3b8; }
.workflow-arrow-active { fill: #2563eb; }
.workflow-arrow-traversed { fill: #16a34a; }
.workflow-arrow-skipped { fill: #94a3b8; }

`;
