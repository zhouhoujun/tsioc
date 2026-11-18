/** Audit, credentials, deployments, metrics, settings and plugin panels. */
export const WORKFLOW_DESIGNER_PANELS_CSS = `.workflow-audit-panel {
    width: min(520px, 100%);
}

.workflow-audit-list {
    /* ui-data-table owns the grid; keep the dialog's scroll budget. */
    max-height: 46vh;
    overflow: auto;
    font-size: 11px;
}

.workflow-audit-list .ui-data-table-cell:first-child {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.workflow-audit-empty {
    padding: 6px 2px;
}

.workflow-credentials-panel {
    width: min(480px, 100%);
}

.workflow-credentials-list {
    max-height: 38vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.workflow-credential-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px;
    border-bottom: 1px solid var(--wf-theme-border, #e2e8f0);
    font-size: 12px;
}

.workflow-credential-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-credential-remove {
    flex: 0 0 auto;
    font-size: 11px;
    padding: 2px 8px;
}

.workflow-credential-empty {
    padding: 6px 2px;
}

/* Configuration-node index: name + value summary per row, usage chip on the
   right, pencil to edit the record without leaving the list. */
.workflow-config-nodes-panel {
    width: min(520px, 100%);
    max-height: min(80vh, 640px);
    overflow: auto;
}

.workflow-config-node-group {
    margin: 0 0 14px;
}

.workflow-config-node-group-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    padding: 0 6px;
}

.workflow-config-node-group-label {
    flex: 1 1 auto;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--wf-theme-muted, #64748b);
}

.workflow-config-node-add {
    flex: 0 0 auto;
    font-size: 11px;
    padding: 2px 8px;
}

.workflow-config-node-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 6px;
    border-radius: 6px;
}

.workflow-config-node-row:hover {
    background: var(--wf-theme-surface-alt, #eef2f7);
}

.workflow-config-node-main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
}

.workflow-config-node-name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 600;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-config-node-summary {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
}

.workflow-config-node-usage {
    flex: 0 0 auto;
    font-size: 10px;
    line-height: 1.4;
    padding: 1px 7px;
    border: 1px solid transparent;
    border-radius: 999px;
}

.workflow-config-node-usage.is-used {
    border-color: currentColor;
    color: var(--wf-theme-primary, #2563eb);
}

.workflow-config-node-usage.is-unused {
    border-color: var(--wf-theme-border, #e2e8f0);
    color: var(--wf-theme-muted, #64748b);
}

.workflow-config-node-edit {
    flex: 0 0 auto;
    font-size: 11px;
    padding: 2px 7px;
}

.workflow-config-node-empty {
    padding: 2px 6px 6px;
    font-size: 11px;
    color: var(--wf-theme-muted, #94a3b8);
}

.workflow-credentials-panel .workflow-group-field input {
    width: 100%;
    box-sizing: border-box;
}

.workflow-deployments-panel {
    width: min(520px, 100%);
}

.workflow-deployments-actions {
    display: flex;
    gap: 6px;
}

.workflow-deployments-list {
    max-height: 42vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.workflow-deployment-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 6px;
    border-bottom: 1px solid var(--wf-theme-border, #e2e8f0);
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
}

.workflow-deployment-id {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--wf-theme-text, #0f172a);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.workflow-deployments-empty {
    padding: 6px 2px;
}

.workflow-metrics-panel {
    width: min(520px, 100%);
}

.workflow-metrics-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
}

.workflow-metrics-stat {
    /* ui-stat owns the tile skin (border, padding, tones). */
    min-width: 0;
}

.workflow-metrics-windows {
    display: flex;
    gap: 6px;
}

.workflow-metrics-window {
    font-size: 11px;
    padding: 3px 9px;
}

.workflow-metrics-window.is-active {
    background: var(--wf-theme-accent, #2563eb);
    border-color: var(--wf-theme-accent, #2563eb);
    color: #fff;
}

.workflow-metrics-trend {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 26vh;
    overflow: auto;
}

.workflow-metrics-trend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
}

.workflow-metrics-trend-time {
    flex: 0 0 auto;
    min-width: 44px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.workflow-metrics-trend-bar {
    flex: 1;
    height: 7px;
    border-radius: 4px;
    background: var(--wf-theme-surface-muted, #eef2f7);
    overflow: hidden;
}

.workflow-metrics-trend-fill {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--wf-theme-accent, #2563eb);
}

.workflow-metrics-trend-count {
    flex: 0 0 auto;
    min-width: 18px;
    text-align: right;
    color: var(--wf-theme-text, #0f172a);
    font-weight: 600;
}

.workflow-metrics-trend-failed {
    flex: 0 0 auto;
    color: #b91c1c;
}

.workflow-metrics-nodes {
    /* ui-data-table owns the grid; keep the dialog's scroll budget. */
    max-height: 40vh;
    overflow: auto;
    font-size: 11px;
}

.workflow-metrics-error {
    color: #b91c1c;
    font-size: 11px;
}

.workflow-settings-panel {
    width: min(420px, 100%);
}

.workflow-group-field textarea {
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 12px;
    resize: vertical;
    background: var(--wf-theme-surface, #ffffff);
    color: var(--wf-theme-text, #0f172a);
}

.workflow-group-field input[type="number"] {
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 12px;
    background: var(--wf-theme-surface, #ffffff);
    color: var(--wf-theme-text, #0f172a);
}

.workflow-group-field input[type="text"] {
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 12px;
    background: var(--wf-theme-surface, #ffffff);
    color: var(--wf-theme-text, #0f172a);
}

.workflow-group-field input[type="color"] {
    width: 64px;
    height: 28px;
    padding: 1px;
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 6px;
    background: var(--wf-theme-surface, #ffffff);
}

.workflow-plugins-panel {
    width: min(560px, 100%);
    max-height: min(560px, 82vh);
}

.workflow-plugins-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: auto;
    padding-right: 2px;
}

.workflow-plugin-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 8px;
    background: var(--wf-theme-surface, #ffffff);
}

.workflow-plugin-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-plugin-title {
    font-size: 12px;
    font-weight: 700;
}

.workflow-plugin-version,
.workflow-plugin-nodes {
    color: var(--wf-theme-muted, #94a3b8);
}

.workflow-plugin-installed {
    /* ui-badge owns the pill skin. */
    flex: 0 0 auto;
}

.workflow-plugin-description {
    flex-basis: 100%;
    color: var(--wf-theme-muted, #64748b);
    line-height: 1.45;
}

.workflow-plugins-empty {
    padding: 6px 2px;
}

.workflow-plugins-error {
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
    padding: 4px 0;
}

.workflow-plugins-error {
    color: #b91c1c;
}

.workflow-publish-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-publish-meta {
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
}

.workflow-publish-hint {
    font-size: 11px;
    color: var(--wf-theme-muted, #64748b);
    line-height: 1.5;
}

.workflow-publish-error {
    font-size: 11px;
    color: var(--wf-theme-danger, #dc2626);
}

.workflow-publish-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 2px;
}

.workflow-menu {
    margin-left: auto;
}

.workflow-menu .menu-bar-trigger {
    padding: 6px 7px;
}

.workflow-btn {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    background: #ffffff;
    color: #334155;
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
}

.workflow-btn:hover:not(:disabled) {
    background: #f1f5f9;
}

.workflow-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.workflow-btn-icon {
    display: inline-block;
    width: 13px;
    height: 13px;
    margin-right: 5px;
    flex: none;
    overflow: visible;
    vertical-align: -2px;
}

.workflow-btn-icon-only {
    margin-right: 0;
}

.workflow-btn-primary {
    border: 0;
    background: #2563eb;
    color: #ffffff;
}

.workflow-btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
}

.workflow-btn-danger {
    border-color: #fecaca;
    color: #dc2626;
}

workflow-designer-preview {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}

.workflow-designer > workflow-designer-preview {
    flex: 1 1 auto;
    min-height: 0;
}

.workflow-designer-preview {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: 100%;
}

.workflow-designer > .workflow-designer-preview {
    height: auto;
    min-height: 0;
    flex: 1;
}

.workflow-designer > workspace-layout,
.workflow-designer-preview > workspace-layout {
    flex: 1 1 auto;
    min-height: 0;
}

.workflow-designer workspace-center {
    position: relative;
}

.workflow-designer workspace-left,
.workflow-designer workspace-center,
.workflow-designer workspace-right,
.workflow-designer workspace-bottom {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.workflow-designer workspace-left > workflow-palette,
.workflow-designer workspace-center > workflow-canvas,
.workflow-designer workspace-right > workflow-inspector {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}

workflow-canvas {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
}

`;
