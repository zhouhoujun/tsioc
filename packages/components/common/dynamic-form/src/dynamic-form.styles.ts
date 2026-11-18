import { installStyleSheet } from '../../src/styles';

/**
 * Styles for the renderer-neutral dynamic form. Hosts can install them with
 * `installDynamicFormStyles(document)` or link the exported string.
 *
 * Components that use a custom `classPrefix` (for example the workflow
 * inspector's `workflow` prefix) reuse their own skin instead.
 */
export const DYNAMIC_FORM_STYLE_ID = 'tsdi-dynamic-form-styles';

export const DYNAMIC_FORM_CSS = `
.df-form {
    --df-border: #cbd5e1;
    --df-border-strong: #93c5fd;
    --df-bg: #ffffff;
    --df-bg-alt: #f8fafc;
    --df-text: #0f172a;
    --df-text-muted: #64748b;
    --df-text-hint: #94a3b8;
    --df-primary: #2563eb;
    --df-primary-soft: #eff6ff;
    --df-danger: #dc2626;
    --df-danger-soft: #fef2f2;
    --df-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: var(--df-text);
    font-size: 12px;
}

.df-schema-error {
    padding: 8px 10px;
    border: 1px solid var(--df-danger);
    border-radius: var(--df-radius);
    background: var(--df-danger-soft);
    color: var(--df-danger);
    font-size: 11px;
}

.df-field-group-title {
    margin: 14px 0 8px;
    padding: 2px 0 2px 8px;
    border-left: 3px solid var(--df-border);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #475569;
}



.df-field-group {
    margin-bottom: 12px;
}

.df-field-group-title {
    margin: 10px 0 6px;
}

.df-fields {
    display: block;
}

.df-field {
    margin-bottom: 10px;
}

.df-field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 3px;
}

.df-field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    margin: 0;
}

.df-field-required {
    margin-left: 2px;
    color: var(--df-danger);
}

.df-field-reset {
    opacity: 0;
    border: 0;
    background: transparent;
    color: var(--df-text-hint);
    font-size: 12px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
}

.df-field:hover .df-field-reset,
.df-field:focus-within .df-field-reset {
    opacity: 1;
}

.df-field-reset:hover {
    color: var(--df-primary);
}

.df-field-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
}

.df-field-action {
    border: 1px solid var(--df-border, #cbd5e1);
    border-radius: 4px;
    background: transparent;
    color: var(--df-text-hint);
    font-size: 11px;
    line-height: 1;
    padding: 1px 5px;
    cursor: pointer;
    transition: background var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        border-color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        color var(--ui-motion-fast, 120ms) var(--ui-ease, ease);
}

.df-field-action:hover:not(:disabled) {
    border-color: var(--df-primary);
    color: var(--df-primary);
}

.df-field-action:active:not(:disabled) {
    transform: translateY(1px);
}

.df-field-action:focus-visible {
    outline: 2px solid var(--df-primary);
    outline-offset: 1px;
}

.df-field-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
    .df-field-action {
        transition: none;
    }
    .df-field-action:active:not(:disabled) {
        transform: none;
    }
}

.df-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.df-input-wrap.has-unit .df-input {
    padding-right: 36px;
}

.df-input-unit {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--df-text-hint);
    font-size: 10px;
    line-height: 1;
    pointer-events: none;
}

.df-field-value-type-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
}

.df-field-value-type {
    width: auto;
    min-width: 84px;
    border: 1px solid var(--df-border);
    border-radius: var(--df-radius);
    padding: 3px 6px;
    background: var(--df-bg-alt);
    color: var(--df-text-muted);
    font-size: 11px;
    outline: none;
}

.df-input,
.df-select,
.df-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--df-border);
    border-radius: var(--df-radius);
    padding: 6px 8px;
    background: var(--df-bg);
    color: var(--df-text);
    font-size: 12px;
    outline: none;
}

.df-input:focus,
.df-select:focus,
.df-textarea:focus {
    border-color: var(--df-border-strong);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
}

.df-textarea {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    resize: vertical;
}

.df-checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #334155;
    font-size: 12px;
}

.df-options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.df-option {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid var(--df-border);
    border-radius: 999px;
    background: var(--df-bg);
    color: #334155;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
}

.df-option.is-selected {
    border-color: var(--df-primary);
    background: var(--df-primary-soft);
    color: #1d4ed8;
}

.df-option.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.df-option input {
    margin: 0;
    accent-color: var(--df-primary);
}

.df-field-hint {
    margin-top: 2px;
    font-size: 10px;
    color: var(--df-text-hint);
}

.df-field-error {
    margin-top: 3px;
    font-size: 10px;
    color: var(--df-danger);
}

.df-input[aria-invalid="true"],
.df-select[aria-invalid="true"],
.df-textarea[aria-invalid="true"] {
    border-color: var(--df-danger);
    background: var(--df-danger-soft);
}

.df-no-fields {
    padding: 6px 0;
    color: var(--df-text-hint);
    font-size: 11px;
}

.df-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
}

.df-btn {
    border: 1px solid var(--df-border);
    border-radius: var(--df-radius);
    background: var(--df-bg);
    color: #334155;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
}

.df-btn:hover {
    background: var(--df-bg-alt);
}

.df-btn-primary {
    border-color: transparent;
    background: var(--df-primary);
    color: #ffffff;
}

.df-btn-primary:hover {
    background: #1d4ed8;
}

.df-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.df-list-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px;
    border: 1px dashed var(--df-border);
    border-radius: 8px;
    background: var(--df-bg);
}

.df-list-fields {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 8px;
    min-width: 0;
}

.df-list-field {
    min-width: 0;
}

.df-list-remove {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: var(--df-text-hint);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
}

.df-list-remove:hover {
    color: var(--df-danger);
}

.df-list-add {
    align-self: flex-start;
    border: 1px dashed var(--df-border);
    border-radius: 6px;
    background: transparent;
    color: var(--df-primary);
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
}

.df-list-add:hover {
    border-color: var(--df-primary);
    background: var(--df-primary-soft);
}


.df-keyvalue {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.df-keyvalue-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
}


.df-field-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.df-field-mode {
    border: 0;
    background: transparent;
    color: var(--df-text-hint);
    font-size: 10px;
    cursor: pointer;
    padding: 0 2px;
}

.df-field-mode:hover {
    color: var(--df-primary);
}

`;

export function installDynamicFormStyles(doc?: Document | null): void {
    installStyleSheet(doc, DYNAMIC_FORM_STYLE_ID, DYNAMIC_FORM_CSS);
}
