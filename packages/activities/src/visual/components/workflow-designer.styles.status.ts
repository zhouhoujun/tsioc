/** Status strip, JSON/run panels, library and version lists. */
export const WORKFLOW_DESIGNER_STATUS_CSS = `/* Status and JSON panels */
.workflow-run-history {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 6px 12px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
}

.workflow-run-history-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #64748b;
    margin-right: 4px;
}

.workflow-run-history-count {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    background: #e2e8f0;
    border-radius: 999px;
    padding: 0 6px;
}

.workflow-run-chip-size {
    font-size: 10px;
    color: #94a3b8;
}

.workflow-run-clear {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 2px 7px;
    background: #ffffff;
    color: #64748b;
    font-size: 10px;
    cursor: pointer;
}

.workflow-run-clear:hover {
    background: #f1f5f9;
}

.workflow-run-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 3px 8px;
    background: #ffffff;
    color: #475569;
    font-size: 10px;
    cursor: pointer;
}

.workflow-run-chip:hover {
    border-color: #93c5fd;
    background: #eff6ff;
}

.workflow-run-chip.is-active {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.workflow-run-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94a3b8;
}

.workflow-run-chip-success .workflow-run-chip-dot { background: #16a34a; }
.workflow-run-chip-failed .workflow-run-chip-dot { background: #dc2626; }
.workflow-run-chip-running .workflow-run-chip-dot { background: #2563eb; }
.workflow-run-chip-cancelled .workflow-run-chip-dot { background: #f97316; }

.workflow-run-chip-status {
    font-weight: 600;
}

.workflow-run-chip-duration {
    color: #94a3b8;
}

.workflow-run-log {
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.workflow-run-log-body {
    overflow: visible;
    min-height: 0;
}

.workflow-run-log-tab {
    border: 0;
    background: transparent;
    color: #64748b;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 5px;
    cursor: pointer;
}

.workflow-run-log-tab.is-active {
    background: #eff6ff;
    color: #2563eb;
    font-weight: 700;
}

.workflow-debug-search-row {
    padding: 4px 10px;
    border-bottom: 1px solid #e2e8f0;
}

.workflow-debug-search {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
    color: #0f172a;
    background: #ffffff;
}

.workflow-debug-item {
    border-bottom: 1px solid #f1f5f9;
}

.workflow-debug-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: 0;
    background: transparent;
    padding: 5px 10px;
    text-align: left;
    cursor: pointer;
    font-size: 11px;
    color: #334155;
}

.workflow-debug-summary:hover {
    background: #f8fafc;
}

.workflow-debug-name {
    font-weight: 600;
}

.workflow-debug-type,
.workflow-debug-duration {
    color: #94a3b8;
}

.workflow-debug-status {
    margin-left: auto;
    font-size: 10px;
    color: #64748b;
}

.workflow-debug-status.is-success { color: #047857; }
.workflow-debug-status.is-failed { color: #b91c1c; }
.workflow-debug-status.is-cancelled { color: #b45309; }

.workflow-debug-payload {
    margin: 0;
    padding: 6px 10px 10px;
    max-height: 220px;
    overflow: auto;
    background: #f8fafc;
    color: #0f172a;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.workflow-debug-state {
    padding: 0 10px 8px;
}

.workflow-debug-state-title {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 3px;
}

.workflow-debug-error {
    padding: 0 10px 8px;
    color: #b91c1c;
    font-size: 11px;
}

.workflow-debug-empty {
    padding: 10px;
    color: #94a3b8;
    font-size: 11px;
}

.workflow-designer[data-theme="dark"] .workflow-debug-search,
.workflow-designer[data-theme="solarized"] .workflow-debug-search,
.workflow-designer[data-theme="high-contrast"] .workflow-debug-search {
    background: var(--wf-theme-surface, #0b1220);
    border-color: var(--wf-theme-border, #1e293b);
    color: var(--wf-theme-text, #e2e8f0);
}

.workflow-designer[data-theme="dark"] .workflow-debug-summary,
.workflow-designer[data-theme="solarized"] .workflow-debug-summary,
.workflow-designer[data-theme="high-contrast"] .workflow-debug-summary {
    color: var(--wf-theme-text, #e2e8f0);
}

.workflow-designer[data-theme="dark"] .workflow-debug-payload,
.workflow-designer[data-theme="solarized"] .workflow-debug-payload,
.workflow-designer[data-theme="high-contrast"] .workflow-debug-payload {
    background: var(--wf-theme-surface, #0b1220);
    color: var(--wf-theme-text, #e2e8f0);
}

.workflow-run-log-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.workflow-run-log-title {
    font-size: 11px;
    font-weight: 700;
    color: #334155;
}

.workflow-run-log-row {
    display: grid;
    grid-template-columns: 62px 54px minmax(0, 1fr);
    gap: 8px;
    align-items: baseline;
    padding: 2px 0;
    font-size: 10px;
    color: #475569;
}

.workflow-run-log-time {
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
}

.workflow-run-log-level {
    font-weight: 700;
    color: #2563eb;
}

.workflow-run-log-success .workflow-run-log-level { color: #16a34a; }
.workflow-run-log-warning .workflow-run-log-level { color: #d97706; }
.workflow-run-log-error .workflow-run-log-level { color: #dc2626; }

.workflow-run-log-message {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.workflow-statusbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 6px 12px;
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
    font-size: 11px;
    color: #64748b;
}

.workflow-status-error {
    color: #dc2626;
}

.workflow-status-spacer {
    flex: 1;
}

.workflow-json-panel {
    position: fixed;
    right: 18px;
    bottom: 18px;
    width: min(560px, calc(100vw - 36px));
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    padding: 12px;
    z-index: 30;
}

.workflow-json-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.workflow-json-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-json-text {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: #334155;
    background: #f8fafc;
    resize: vertical;
}

.workflow-expression-panel {
    width: min(560px, 92vw);
}

.workflow-expression-text {
    width: 100%;
    min-height: 150px;
    box-sizing: border-box;
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #334155;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 10px;
}

.workflow-expression-error {
    font-size: 12px;
    color: #dc2626;
    margin-top: 6px;
}

.workflow-expression-ok {
    font-size: 12px;
    color: #047857;
    margin-top: 6px;
}

.workflow-json-error {
    margin-top: 6px;
    font-size: 11px;
    color: #dc2626;
}

/* Workflow library */
.workflow-library-panel {
    position: fixed;
    right: 18px;
    bottom: 18px;
    width: min(620px, calc(100vw - 36px));
    max-height: min(520px, calc(100vh - 80px));
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    padding: 12px;
    z-index: 31;
}

.workflow-library-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.workflow-library-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-library-list {
    overflow: auto;
    min-height: 0;
}

.workflow-library-empty {
    padding: 6px 2px;
}

.workflow-library-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 2px;
    border-top: 1px solid #f1f5f9;
}

.workflow-library-row.is-active .workflow-library-row-name {
    color: #2563eb;
}

.workflow-library-row-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.workflow-library-row-name {
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-library-row-meta {
    font-size: 10px;
    color: #94a3b8;
}

.workflow-library-error {
    margin-top: 8px;
    font-size: 11px;
    color: #dc2626;
}

.workflow-version-panel {
    position: fixed;
    right: 18px;
    bottom: 18px;
    width: min(560px, calc(100vw - 36px));
    max-height: min(460px, calc(100vh - 80px));
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    padding: 12px;
    z-index: 31;
}

.workflow-version-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.workflow-version-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-version-release {
    font-size: 10px;
    font-weight: 700;
    color: #047857;
    background: #d1fae5;
    border-radius: 999px;
    padding: 1px 8px;
}

.workflow-version-list {
    overflow: auto;
    min-height: 0;
}

.workflow-version-empty {
    padding: 6px 2px;
}

.workflow-version-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 2px;
    border-top: 1px solid #f1f5f9;
}

.workflow-version-row.is-published .workflow-version-name {
    color: #047857;
}

.workflow-version-badge {
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    background: #e2e8f0;
    border-radius: 6px;
    padding: 1px 6px;
}

.workflow-version-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.workflow-version-name {
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-version-meta {
    font-size: 10px;
    color: #94a3b8;
}

.workflow-version-error {
    margin-top: 8px;
    font-size: 11px;
    color: #dc2626;
}

.workflow-version-diff {
    margin-top: 8px;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    max-height: 180px;
    overflow: auto;
}

.workflow-version-diff-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.workflow-version-diff-title {
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-version-diff-empty {
    padding: 4px 2px;
}

.workflow-version-diff-row {
    display: flex;
    gap: 6px;
    font-size: 11px;
    line-height: 1.6;
    color: #334155;
}

.workflow-version-diff-row.is-added .workflow-version-diff-mark {
    color: #047857;
}

.workflow-version-diff-row.is-removed .workflow-version-diff-mark {
    color: #dc2626;
}

.workflow-version-diff-row.is-changed .workflow-version-diff-mark {
    color: #b45309;
}

.workflow-version-diff-mark {
    width: 10px;
    flex: none;
    font-weight: 700;
}

.workflow-version-diff-text {
    min-width: 0;
    word-break: break-word;
}


`;
