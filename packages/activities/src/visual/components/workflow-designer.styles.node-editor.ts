/** Node editor sections, typed completion and preview rows. */
export const WORKFLOW_DESIGNER_NODE_EDITOR_CSS = `
.workflow-designer[data-theme="dark"] .workflow-node-editor-section,
.workflow-designer[data-theme="solarized"] .workflow-node-editor-section,
.workflow-designer[data-theme="high-contrast"] .workflow-node-editor-section,
.workflow-designer[data-theme="dark"] .workflow-typed-suggestions,
.workflow-designer[data-theme="solarized"] .workflow-typed-suggestions,
.workflow-designer[data-theme="high-contrast"] .workflow-typed-suggestions {
    background: var(--wf-theme-surface-alt);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-node-editor-section-title,
.workflow-designer[data-theme="solarized"] .workflow-node-editor-section-title,
.workflow-designer[data-theme="high-contrast"] .workflow-node-editor-section-title,
.workflow-designer[data-theme="dark"] .workflow-node-preview-label,
.workflow-designer[data-theme="solarized"] .workflow-node-preview-label,
.workflow-designer[data-theme="high-contrast"] .workflow-node-preview-label {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-node-preview-value,
.workflow-designer[data-theme="solarized"] .workflow-node-preview-value,
.workflow-designer[data-theme="high-contrast"] .workflow-node-preview-value,
.workflow-designer[data-theme="dark"] .workflow-typed-suggestion,
.workflow-designer[data-theme="solarized"] .workflow-typed-suggestion,
.workflow-designer[data-theme="high-contrast"] .workflow-typed-suggestion {
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-typed-suggestion:hover,
.workflow-designer[data-theme="solarized"] .workflow-typed-suggestion:hover,
.workflow-designer[data-theme="high-contrast"] .workflow-typed-suggestion:hover,
.workflow-designer[data-theme="dark"] .workflow-typed-suggestion[aria-selected="true"],
.workflow-designer[data-theme="solarized"] .workflow-typed-suggestion[aria-selected="true"],
.workflow-designer[data-theme="high-contrast"] .workflow-typed-suggestion[aria-selected="true"] {
    background: var(--wf-theme-surface);
    color: var(--wf-theme-primary);
}

`;
