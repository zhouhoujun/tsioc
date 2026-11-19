/** Base layout, global bar and workflow tabs. */
export const WORKFLOW_DESIGNER_BASE_CSS = `
.workflow-designer {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 420px;
    background: #f8fafc;
    color: #0f172a;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --workspace-splitter: #e2e8f0;
    --workspace-splitter-hover: #93c5fd;
    --workspace-pane-bg: transparent;
    --workspace-collapse-bg: #ffffff;
    --workspace-collapse-color: #475569;
    --workspace-collapse-border: #e2e8f0;
    --workspace-collapse-hover-color: #2563eb;
    --workspace-collapse-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
    --workspace-scrollbar-size: 10px;
    --workspace-scrollbar-track: transparent;
    --workspace-scrollbar-thumb: #cbd5e1;
    --workspace-scrollbar-thumb-hover: #94a3b8;
    --wf-theme-shadow: rgba(15, 23, 42, 0.28);
    --wf-theme-overlay: rgba(15, 23, 42, 0.42);
    --wf-theme-focus-ring: rgba(37, 99, 235, 0.15);
    scrollbar-color: var(--workspace-scrollbar-thumb) var(--workspace-scrollbar-track);
    scrollbar-width: thin;
}

/* The designer owns every scroll surface (layout panes, canvas, inspector,
   run log and nested editor scrollers), so theme their scrollbars too. */
.workflow-designer *::-webkit-scrollbar {
    width: var(--workspace-scrollbar-size, 10px);
    height: var(--workspace-scrollbar-size, 10px);
}

.workflow-designer *::-webkit-scrollbar-track {
    background: var(--workspace-scrollbar-track, transparent);
}

.workflow-designer *::-webkit-scrollbar-thumb {
    background: var(--workspace-scrollbar-thumb, #cbd5e1);
    border-radius: 999px;
}

.workflow-designer *::-webkit-scrollbar-thumb:hover {
    background: var(--workspace-scrollbar-thumb-hover, #94a3b8);
}

.workflow-designer *::-webkit-scrollbar-corner {
    background: transparent;
}

.workflow-designer .is-hidden,
.workflow-designer [hidden] {
    display: none !important;
}

/* Global management bar: workflow tabs + host-level management menu */
.workflow-global-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    background: var(--wf-theme-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--wf-theme-border, #e2e8f0);
}

.workflow-global-bar .workflow-tabs {
    flex: 1;
    min-width: 0;
    padding: 0;
    border-bottom: 0;
}

.workflow-breadcrumb {
    min-width: 0;
    max-width: 320px;
    overflow: hidden;
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
}

.workflow-breadcrumb .ui-breadcrumb-item[role="link"] {
    cursor: pointer;
}

.workflow-breadcrumb .ui-breadcrumb-item[aria-current="page"] {
    color: var(--wf-theme-text, #0f172a);
    cursor: default;
}

.workflow-management-menu {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    padding-right: 2px;
}

/* Open workflow tabs. The shared tab-bar component supplies the same skin in
   every host; this block keeps the workflow palette (and works even when a
   prebuilt host has not loaded the component stylesheet yet). */
.workflow-tabs {
    display: block;
    padding: 0 8px;
    background: var(--wf-theme-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--wf-theme-border, #e2e8f0);
    --tab-strip-background: transparent;
    --tab-surface: var(--wf-theme-surface, #ffffff);
    --tab-border: var(--wf-theme-border, #e2e8f0);
    --tab-text: var(--wf-theme-text, #0f172a);
    --tab-muted: var(--wf-theme-muted, #64748b);
    --tab-hover: var(--wf-theme-hover, #f1f5f9);
    --tab-accent: var(--wf-theme-primary, #2563eb);
    --tab-danger: var(--wf-theme-danger, #dc2626);
}

.workflow-tabs .tab-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 32px;
    margin: 0;
    padding: 6px 0 0;
    overflow-x: auto;
    border-bottom: 0;
}

.workflow-tabs .tab {
    display: inline-flex;
    align-items: center;
    max-width: 220px;
    padding: 6px 10px;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
    color: var(--wf-theme-muted, #64748b);
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
    white-space: nowrap;
    transition:
        background-color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        border-color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        transform var(--ui-motion-fast, 120ms) var(--ui-ease, ease);
}

.workflow-tabs .tab:hover {
    background: var(--tab-hover, var(--wf-theme-hover, #f1f5f9));
    color: var(--wf-theme-text, #0f172a);
    transform: translateY(-1px);
}

.workflow-tabs .tab[aria-selected="true"] {
    background: var(--wf-theme-surface, #ffffff);
    border-color: var(--wf-theme-border, #e2e8f0);
    color: var(--wf-theme-text, #0f172a);
    font-weight: 600;
    transform: none;
}

.workflow-tabs .tab[aria-selected="true"]:hover {
    background: var(--wf-theme-surface, #ffffff);
    transform: none;
}

.workflow-tabs .tab-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-tabs .tab-close {
    margin-left: 8px;
    padding: 1px 2px;
    border-radius: 4px;
    color: var(--wf-theme-muted, #64748b);
    cursor: pointer;
    transition:
        background-color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        color var(--ui-motion-fast, 120ms) var(--ui-ease, ease);
}

.workflow-tabs .tab-close:hover {
    background: var(--tab-hover, var(--wf-theme-hover, #f1f5f9));
    color: var(--wf-theme-danger, #dc2626);
}

.workflow-tabs .tab[aria-selected="true"] .tab-close:hover {
    color: var(--wf-theme-danger, #dc2626);
}

.workflow-tabs .tab-new {
    padding: 6px 8px;
    border-radius: 7px;
    color: var(--wf-theme-primary, #2563eb);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition:
        background-color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        transform var(--ui-motion-fast, 120ms) var(--ui-ease, ease);
}

.workflow-tabs .tab-new:hover {
    background: var(--tab-hover, var(--wf-theme-hover, #f1f5f9));
    transform: scale(1.08);
}

.workflow-tabs .tab-new:active {
    transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
    .workflow-tabs .tab,
    .workflow-tabs .tab-close,
    .workflow-tabs .tab-new {
        transition: none;
    }
    .workflow-tabs .tab:hover,
    .workflow-tabs .tab-new:hover,
    .workflow-tabs .tab-new:active {
        transform: none;
    }
}

.workflow-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
}

.workflow-toolbar-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    margin-right: 4px;
}

.workflow-toolbar-meta,
.workflow-toolbar-zoom {
    font-size: 11px;
    color: #64748b;
}

.workflow-toolbar-zoom {
    min-width: 42px;
    text-align: center;
}

.workflow-toolbar-status {
    font-size: 11px;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 999px;
    padding: 2px 8px;
}

.workflow-save-state {
    font-size: 10px;
    line-height: 1.4;
    color: #64748b;
    background: #f1f5f9;
    border-radius: 999px;
    padding: 2px 7px;
}

.workflow-save-state.is-dirty {
    color: #b45309;
    background: #fffbeb;
}

.workflow-save-state.is-saving {
    color: #2563eb;
    background: #eff6ff;
}

.workflow-save-state.is-saved {
    color: #15803d;
    background: #f0fdf4;
}

.workflow-save-state.is-error {
    color: #dc2626;
    background: #fef2f2;
}

.workflow-node-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 69;
}

.workflow-node-menu {
    position: fixed;
    z-index: 70;
    min-width: 160px;
    padding: 4px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.workflow-node-menu-item {
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #334155;
    font-size: 12px;
    text-align: left;
    padding: 6px 10px;
    cursor: pointer;
}

.workflow-node-menu-item:hover {
    background: #eff6ff;
    color: #2563eb;
}

.workflow-node-menu-item.is-danger {
    color: #b91c1c;
}

.workflow-node-menu-item.is-danger:hover {
    background: #fef2f2;
    color: #dc2626;
}

.workflow-designer[data-theme="dark"] .workflow-node-menu,
.workflow-designer[data-theme="solarized"] .workflow-node-menu,
.workflow-designer[data-theme="high-contrast"] .workflow-node-menu {
    background: var(--wf-theme-surface, #0b1220);
    border-color: var(--wf-theme-border, #1e293b);
}

.workflow-designer[data-theme="dark"] .workflow-node-menu-item,
.workflow-designer[data-theme="solarized"] .workflow-node-menu-item,
.workflow-designer[data-theme="high-contrast"] .workflow-node-menu-item {
    color: var(--wf-theme-text, #e2e8f0);
}

.workflow-designer[data-theme="dark"] .workflow-node-menu-item.is-danger,
.workflow-designer[data-theme="solarized"] .workflow-node-menu-item.is-danger,
.workflow-designer[data-theme="high-contrast"] .workflow-node-menu-item.is-danger {
    color: #fca5a5;
}

.workflow-shortcuts {
    position: absolute;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wf-theme-overlay, rgba(15, 23, 42, 0.42));
    color: var(--wf-theme-text, #0f172a);
    padding: 24px;
}

.workflow-shortcuts-panel {
    width: min(460px, 100%);
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

.workflow-shortcuts-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.workflow-shortcuts-title {
    font-size: 13px;
    font-weight: 700;
}

.workflow-shortcuts-head .workflow-btn {
    margin-left: auto;
}

.workflow-shortcuts-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 0;
    border-top: 1px solid #f1f5f9;
    font-size: 12px;
    color: #334155;
}

.workflow-shortcuts-row kbd {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #334155;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-bottom-width: 2px;
    border-radius: 5px;
    padding: 2px 6px;
    white-space: nowrap;
}

`;
