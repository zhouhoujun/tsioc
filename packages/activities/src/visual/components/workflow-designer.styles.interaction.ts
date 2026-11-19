/**
 * Shared interaction palette for toolbar buttons, tabs and other clickable
 * chrome. Themes only remap these tokens so hover/active feedback stays
 * visible on every surface instead of falling back to light-only literals.
 */
export const WORKFLOW_DESIGNER_INTERACTION_CSS = `/* Interaction tokens */
.workflow-designer {
    --wf-theme-hover: #f1f5f9;
    --wf-theme-active: #e2e8f0;
    --wf-btn-bg: #ffffff;
    --wf-btn-border: #cbd5e1;
    --wf-btn-fg: #334155;
    --wf-btn-hover-bg: var(--wf-theme-hover);
    --wf-btn-hover-border: #94a3b8;
    --wf-btn-active-bg: var(--wf-theme-active);
    --wf-btn-primary: #2563eb;
    --wf-btn-primary-hover: #1d4ed8;
    --wf-btn-primary-fg: #ffffff;
    --wf-btn-danger: #dc2626;
    --wf-btn-danger-border: #fecaca;
    --wf-btn-danger-hover-bg: #fef2f2;
}

.workflow-designer[data-theme="dark"] {
    --wf-theme-hover: #1e293b;
    --wf-theme-active: #334155;
    --wf-btn-bg: var(--wf-theme-surface);
    --wf-btn-border: var(--wf-theme-border);
    --wf-btn-fg: var(--wf-theme-text);
    --wf-btn-hover-bg: #1e293b;
    --wf-btn-hover-border: #475569;
    --wf-btn-active-bg: #334155;
    --wf-btn-primary: #3b82f6;
    --wf-btn-primary-hover: #60a5fa;
    --wf-btn-primary-fg: #ffffff;
    --wf-btn-danger: #f87171;
    --wf-btn-danger-border: rgba(248, 113, 113, 0.45);
    --wf-btn-danger-hover-bg: rgba(248, 113, 113, 0.14);
}

.workflow-designer[data-theme="solarized"] {
    --wf-theme-hover: #0b4f5c;
    --wf-theme-active: #155e6b;
    --wf-btn-bg: var(--wf-theme-surface);
    --wf-btn-border: var(--wf-theme-border);
    --wf-btn-fg: var(--wf-theme-text);
    --wf-btn-hover-bg: #0b4f5c;
    --wf-btn-hover-border: #657b83;
    --wf-btn-active-bg: #155e6b;
    --wf-btn-primary: #268bd2;
    --wf-btn-primary-hover: #3aa0e0;
    --wf-btn-primary-fg: #ffffff;
    --wf-btn-danger: #dc322f;
    --wf-btn-danger-border: rgba(220, 50, 47, 0.5);
    --wf-btn-danger-hover-bg: rgba(220, 50, 47, 0.16);
}

.workflow-designer[data-theme="high-contrast"] {
    --wf-theme-hover: #333333;
    --wf-theme-active: #444444;
    --wf-btn-bg: #000000;
    --wf-btn-border: #ffffff;
    --wf-btn-fg: #ffffff;
    --wf-btn-hover-bg: #333333;
    --wf-btn-hover-border: #ffff00;
    --wf-btn-active-bg: #444444;
    --wf-btn-primary: #ffff00;
    --wf-btn-primary-hover: #ffff66;
    --wf-btn-primary-fg: #000000;
    --wf-btn-danger: #ff5555;
    --wf-btn-danger-border: #ff5555;
    --wf-btn-danger-hover-bg: rgba(255, 85, 85, 0.22);
}
`;
