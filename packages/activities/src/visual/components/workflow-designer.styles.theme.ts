/** Dark, solarized and high-contrast skins. */
export const WORKFLOW_DESIGNER_THEME_CSS = `/* Themes */
.workflow-designer[data-theme="dark"] {
    --wf-theme-bg: #0b1220;
    --wf-theme-surface: #111827;
    --wf-theme-surface-alt: #0f172a;
    --wf-theme-border: #1e293b;
    --wf-theme-text: #e2e8f0;
    --wf-theme-muted: #94a3b8;
    --wf-theme-input: #0b1220;
    --wf-theme-canvas: #0b1220;
    --wf-theme-grid: rgba(148, 163, 184, 0.18);
    --wf-theme-splitter: #334155;
    --wf-theme-splitter-hover: #60a5fa;
    --wf-theme-primary: #3b82f6;
    --wf-theme-primary-text: #ffffff;
    --wf-theme-danger: #f87171;
    --menu-bar-surface: var(--wf-theme-surface);
    --menu-bar-border: var(--wf-theme-border);
    --menu-bar-text: var(--wf-theme-text);
    --menu-bar-muted: var(--wf-theme-muted);
    --menu-bar-hover: #1e293b;
    --menu-bar-separator: var(--wf-theme-border);
    --menu-bar-accent: #60a5fa;
    --menu-bar-danger: var(--wf-theme-danger);
    --menu-bar-shadow: rgba(0, 0, 0, 0.5);
    --workspace-scrollbar-thumb: #334155;
    --workspace-scrollbar-thumb-hover: #60a5fa;
    --wf-theme-overlay: rgba(0, 0, 0, 0.62);
    --wf-theme-shadow: rgba(0, 0, 0, 0.55);
    --wf-theme-focus-ring: rgba(59, 130, 246, 0.25);
}

.workflow-designer[data-theme="solarized"] {
    --wf-theme-bg: #002b36;
    --wf-theme-surface: #073642;
    --wf-theme-surface-alt: #002b36;
    --wf-theme-border: #586e75;
    --wf-theme-text: #93a1a1;
    --wf-theme-muted: #839496;
    --wf-theme-input: #002b36;
    --wf-theme-canvas: #002b36;
    --wf-theme-grid: rgba(147, 161, 161, 0.18);
    --wf-theme-splitter: #586e75;
    --wf-theme-splitter-hover: #268bd2;
    --wf-theme-primary: #268bd2;
    --wf-theme-primary-text: #ffffff;
    --wf-theme-danger: #dc322f;
    --menu-bar-surface: var(--wf-theme-surface);
    --menu-bar-border: var(--wf-theme-border);
    --menu-bar-text: var(--wf-theme-text);
    --menu-bar-muted: var(--wf-theme-muted);
    --menu-bar-hover: #0b4f5c;
    --menu-bar-separator: var(--wf-theme-border);
    --menu-bar-accent: #268bd2;
    --menu-bar-danger: var(--wf-theme-danger);
    --menu-bar-shadow: rgba(0, 0, 0, 0.5);
    --workspace-scrollbar-thumb: #586e75;
    --workspace-scrollbar-thumb-hover: #268bd2;
    --wf-theme-overlay: rgba(0, 0, 0, 0.62);
    --wf-theme-shadow: rgba(0, 0, 0, 0.55);
    --wf-theme-focus-ring: rgba(38, 139, 210, 0.28);
}

.workflow-designer[data-theme="high-contrast"] {
    --wf-theme-bg: #000000;
    --wf-theme-surface: #000000;
    --wf-theme-surface-alt: #000000;
    --wf-theme-border: #ffffff;
    --wf-theme-text: #ffffff;
    --wf-theme-muted: #ffffff;
    --wf-theme-input: #000000;
    --wf-theme-canvas: #000000;
    --wf-theme-grid: rgba(255, 255, 255, 0.28);
    --wf-theme-splitter: #ffffff;
    --wf-theme-splitter-hover: #ffff00;
    --wf-theme-primary: #ffff00;
    --wf-theme-primary-text: #000000;
    --wf-theme-danger: #ff5555;
    --menu-bar-surface: #000000;
    --menu-bar-border: #ffffff;
    --menu-bar-text: #ffffff;
    --menu-bar-muted: #ffffff;
    --menu-bar-hover: #333333;
    --menu-bar-separator: #ffffff;
    --menu-bar-accent: #ffff00;
    --menu-bar-danger: #ff5555;
    --menu-bar-shadow: rgba(255, 255, 255, 0.25);
    --workspace-scrollbar-thumb: #ffffff;
    --workspace-scrollbar-thumb-hover: #ffff00;
    --wf-theme-overlay: rgba(0, 0, 0, 0.82);
    --wf-theme-shadow: rgba(255, 255, 255, 0.3);
    --wf-theme-focus-ring: rgba(255, 255, 0, 0.35);
}

.workflow-designer[data-theme="dark"] {
    --wf-code-bg: #0b1220;
    --wf-code-gutter: #0f172a;
    --wf-code-text: #e2e8f0;
    --wf-code-muted: #94a3b8;
    --wf-code-border: #1e293b;
    --wf-code-active-line: rgba(59, 130, 246, 0.12);
    --wf-code-active-gutter: rgba(59, 130, 246, 0.18);
    --wf-code-selection: rgba(59, 130, 246, 0.35);
    --wf-code-caret: #e2e8f0;
    --wf-code-tooltip-bg: #111827;
    --wf-code-accent: #3b82f6;
    --wf-code-keyword: #c084fc;
    --wf-code-property: #93c5fd;
    --wf-code-function: #67e8f9;
    --wf-code-type: #5eead4;
    --wf-code-string: #fca5a5;
    --wf-code-number: #5eead4;
    --wf-code-comment: #64748b;
    --wf-code-operator: #cbd5e1;
    --wf-code-meta: #94a3b8;
    --wf-code-danger: #f87171;
    --wf-code-warning: #fbbf24;
}

.workflow-designer[data-theme="solarized"] {
    --wf-code-bg: #002b36;
    --wf-code-gutter: #073642;
    --wf-code-text: #93a1a1;
    --wf-code-muted: #839496;
    --wf-code-border: #586e75;
    --wf-code-active-line: rgba(38, 139, 210, 0.16);
    --wf-code-active-gutter: rgba(38, 139, 210, 0.24);
    --wf-code-selection: rgba(38, 139, 210, 0.4);
    --wf-code-caret: #93a1a1;
    --wf-code-tooltip-bg: #073642;
    --wf-code-accent: #268bd2;
    --wf-code-keyword: #859900;
    --wf-code-property: #268bd2;
    --wf-code-function: #2aa198;
    --wf-code-type: #b58900;
    --wf-code-string: #2aa198;
    --wf-code-number: #d33682;
    --wf-code-comment: #586e75;
    --wf-code-operator: #93a1a1;
    --wf-code-meta: #839496;
    --wf-code-danger: #dc322f;
    --wf-code-warning: #b58900;
}

.workflow-designer[data-theme="high-contrast"] {
    --wf-code-bg: #000000;
    --wf-code-gutter: #000000;
    --wf-code-text: #ffffff;
    --wf-code-muted: #ffffff;
    --wf-code-border: #ffffff;
    --wf-code-active-line: rgba(255, 255, 0, 0.12);
    --wf-code-active-gutter: rgba(255, 255, 0, 0.2);
    --wf-code-selection: rgba(255, 255, 0, 0.35);
    --wf-code-caret: #ffff00;
    --wf-code-tooltip-bg: #000000;
    --wf-code-accent: #ffff00;
    --wf-code-keyword: #ffff00;
    --wf-code-property: #00ffff;
    --wf-code-function: #00ffff;
    --wf-code-type: #00ff00;
    --wf-code-string: #00ff00;
    --wf-code-number: #ff00ff;
    --wf-code-comment: #cccccc;
    --wf-code-operator: #ffffff;
    --wf-code-meta: #cccccc;
    --wf-code-danger: #ff5555;
    --wf-code-warning: #ffff00;
}

.workflow-designer[data-theme="dark"],
.workflow-designer[data-theme="solarized"],
.workflow-designer[data-theme="high-contrast"] {
    background: var(--wf-theme-bg);
    color: var(--wf-theme-text);
    --workspace-splitter: var(--wf-theme-splitter);
    --workspace-splitter-hover: var(--wf-theme-splitter-hover);
    --workspace-pane-bg: var(--wf-theme-surface);
    --workspace-collapse-bg: var(--wf-theme-surface);
    --workspace-collapse-color: var(--wf-theme-text);
    --workspace-collapse-border: var(--wf-theme-border);
    --workspace-collapse-hover-color: var(--wf-theme-primary);
    --workspace-collapse-shadow: var(--menu-bar-shadow);
}

.workflow-designer[data-theme="dark"] .workflow-toolbar,
.workflow-designer[data-theme="solarized"] .workflow-toolbar,
.workflow-designer[data-theme="high-contrast"] .workflow-toolbar,
.workflow-designer[data-theme="dark"] .workflow-statusbar,
.workflow-designer[data-theme="solarized"] .workflow-statusbar,
.workflow-designer[data-theme="high-contrast"] .workflow-statusbar,
.workflow-designer[data-theme="dark"] .workflow-run-history,
.workflow-designer[data-theme="solarized"] .workflow-run-history,
.workflow-designer[data-theme="high-contrast"] .workflow-run-history,
.workflow-designer[data-theme="dark"] .workflow-run-log,
.workflow-designer[data-theme="solarized"] .workflow-run-log,
.workflow-designer[data-theme="high-contrast"] .workflow-run-log,
.workflow-designer[data-theme="dark"] .workflow-inspector,
.workflow-designer[data-theme="solarized"] .workflow-inspector,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector,
.workflow-designer[data-theme="dark"] .workflow-library-panel,
.workflow-designer[data-theme="solarized"] .workflow-library-panel,
.workflow-designer[data-theme="high-contrast"] .workflow-library-panel,
.workflow-designer[data-theme="dark"] .workflow-version-panel,
.workflow-designer[data-theme="solarized"] .workflow-version-panel,
.workflow-designer[data-theme="high-contrast"] .workflow-version-panel,
.workflow-designer[data-theme="dark"] .workflow-json-panel,
.workflow-designer[data-theme="solarized"] .workflow-json-panel,
.workflow-designer[data-theme="high-contrast"] .workflow-json-panel {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-palette,
.workflow-designer[data-theme="solarized"] .workflow-palette,
.workflow-designer[data-theme="high-contrast"] .workflow-palette {
    background: var(--wf-theme-surface-alt);
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-palette-search,
.workflow-designer[data-theme="solarized"] .workflow-palette-search,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-search {
    background: var(--wf-theme-surface-alt);
}

.workflow-designer[data-theme="dark"] .workflow-palette-search-input,
.workflow-designer[data-theme="solarized"] .workflow-palette-search-input,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-search-input {
    background: var(--wf-theme-input);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-palette-empty,
.workflow-designer[data-theme="solarized"] .workflow-palette-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-empty {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-canvas-empty,
.workflow-designer[data-theme="solarized"] .workflow-canvas-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-canvas-empty {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-palette-item,
.workflow-designer[data-theme="solarized"] .workflow-palette-item,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-item,
.workflow-designer[data-theme="dark"] .workflow-run-chip,
.workflow-designer[data-theme="solarized"] .workflow-run-chip,
.workflow-designer[data-theme="high-contrast"] .workflow-run-chip,
.workflow-designer[data-theme="dark"] .workflow-run-clear,
.workflow-designer[data-theme="solarized"] .workflow-run-clear,
.workflow-designer[data-theme="high-contrast"] .workflow-run-clear {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-run-history-count,
.workflow-designer[data-theme="solarized"] .workflow-run-history-count,
.workflow-designer[data-theme="high-contrast"] .workflow-run-history-count {
    background: var(--wf-theme-surface-alt);
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-toolbar-title,
.workflow-designer[data-theme="solarized"] .workflow-toolbar-title,
.workflow-designer[data-theme="high-contrast"] .workflow-toolbar-title,
.workflow-designer[data-theme="dark"] .workflow-palette-label,
.workflow-designer[data-theme="solarized"] .workflow-palette-label,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-label,
.workflow-designer[data-theme="dark"] .workflow-inspector-type,
.workflow-designer[data-theme="solarized"] .workflow-inspector-type,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-type,
.workflow-designer[data-theme="dark"] .workflow-json-title,
.workflow-designer[data-theme="solarized"] .workflow-json-title,
.workflow-designer[data-theme="high-contrast"] .workflow-json-title,
.workflow-designer[data-theme="dark"] .workflow-library-title,
.workflow-designer[data-theme="solarized"] .workflow-library-title,
.workflow-designer[data-theme="high-contrast"] .workflow-library-title,
.workflow-designer[data-theme="dark"] .workflow-library-row-name,
.workflow-designer[data-theme="solarized"] .workflow-library-row-name,
.workflow-designer[data-theme="high-contrast"] .workflow-library-row-name,
.workflow-designer[data-theme="dark"] .workflow-version-title,
.workflow-designer[data-theme="solarized"] .workflow-version-title,
.workflow-designer[data-theme="high-contrast"] .workflow-version-title,
.workflow-designer[data-theme="dark"] .workflow-version-name,
.workflow-designer[data-theme="solarized"] .workflow-version-name,
.workflow-designer[data-theme="high-contrast"] .workflow-version-name,
.workflow-designer[data-theme="dark"] .workflow-node-title,
.workflow-designer[data-theme="solarized"] .workflow-node-title,
.workflow-designer[data-theme="high-contrast"] .workflow-node-title {
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-toolbar-meta,
.workflow-designer[data-theme="solarized"] .workflow-toolbar-meta,
.workflow-designer[data-theme="high-contrast"] .workflow-toolbar-meta,
.workflow-designer[data-theme="dark"] .workflow-palette-desc,
.workflow-designer[data-theme="solarized"] .workflow-palette-desc,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-desc,
.workflow-designer[data-theme="dark"] .workflow-inspector-id,
.workflow-designer[data-theme="solarized"] .workflow-inspector-id,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-id,
.workflow-designer[data-theme="dark"] .workflow-field-label,
.workflow-designer[data-theme="solarized"] .workflow-field-label,
.workflow-designer[data-theme="high-contrast"] .workflow-field-label,
.workflow-designer[data-theme="dark"] .workflow-field-group-title,
.workflow-designer[data-theme="solarized"] .workflow-field-group-title,
.workflow-designer[data-theme="high-contrast"] .workflow-field-group-title,
.workflow-designer[data-theme="dark"] .workflow-field-reset,
.workflow-designer[data-theme="solarized"] .workflow-field-reset,
.workflow-designer[data-theme="high-contrast"] .workflow-field-reset,
.workflow-designer[data-theme="dark"] .workflow-inspector-no-fields,
.workflow-designer[data-theme="solarized"] .workflow-inspector-no-fields,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-no-fields,
.workflow-designer[data-theme="dark"] .workflow-no-fields,
.workflow-designer[data-theme="solarized"] .workflow-no-fields,
.workflow-designer[data-theme="high-contrast"] .workflow-no-fields,
.workflow-designer[data-theme="dark"] .workflow-checkbox-row,
.workflow-designer[data-theme="solarized"] .workflow-checkbox-row,
.workflow-designer[data-theme="high-contrast"] .workflow-checkbox-row,
.workflow-designer[data-theme="dark"] .workflow-inspector-empty,
.workflow-designer[data-theme="solarized"] .workflow-inspector-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-empty,
.workflow-designer[data-theme="dark"] .workflow-library-empty,
.workflow-designer[data-theme="solarized"] .workflow-library-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-library-empty,
.workflow-designer[data-theme="dark"] .workflow-library-row-meta,
.workflow-designer[data-theme="solarized"] .workflow-library-row-meta,
.workflow-designer[data-theme="high-contrast"] .workflow-library-row-meta,
.workflow-designer[data-theme="dark"] .workflow-version-empty,
.workflow-designer[data-theme="solarized"] .workflow-version-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-version-empty,
.workflow-designer[data-theme="dark"] .workflow-version-meta,
.workflow-designer[data-theme="solarized"] .workflow-version-meta,
.workflow-designer[data-theme="high-contrast"] .workflow-version-meta,
.workflow-designer[data-theme="dark"] .workflow-version-diff-row,
.workflow-designer[data-theme="solarized"] .workflow-version-diff-row,
.workflow-designer[data-theme="high-contrast"] .workflow-version-diff-row,
.workflow-designer[data-theme="dark"] .workflow-node-type,
.workflow-designer[data-theme="solarized"] .workflow-node-type,
.workflow-designer[data-theme="high-contrast"] .workflow-node-type,
.workflow-designer[data-theme="dark"] .workflow-node-desc,
.workflow-designer[data-theme="solarized"] .workflow-node-desc,
.workflow-designer[data-theme="high-contrast"] .workflow-node-desc {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-inspector-restore,
.workflow-designer[data-theme="solarized"] .workflow-inspector-restore,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-restore {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-save-state,
.workflow-designer[data-theme="solarized"] .workflow-save-state,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state {
    background: var(--wf-theme-surface-alt);
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-save-state.is-saved,
.workflow-designer[data-theme="solarized"] .workflow-save-state.is-saved,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state.is-saved {
    color: #86efac;
}

.workflow-designer[data-theme="dark"] .workflow-save-state.is-dirty,
.workflow-designer[data-theme="solarized"] .workflow-save-state.is-dirty,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state.is-dirty {
    color: #fcd34d;
}

.workflow-designer[data-theme="dark"] .workflow-save-state.is-error,
.workflow-designer[data-theme="solarized"] .workflow-save-state.is-error,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state.is-error {
    color: var(--wf-theme-danger);
}

.workflow-designer[data-theme="dark"] .workflow-shortcuts-panel,
.workflow-designer[data-theme="solarized"] .workflow-shortcuts-panel,
.workflow-designer[data-theme="high-contrast"] .workflow-shortcuts-panel {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-shortcuts-row,
.workflow-designer[data-theme="solarized"] .workflow-shortcuts-row,
.workflow-designer[data-theme="high-contrast"] .workflow-shortcuts-row {
    color: var(--wf-theme-text);
    border-top-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-shortcuts-row kbd,
.workflow-designer[data-theme="solarized"] .workflow-shortcuts-row kbd,
.workflow-designer[data-theme="high-contrast"] .workflow-shortcuts-row kbd {
    background: var(--wf-theme-surface-alt);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-option,
.workflow-designer[data-theme="solarized"] .workflow-option,
.workflow-designer[data-theme="high-contrast"] .workflow-option {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-option.is-selected,
.workflow-designer[data-theme="solarized"] .workflow-option.is-selected,
.workflow-designer[data-theme="high-contrast"] .workflow-option.is-selected {
    border-color: var(--wf-theme-primary);
    background: rgba(59, 130, 246, 0.18);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-input,
.workflow-designer[data-theme="solarized"] .workflow-input,
.workflow-designer[data-theme="high-contrast"] .workflow-input,
.workflow-designer[data-theme="dark"] .workflow-select,
.workflow-designer[data-theme="solarized"] .workflow-select,
.workflow-designer[data-theme="high-contrast"] .workflow-select,
.workflow-designer[data-theme="dark"] .workflow-textarea,
.workflow-designer[data-theme="solarized"] .workflow-textarea,
.workflow-designer[data-theme="high-contrast"] .workflow-textarea,
.workflow-designer[data-theme="dark"] .workflow-json-text,
.workflow-designer[data-theme="solarized"] .workflow-json-text,
.workflow-designer[data-theme="high-contrast"] .workflow-json-text {
    background: var(--wf-theme-input);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-select,
.workflow-designer[data-theme="solarized"] .workflow-select,
.workflow-designer[data-theme="high-contrast"] .workflow-select {
    /* Keep the native dropdown arrow and popup readable on dark surfaces. */
    color-scheme: dark;
}

.workflow-designer[data-theme="dark"] .workflow-field-group-title,
.workflow-designer[data-theme="solarized"] .workflow-field-group-title,
.workflow-designer[data-theme="high-contrast"] .workflow-field-group-title {
    border-left-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-inspector-description,
.workflow-designer[data-theme="solarized"] .workflow-inspector-description,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-description,
.workflow-designer[data-theme="dark"] .workflow-field-hint,
.workflow-designer[data-theme="solarized"] .workflow-field-hint,
.workflow-designer[data-theme="high-contrast"] .workflow-field-hint,
.workflow-designer[data-theme="dark"] .workflow-input-unit,
.workflow-designer[data-theme="solarized"] .workflow-input-unit,
.workflow-designer[data-theme="high-contrast"] .workflow-input-unit,
.workflow-designer[data-theme="dark"] .workflow-list-remove,
.workflow-designer[data-theme="solarized"] .workflow-list-remove,
.workflow-designer[data-theme="high-contrast"] .workflow-list-remove {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-inspector-webhook,
.workflow-designer[data-theme="solarized"] .workflow-inspector-webhook,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-webhook {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-inspector-webhook-label,
.workflow-designer[data-theme="solarized"] .workflow-inspector-webhook-label,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-webhook-label,
.workflow-designer[data-theme="dark"] .workflow-inspector-webhook-url,
.workflow-designer[data-theme="solarized"] .workflow-inspector-webhook-url,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-webhook-url {
    color: var(--wf-theme-text, #e2e8f0);
}

.workflow-designer[data-theme="dark"] .workflow-list-row,
.workflow-designer[data-theme="solarized"] .workflow-list-row,
.workflow-designer[data-theme="high-contrast"] .workflow-list-row {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-list-add,
.workflow-designer[data-theme="solarized"] .workflow-list-add,
.workflow-designer[data-theme="high-contrast"] .workflow-list-add {
    background: transparent;
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-primary);
}

.workflow-designer[data-theme="dark"] .workflow-list-add:hover,
.workflow-designer[data-theme="solarized"] .workflow-list-add:hover,
.workflow-designer[data-theme="high-contrast"] .workflow-list-add:hover {
    background: rgba(59, 130, 246, 0.18);
}

.workflow-designer[data-theme="dark"] .workflow-field-error,
.workflow-designer[data-theme="solarized"] .workflow-field-error,
.workflow-designer[data-theme="high-contrast"] .workflow-field-error {
    color: var(--wf-theme-danger);
}

.workflow-designer[data-theme="dark"] .workflow-canvas,
.workflow-designer[data-theme="solarized"] .workflow-canvas,
.workflow-designer[data-theme="high-contrast"] .workflow-canvas {
    background-color: var(--wf-theme-canvas);
}

.workflow-designer[data-theme="dark"] .workflow-node,
.workflow-designer[data-theme="solarized"] .workflow-node,
.workflow-designer[data-theme="high-contrast"] .workflow-node {
    background: var(--wf-theme-surface);
}

.workflow-designer[data-theme="dark"] .workflow-edge-label,
.workflow-designer[data-theme="solarized"] .workflow-edge-label,
.workflow-designer[data-theme="high-contrast"] .workflow-edge-label {
    fill: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-result-pre,
.workflow-designer[data-theme="solarized"] .workflow-result-pre,
.workflow-designer[data-theme="high-contrast"] .workflow-result-pre {
    background: var(--wf-theme-input);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-library-row,
.workflow-designer[data-theme="solarized"] .workflow-library-row,
.workflow-designer[data-theme="high-contrast"] .workflow-library-row,
.workflow-designer[data-theme="dark"] .workflow-version-row,
.workflow-designer[data-theme="solarized"] .workflow-version-row,
.workflow-designer[data-theme="high-contrast"] .workflow-version-row {
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workspace-collapse,
.workflow-designer[data-theme="solarized"] .workspace-collapse,
.workflow-designer[data-theme="high-contrast"] .workspace-collapse {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workspace-collapse:hover,
.workflow-designer[data-theme="solarized"] .workspace-collapse:hover,
.workflow-designer[data-theme="high-contrast"] .workspace-collapse:hover {
    color: var(--wf-theme-primary);
}

.workflow-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.workflow-list-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
}

.workflow-list-fields {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 8px;
    min-width: 0;
}

.workflow-list-field {
    min-width: 0;
}

.workflow-list-remove {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
}

.workflow-list-remove:hover {
    color: #dc2626;
}

.workflow-list-add {
    align-self: flex-start;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    background: transparent;
    color: #2563eb;
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
}

.workflow-list-add:hover {
    border-color: #2563eb;
    background: #eff6ff;
}


.workflow-keyvalue {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.workflow-keyvalue-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
}


.workflow-field-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.workflow-field-mode {
    border: 0;
    background: transparent;
    color: #94a3b8;
    font-size: 10px;
    cursor: pointer;
    padding: 0 2px;
}

.workflow-field-mode:hover {
    color: #2563eb;
}

.workflow-designer[data-theme="dark"] .workflow-field-action,
.workflow-designer[data-theme="solarized"] .workflow-field-action,
.workflow-designer[data-theme="high-contrast"] .workflow-field-action {
    border-color: var(--wf-theme-border);
    background: var(--wf-theme-surface-alt);
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-field-action:hover:not(:disabled),
.workflow-designer[data-theme="solarized"] .workflow-field-action:hover:not(:disabled),
.workflow-designer[data-theme="high-contrast"] .workflow-field-action:hover:not(:disabled) {
    border-color: var(--wf-theme-primary);
    background: var(--wf-theme-surface);
    color: var(--wf-theme-primary);
}
`;
