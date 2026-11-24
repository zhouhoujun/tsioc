/** Publish, rename and version dialogs. */
export const WORKFLOW_DESIGNER_PUBLISH_CSS = `/* Rename workflow dialog */
.workflow-rename {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wf-theme-overlay, rgba(15, 23, 42, 0.42));
    color: var(--wf-theme-text, #0f172a);
    padding: 24px;
}

.workflow-rename-panel {
    width: min(380px, 100%);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--wf-theme-surface, #ffffff);
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 12px;
    padding: 14px 16px;
    color: var(--wf-theme-text, #0f172a);
    box-shadow: 0 24px 60px var(--wf-theme-shadow, rgba(15, 23, 42, 0.28));
}

.workflow-rename-head {
    display: flex;
    align-items: center;
    gap: 12px;
}

.workflow-rename-title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-rename-close {
    padding: 2px 7px;
    line-height: 1;
}

.workflow-rename-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--wf-theme-border, #cbd5e1);
    border-radius: 6px;
    padding: 7px 9px;
    background: var(--wf-theme-input, #ffffff);
    color: var(--wf-theme-text, #0f172a);
    font-size: 12px;
}

.workflow-rename-input::placeholder {
    color: var(--wf-theme-muted, #94a3b8);
}

.workflow-rename-input:focus {
    outline: none;
    border-color: var(--wf-theme-primary, #2563eb);
    box-shadow: 0 0 0 3px var(--wf-theme-focus-ring, rgba(37, 99, 235, 0.15));
}

.workflow-rename-error {
    font-size: 11px;
    color: var(--wf-theme-danger, #dc2626);
}

.workflow-rename-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.workflow-publish {
    position: fixed;
    inset: 0;
    z-index: 72;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wf-theme-overlay, rgba(15, 23, 42, 0.42));
    color: var(--wf-theme-text, #0f172a);
    padding: 24px;
}

.workflow-publish-panel {
    width: min(420px, 100%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--wf-theme-surface, #ffffff);
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 24px 60px var(--wf-theme-shadow, rgba(15, 23, 42, 0.28));
}

.workflow-publish-head {
    display: flex;
    align-items: center;
    gap: 12px;
}

.workflow-publish-title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-publish-close {
    padding: 2px 7px;
    line-height: 1;
}

.workflow-quick-add {
    position: fixed;
    inset: 0;
    z-index: 74;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    background: var(--wf-theme-overlay, rgba(15, 23, 42, 0.42));
}

.workflow-find-panel {
    width: min(460px, 92vw);
}

.workflow-find-panel .workflow-quick-add-item {
    gap: 8px;
}

.workflow-find-item .workflow-quick-add-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.workflow-quick-add-panel {
    width: min(480px, 92vw);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 12px;
    background: var(--wf-theme-surface, #ffffff);
    box-shadow: 0 24px 60px var(--wf-theme-shadow, rgba(15, 23, 42, 0.28));
}

.workflow-quick-add-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    background: var(--wf-theme-surface, #ffffff);
    color: var(--wf-theme-text, #0f172a);
}

.workflow-quick-add-list {
    max-height: 52vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.workflow-quick-add-item {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 7px;
    padding: 6px 8px;
    background: transparent;
    color: var(--wf-theme-text, #0f172a);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
}

.workflow-quick-add-item.is-active,
.workflow-quick-add-item:hover {
    background: #eff6ff;
    color: #2563eb;
}

.workflow-quick-add-icon {
    width: 18px;
    text-align: center;
}

.workflow-quick-add-label {
    flex: 1;
    min-width: 0;
}

.workflow-quick-add-category {
    color: #94a3b8;
    font-size: 10px;
}

.workflow-quick-add-empty {
    /* ui-empty owns the skin; keep the compact padding of the palette list. */
    padding: 6px 8px;
}

.workflow-designer[data-theme="dark"] .workflow-quick-add-item,
.workflow-designer[data-theme="solarized"] .workflow-quick-add-item,
.workflow-designer[data-theme="high-contrast"] .workflow-quick-add-item {
    color: var(--wf-theme-text, #e2e8f0);
}

.workflow-designer[data-theme="dark"] .workflow-quick-add-item.is-active,
.workflow-designer[data-theme="solarized"] .workflow-quick-add-item.is-active,
.workflow-designer[data-theme="high-contrast"] .workflow-quick-add-item.is-active {
    background: var(--wf-theme-surface, #0b1220);
    color: #93c5fd;
}

.workflow-group-settings-panel {
    width: min(380px, 100%);
}

.workflow-config-dialog-panel {
    width: min(460px, 100%);
    max-height: min(80vh, 640px);
    overflow: hidden;
}

/* The dialog head and actions stay fixed; only the fields scroll. */
.workflow-config-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
}

.workflow-delete-confirm-panel {
    width: min(420px, 100%);
}

.workflow-delete-confirm-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0 10px;
    font-size: 12px;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-delete-confirm-line {
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--wf-theme-surface-alt, rgba(148, 163, 184, 0.12));
}

.workflow-group-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
}

`;
