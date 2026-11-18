/** Inspector fields, code editor and syntax feedback. */
export const WORKFLOW_DESIGNER_INSPECTOR_CSS = `/* Inspector */
.workflow-inspector {
    width: 100%;
    flex: 1 1 auto;
    border-left: 1px solid #e2e8f0;
    background: #ffffff;
    overflow: visible;
    padding: 12px;
    box-sizing: border-box;
}

.workflow-inspector-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 10px;
}

.workflow-inspector-empty {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.6;
}

.workflow-inspector-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
}

.workflow-inspector-type {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-inspector-status {
    font-size: 10px;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 999px;
    padding: 2px 7px;
}

.workflow-inspector-duration {
    font-size: 10px;
    color: #64748b;
}

.workflow-inspector-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #94a3b8;
}

.workflow-inspector-restore {
    margin-left: auto;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    color: #64748b;
    font-size: 10px;
    padding: 3px 8px;
    cursor: pointer;
}

.workflow-inspector-restore:hover {
    color: #2563eb;
    border-color: #93c5fd;
}

.workflow-field-group {
    margin-bottom: 12px;
}

.workflow-field-group .workflow-field-group-title {
    margin: 10px 0 6px;
}

.workflow-fields {
    display: block;
}

.workflow-field {
    margin-bottom: 10px;
}

.workflow-inspector-description {
    margin: 2px 0 10px;
    color: #64748b;
    font-size: 11px;
    line-height: 1.45;
}

.workflow-inspector-webhook {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 2px 0 10px;
    padding: 6px 8px;
    border: 1px solid #d1fae5;
    border-radius: 6px;
    background: #ecfdf5;
}

.workflow-inspector-webhook-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #047857;
}

.workflow-inspector-webhook-url {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: #065f46;
    overflow-wrap: anywhere;
}

.workflow-field-value-type-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
}

.workflow-field-value-type {
    width: auto;
    min-width: 84px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 2px 6px;
    background: #f8fafc;
    color: #64748b;
    font-size: 10px;
}

.workflow-field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 3px;
}

.workflow-field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 3px;
}

.workflow-field-label-row .workflow-field-label {
    margin-bottom: 0;
}

.workflow-field-required {
    margin-left: 2px;
    color: #dc2626;
}

.workflow-field-reset {
    opacity: 0;
    border: 0;
    background: transparent;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
}

/* Reference picker buttons (create / edit) are primary affordances, so they
   stay visible instead of appearing on hover like the reset control. */
.workflow-field-action {
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: #f8fafc;
    color: #475569;
    font-size: 11px;
    line-height: 1;
    padding: 1px 6px;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.workflow-field-action:hover:not(:disabled) {
    border-color: #2563eb;
    background: #eff6ff;
    color: #2563eb;
}

.workflow-field-action:active:not(:disabled) {
    transform: translateY(1px);
}

.workflow-field-action:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 1px;
}

.workflow-field-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
    .workflow-field-action {
        transition: none;
    }
    .workflow-field-action:active:not(:disabled) {
        transform: none;
    }
}

.workflow-field:hover .workflow-field-reset,
.workflow-field:focus-within .workflow-field-reset {
    opacity: 1;
}

.workflow-field-reset:hover {
    color: #2563eb;
}

.workflow-field-group-title {
    margin: 16px 0 8px;
    padding: 2px 0 2px 8px;
    border-left: 3px solid #cbd5e1;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #475569;
}



.workflow-inspector-no-fields,
.workflow-no-fields {
    padding: 6px 0;
    font-size: 11px;
    color: #94a3b8;
}

.workflow-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.workflow-input-wrap.has-unit .workflow-input {
    padding-right: 36px;
}

.workflow-input-unit {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 10px;
    line-height: 1;
    pointer-events: none;
}

.workflow-input,
.workflow-select,
.workflow-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    color: #0f172a;
    background: #ffffff;
}

.workflow-textarea {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    resize: vertical;
}

.workflow-checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #334155;
}

.workflow-options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.workflow-option {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: #ffffff;
    color: #334155;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
}

.workflow-option.is-selected {
    border-color: #2563eb;
    background: #eff6ff;
    color: #1d4ed8;
}

.workflow-option.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.workflow-option input {
    margin: 0;
    accent-color: #2563eb;
}

.workflow-field-hint {
    font-size: 11px;
    line-height: 1.4;
    color: #64748b;
    margin-top: 3px;
}

.workflow-field-error {
    margin-top: 3px;
    font-size: 10px;
    color: #dc2626;
}

.workflow-input.is-invalid,
.workflow-textarea.is-invalid,
.workflow-select.is-invalid,
.workflow-input[aria-invalid="true"],
.workflow-textarea[aria-invalid="true"],
.workflow-select[aria-invalid="true"] {
    border-color: #dc2626;
    background: #fef2f2;
}

.workflow-designer[data-theme="dark"] .workflow-input[aria-invalid="true"],
.workflow-designer[data-theme="solarized"] .workflow-input[aria-invalid="true"],
.workflow-designer[data-theme="high-contrast"] .workflow-input[aria-invalid="true"],
.workflow-designer[data-theme="dark"] .workflow-textarea[aria-invalid="true"],
.workflow-designer[data-theme="solarized"] .workflow-textarea[aria-invalid="true"],
.workflow-designer[data-theme="high-contrast"] .workflow-textarea[aria-invalid="true"],
.workflow-designer[data-theme="dark"] .workflow-select[aria-invalid="true"],
.workflow-designer[data-theme="solarized"] .workflow-select[aria-invalid="true"],
.workflow-designer[data-theme="high-contrast"] .workflow-select[aria-invalid="true"] {
    background: rgba(220, 38, 38, 0.14);
    border-color: var(--wf-theme-danger, #f87171);
}

.workflow-code-editor {
    min-height: 150px;
}

/* Syntax feedback under the code editor (in addition to gutter markers). */
.workflow-code-status {
    min-height: 14px;
    margin-top: 4px;
    font-size: 10px;
    line-height: 1.4;
    color: var(--wf-theme-muted, #64748b);
}

.workflow-code-status.is-error {
    color: var(--wf-theme-danger, #dc2626);
}

.workflow-code-status.is-warning {
    color: #b45309;
}

.workflow-designer[data-theme="dark"] .workflow-code-status.is-warning,
.workflow-designer[data-theme="solarized"] .workflow-code-status.is-warning,
.workflow-designer[data-theme="high-contrast"] .workflow-code-status.is-warning {
    color: #fbbf24;
}

.workflow-code-editor-host {
    width: 100%;
}

.workflow-code-editor-host .cm-editor {
    width: 100%;
}

.workflow-code-editor-host .cm-editor.cm-focused {
    outline: none;
    border-color: var(--wf-code-accent, #2563eb);
}

.workflow-code-editor-host .cm-scroller {
    max-height: 460px;
}

.workflow-code-editor-host .cm-content {
    min-height: 136px;
}

.workflow-code-editor-host .cm-tooltip-autocomplete {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
}

.workflow-code-editor-host .cm-tooltip-autocomplete > ul {
    max-height: 220px;
}

.workflow-code-editor-host .cm-tooltip-autocomplete > ul > li {
    padding: 3px 8px;
}

.workflow-result {
    margin-top: 14px;
}

.workflow-result-title {
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 4px;
}

.workflow-result-pre {
    margin: 0;
    padding: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 10px;
    color: #334155;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 180px;
    overflow: auto;
}

.workflow-error {
    margin-top: 10px;
    padding: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-size: 11px;
    color: #b91c1c;
    white-space: pre-wrap;
}

`;
