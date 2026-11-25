import { installStyleSheet } from './styles';

/**
 * Default skin for the generic UI primitives. All colors stay themeable
 * through `--ui-*` variables; hosts may also ignore this sheet entirely and
 * style the stable classes themselves.
 */
export const UI_STYLE_ID = 'tsdi-ui-styles';

/**
 * Shared motion tokens and interaction feedback for the generic primitives.
 *
 * Exported separately so hosts that own their own skin (for example the
 * workflow designer) can include motion without adopting the full default
 * sheet. Every rule degrades to no motion under `prefers-reduced-motion`.
 */
export const UI_MOTION_CSS = `
:root {
    --ui-motion-fast: 120ms;
    --ui-motion-normal: 180ms;
    --ui-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    --ui-focus-ring: var(--ui-tone-border, currentColor);
}
.ui-button,
.ui-toolbar-item {
    transition:
        background var(--ui-motion-fast) var(--ui-ease),
        border-color var(--ui-motion-fast) var(--ui-ease),
        color var(--ui-motion-fast) var(--ui-ease),
        transform var(--ui-motion-fast) var(--ui-ease);
}
.ui-button:active:not(:disabled),
.ui-toolbar-item:active:not(:disabled) {
    transform: translateY(1px);
}
.ui-button:focus-visible,
.ui-toolbar-item:focus-visible {
    outline: 2px solid var(--ui-focus-ring);
    outline-offset: 1px;
}
@media (prefers-reduced-motion: reduce) {
    .ui-button,
    .ui-toolbar-item {
        transition: none;
    }
    .ui-button:active:not(:disabled),
    .ui-toolbar-item:active:not(:disabled) {
        transform: none;
    }
}
`;

export const PLAIN_BUTTON_STYLE_ID = 'tsdi-plain-button-styles';

/**
 * Reset for semantic buttons that must read as inline text (dialog ✕, inline
 * actions). The element stays a real `<button>` for focus/assistive tech, but
 * loses the UA chrome so the DOM and terminal surfaces paint the same label.
 *
 * Exported separately because the dialog widgets install it themselves; every
 * browser host then matches the terminal output without opting into the full
 * `installUiStyles` skin.
 */
export const PLAIN_BUTTON_CSS = `
.ui-plain-button {
    display: inline;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: inherit;
    cursor: pointer;
}
`;

export const UI_CSS = `
${UI_MOTION_CSS}
${PLAIN_BUTTON_CSS}
.ui-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5ch;
    min-height: 1.8em;
    padding: 0.15em 0.75ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-button-bg, transparent);
    color: var(--ui-button-fg, inherit);
    font: inherit;
    line-height: 1.2;
    cursor: pointer;
}
.ui-button:hover { background: var(--ui-button-hover-bg, var(--ui-hover-bg, transparent)); }
.ui-button:disabled,
.ui-button.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-button.is-shape-round { border-radius: var(--ui-radius-pill, 999px); }
.ui-button.is-shape-circle {
    width: 1.8em;
    height: 1.8em;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
}
.ui-button.is-icon-only { gap: 0; }
.ui-button.is-block { display: flex; width: 100%; justify-content: center; }
.ui-button.is-solid { background: var(--ui-tone-bg, var(--ui-button-bg, transparent)); color: var(--ui-tone-fg, inherit); }
.ui-button.is-outline { background: transparent; border-color: var(--ui-tone-border, currentColor); }
.ui-button.is-ghost { background: transparent; border-color: transparent; }
.ui-button.is-ghost:hover { border-color: var(--ui-border, currentColor); }
.ui-button.is-xs { font-size: 0.85em; padding: 0 0.4ch; }
.ui-button.is-sm { font-size: 0.92em; }
.ui-button.is-lg { font-size: 1.08em; padding: 0.25em 1ch; }
.ui-button-label { white-space: nowrap; }

.ui-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35ch;
    padding: 0 0.6ch;
    border: 1px solid var(--ui-badge-border, transparent);
    border-radius: var(--ui-radius-pill, 999px);
    background: var(--ui-badge-bg, transparent);
    color: var(--ui-badge-fg, inherit);
    font-size: 0.85em;
    line-height: 1.6;
    white-space: nowrap;
}
.ui-badge.is-outline { border-color: var(--ui-tone-border, currentColor); background: transparent; }
.ui-badge.is-solid { background: var(--ui-tone-bg, var(--ui-badge-bg, transparent)); color: var(--ui-tone-fg, inherit); }
.ui-badge.is-active { border-color: var(--ui-tone-border, currentColor); color: var(--ui-tone-fg, inherit); }
.ui-badge.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); }
.ui-badge[role="button"] { cursor: pointer; }
.ui-badge-dot {
    display: inline-block;
    width: 0.55em;
    height: 0.55em;
    border-radius: 50%;
    background: var(--ui-tone-bg, currentColor);
}

.ui-card {
    display: block;
    padding: var(--ui-card-padding, 1ch);
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-card-bg, transparent);
    color: var(--ui-card-fg, inherit);
}
.ui-card.is-dense { padding: 0.5ch; }
.ui-card-header {
    display: flex;
    align-items: baseline;
    gap: 1ch;
    flex-wrap: wrap;
}
.ui-card.is-dense .ui-card-header { gap: 0.5ch; }
.ui-card.has-divider .ui-card-header {
    padding-bottom: 0.5ch;
    border-bottom: 1px solid var(--ui-border, currentColor);
}
.ui-card-heading { display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto; }
.ui-card-title { margin: 0; font-size: 1em; font-weight: 600; }
.ui-card-subtitle { margin: 0; color: var(--ui-muted-fg, inherit); font-size: 0.9em; }
.ui-card-meta { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-card-actions { display: flex; align-items: center; gap: 0.5ch; margin-left: auto; }
.ui-card-body { min-width: 0; }

.ui-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5ch;
    padding: var(--ui-empty-padding, 2ch 1ch);
    text-align: center;
    color: var(--ui-muted-fg, inherit);
}
.ui-empty-title { margin: 0; color: var(--ui-empty-title-fg, inherit); font-weight: 600; }
.ui-empty-hint { margin: 0; font-size: 0.92em; }
.ui-empty-actions { margin-top: 0.5ch; }

.ui-divider {
    display: flex;
    align-items: center;
    gap: 0.75ch;
    color: var(--ui-muted-fg, inherit);
}
.ui-divider.is-vertical {
    flex-direction: column;
    width: 1px;
    min-height: 1em;
    border-left: 1px solid var(--ui-border, currentColor);
}
.ui-divider.is-filled .ui-divider-rule { overflow: hidden; flex: 1 1 auto; }
.ui-divider-label { white-space: nowrap; }

.ui-stat {
    display: inline-flex;
    flex-direction: column;
    gap: 0.15ch;
    min-width: 0;
    padding: 0.5ch 0.75ch;
}
.ui-stat-label { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-stat-value { font-size: 1.4em; font-weight: 600; line-height: 1.1; }
.ui-stat-hint { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-stat-trend.is-up { color: var(--ui-success-fg, inherit); }
.ui-stat-trend.is-down { color: var(--ui-danger-fg, inherit); }

.ui-progress {
    display: inline-flex;
    align-items: center;
    gap: 0.75ch;
    min-width: 0;
}
.ui-progress-bar {
    font-family: var(--ui-mono-font, monospace);
    letter-spacing: 0;
    color: var(--ui-tone-fg, inherit);
}
.ui-progress-label,
.ui-progress-value { color: var(--ui-muted-fg, inherit); font-size: 0.9em; white-space: nowrap; }

.ui-breadcrumb {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5ch;
    min-width: 0;
}
.ui-breadcrumb-node { display: inline-flex; align-items: center; gap: 0.5ch; }
.ui-breadcrumb-item { color: var(--ui-link-fg, inherit); }
.ui-breadcrumb-item.is-current { color: var(--ui-current-fg, inherit); font-weight: 600; }
.ui-breadcrumb-item.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); }
.ui-breadcrumb-item[role="link"] { cursor: pointer; }
.ui-breadcrumb-item[role="link"]:hover { text-decoration: underline; }
.ui-breadcrumb-separator { color: var(--ui-muted-fg, inherit); }

.ui-toolbar {
    display: inline-flex;
    align-items: center;
    gap: 0.35ch;
    flex-wrap: wrap;
    min-width: 0;
}
.ui-toolbar.is-vertical { flex-direction: column; align-items: stretch; }
.ui-toolbar-entry { display: contents; }
.ui-toolbar-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35ch;
    padding: 0.1em 0.6ch;
    border: 1px solid transparent;
    border-radius: var(--ui-radius, 4px);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}
.ui-toolbar-item:hover { border-color: var(--ui-border, currentColor); }
.ui-toolbar-item.is-solid { background: var(--ui-tone-bg, transparent); color: var(--ui-tone-fg, inherit); border-color: transparent; }
.ui-toolbar-item.is-outline { border-color: var(--ui-tone-border, currentColor); }
.ui-toolbar-item.is-active { border-color: var(--ui-tone-border, currentColor); color: var(--ui-tone-fg, inherit); }
.ui-toolbar-item.is-danger { color: var(--ui-danger-fg, inherit); }
.ui-toolbar-item.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-toolbar-separator {
    display: inline-block;
    width: 1px;
    align-self: stretch;
    margin: 0 0.4ch;
    background: var(--ui-border, currentColor);
}
.ui-toolbar.is-vertical .ui-toolbar-separator { width: auto; height: 1px; margin: 0.3ch 0; }

.ui-steps {
    display: flex;
    gap: 0.75ch;
    margin: 0;
    padding: 0;
    list-style: none;
    min-width: 0;
}
.ui-steps.is-vertical { flex-direction: column; }
.ui-step {
    display: inline-flex;
    align-items: center;
    gap: 0.5ch;
    min-width: 0;
}
.ui-step-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.6em;
    min-height: 1.6em;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: 50%;
    color: var(--ui-muted-fg, inherit);
}
.ui-step.is-active .ui-step-marker,
.ui-step.is-done .ui-step-marker { color: var(--ui-tone-fg, inherit); border-color: var(--ui-tone-border, currentColor); }
.ui-step.is-error .ui-step-marker { color: var(--ui-danger-fg, inherit); border-color: var(--ui-danger-fg, currentColor); }
.ui-step.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); }
.ui-step-copy { display: inline-flex; flex-direction: column; min-width: 0; }
.ui-step-label { white-space: nowrap; }
.ui-step.is-current .ui-step-label { font-weight: 600; }
.ui-step-hint { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-step-connector { color: var(--ui-muted-fg, inherit); }
.ui-steps.is-vertical .ui-step { align-items: flex-start; }
.ui-steps.is-vertical .ui-step-connector { align-self: stretch; }

.ui-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
}
.ui-timeline-item {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 0.75ch;
    position: relative;
    padding-bottom: 0.5ch;
}
.ui-timeline-marker { color: var(--ui-tone-fg, inherit); }
.ui-timeline-item.is-error .ui-timeline-marker { color: var(--ui-danger-fg, inherit); }
.ui-timeline-connector {
    position: absolute;
    left: 0.45ch;
    top: 1.2em;
    bottom: 0;
    color: var(--ui-muted-fg, inherit);
}
.ui-timeline-content { display: flex; flex-direction: column; min-width: 0; }
.ui-timeline-title { font-weight: 600; }
.ui-timeline-time,
.ui-timeline-detail { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }

.ui-skeleton { display: flex; flex-direction: column; gap: 0.35ch; }
.ui-skeleton-line {
    display: block;
    overflow: hidden;
    color: var(--ui-skeleton-fg, var(--ui-muted-fg, inherit));
    letter-spacing: 0;
    white-space: nowrap;
}

.ui-field { display: flex; flex-direction: column; gap: 0.25ch; min-width: 0; }
.ui-field-label { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }
.ui-field-row {
    display: flex;
    align-items: center;
    gap: 0.5ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    padding: 0 0.6ch;
    background: var(--ui-field-bg, transparent);
}
.ui-field.is-disabled .ui-field-row,
.ui-field.is-readonly .ui-field-row { opacity: var(--ui-disabled-opacity, 0.65); }
.ui-field-input {
    flex: 1 1 auto;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0.25em 0;
}
.ui-field-input::placeholder { color: var(--ui-muted-fg, inherit); }
.ui-field-clear {
    border: 0;
    background: transparent;
    color: var(--ui-muted-fg, inherit);
    cursor: pointer;
    font: inherit;
    padding: 0 0.2ch;
}
.ui-field-hint { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }

.ui-field-group { display: flex; flex-direction: column; gap: 0.25ch; min-width: 0; }
.ui-field-group-label { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }
.ui-field-group-required { color: var(--ui-danger-fg, inherit); }
.ui-field-group-control { display: block; min-width: 0; }
.ui-field-group-hint { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-field-group-error { color: var(--ui-danger-fg, #cf9893); font-size: 0.85em; }

.ui-typeahead { display: flex; flex-direction: column; gap: 0.2ch; min-width: 0; }
.ui-typeahead-status { display: flex; align-items: center; gap: 0.75ch; min-height: 1.2em; }
.ui-typeahead-loading { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-typeahead-error { color: var(--ui-danger-fg, #cf9893); font-size: 0.85em; }
.ui-typeahead-retry {
    border: 1px solid var(--ui-border, currentColor);
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0 0.5ch;
    cursor: pointer;
}
.ui-field-group[data-invalid="true"] .ui-field-group-label { color: var(--ui-danger-fg, #cf9893); }
.ui-search-field .ui-field-icon { color: var(--ui-muted-fg, inherit); }

.ui-avatar {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    overflow: hidden;
    background: var(--ui-avatar-bg, var(--ui-tone-bg, transparent));
    color: var(--ui-avatar-fg, inherit);
    font-weight: 600;
    line-height: 1;
}
.ui-avatar.is-circle { border-radius: 50%; }
.ui-avatar.is-square { border-radius: var(--ui-radius, 4px); }
.ui-avatar.is-xs { width: 1.6em; height: 1.6em; font-size: 0.7em; }
.ui-avatar.is-sm { width: 2em; height: 2em; font-size: 0.8em; }
.ui-avatar.is-md { width: 2.6em; height: 2.6em; font-size: 1em; }
.ui-avatar.is-lg { width: 3.4em; height: 3.4em; font-size: 1.2em; }
.ui-avatar-image { width: 100%; height: 100%; object-fit: cover; }
.ui-avatar-status {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 0.55em;
    height: 0.55em;
    border-radius: 50%;
    background: var(--ui-muted-fg, currentColor);
}
.ui-avatar.is-online .ui-avatar-status { background: var(--ui-success-fg, currentColor); }
.ui-avatar.is-away .ui-avatar-status { background: var(--ui-warning-fg, currentColor); }
.ui-avatar.is-busy .ui-avatar-status { background: var(--ui-danger-fg, currentColor); }

.ui-pagination { display: inline-flex; align-items: center; gap: 0.35ch; }
.ui-pagination-pages { display: inline-flex; align-items: center; gap: 0.25ch; }
.ui-pagination-node { display: inline-flex; }
.ui-pagination-page,
.ui-pagination-step {
    min-width: 2ch;
    padding: 0 0.5ch;
    border: 1px solid transparent;
    border-radius: var(--ui-radius, 4px);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}
.ui-pagination-page:hover,
.ui-pagination-step:hover:not(:disabled) { border-color: var(--ui-border, currentColor); }
.ui-pagination-page.is-current {
    border-color: var(--ui-tone-border, currentColor);
    color: var(--ui-tone-fg, inherit);
    font-weight: 600;
}
.ui-pagination-step:disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-pagination-ellipsis { color: var(--ui-muted-fg, inherit); }

.ui-data-table {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid transparent;
    border-radius: var(--ui-radius, 4px);
}
.ui-data-table-scroll { overflow-x: auto; min-width: 0; }
.ui-data-table-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.ui-data-table > .ui-pagination { margin-top: 0.35em; }
.ui-data-table.is-bordered { border-color: var(--ui-border, currentColor); }
.ui-data-table-head,
.ui-data-table-row {
    display: flex;
    align-items: baseline;
    gap: 1ch;
    padding: 0.15em 0.5ch;
}
.ui-data-table.is-dense .ui-data-table-head,
.ui-data-table.is-dense .ui-data-table-row { padding: 0 0.5ch; }
.ui-data-table-head { color: var(--ui-muted-fg, inherit); font-weight: 600; }
.ui-data-table.is-striped .ui-data-table-row:nth-child(even) { background: var(--ui-stripe-bg, transparent); }
.ui-data-table-row[role="row"] { cursor: default; }
.ui-data-table-row.is-selected { background: var(--ui-selected-bg, transparent); }
.ui-data-table-cell { min-width: 0; }
.ui-data-table-cell.is-center { text-align: center; }
.ui-data-table-cell.is-right { text-align: right; }
.ui-data-table-cell.is-fixed-left,
.ui-data-table-cell.is-fixed-right { position: sticky; z-index: 2; background: var(--ui-data-table-fixed-bg, var(--ui-card-bg, var(--ui-bg, inherit))); }
.ui-data-table-cell.is-fixed-left { left: var(--ui-sticky-offset, 0px); }
.ui-data-table-cell.is-fixed-right { right: var(--ui-sticky-offset, 0px); }
.ui-data-table-head .ui-data-table-cell.is-fixed-left,
.ui-data-table-head .ui-data-table-cell.is-fixed-right { z-index: 3; }
.ui-data-table-sep { display: none; }
.ui-data-table-empty,
.ui-data-table-loading { padding: 0.5ch; color: var(--ui-muted-fg, inherit); }
.ui-data-table-loading { text-align: center; }
.ui-data-table-caption {
    padding: 0.25ch 0.5ch;
    color: var(--ui-muted-fg, inherit);
    font-size: 0.9em;
}
.ui-data-table-head.is-sticky {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--ui-data-table-head-bg, var(--ui-card-bg, var(--ui-bg, inherit)));
}
.ui-data-table-resizer { display: inline-block; width: 0.6ch; height: 0.9em; margin-left: 0.5ch; vertical-align: middle; border-left: 1px solid var(--ui-border, currentColor); cursor: col-resize; }
.ui-data-table-resizer:hover { border-color: var(--ui-current-fg, currentColor); }
.ui-data-table-sortable { cursor: pointer; user-select: none; }
.ui-data-table-sortable:hover { color: var(--ui-current-fg, inherit); }
.ui-data-table-sortable:focus-visible {
    outline: 2px solid var(--ui-focus-ring, currentColor);
    outline-offset: -1px;
}
.ui-data-table-sortable.is-sorted-asc::after { content: ' ▲'; font-size: 0.8em; }
.ui-data-table-sortable.is-sorted-desc::after { content: ' ▼'; font-size: 0.8em; }
.ui-data-table-select {
    flex: 0 0 auto;
    width: 3ch;
    text-align: center;
}
.ui-data-table-row-group { display: contents; }
.ui-data-table-expand { flex: 0 0 auto; width: 3ch; text-align: center; }
.ui-data-table-expander { cursor: pointer; user-select: none; }
.ui-data-table-expander:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
.ui-data-table-detail-row { display: flex; padding: 0 0.5ch 0.25em; }
.ui-data-table-detail { display: flex; flex-direction: column; gap: 0.1ch; min-width: 0; color: var(--ui-muted-fg, inherit); }
.ui-data-table-detail-line { white-space: pre-wrap; overflow-wrap: anywhere; }
.ui-data-table-check { cursor: pointer; user-select: none; }
.ui-data-table-check:focus-visible {
    outline: 2px solid var(--ui-focus-ring, currentColor);
    outline-offset: 1px;
}

.ui-tree { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.ui-tree-node { display: block; min-width: 0; }
.ui-tree-row {
    display: inline-flex;
    align-items: center;
    gap: 0.35ch;
    min-width: 0;
    padding: 0 0.25ch;
    border-radius: var(--ui-radius, 4px);
    cursor: pointer;
}
.ui-tree-node.is-selected > .ui-tree-row { background: var(--ui-selected-bg, transparent); }
.ui-tree-node.is-disabled > .ui-tree-row { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-tree-indent { white-space: pre; }
.ui-tree-toggle { width: 1ch; flex: none; }
.ui-tree-toggle.is-leaf { visibility: hidden; }
.ui-tree-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-tree-badge { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }

.ui-field-required { color: var(--ui-danger-fg, inherit); margin-left: 0.2ch; }
.ui-field-textarea { resize: vertical; min-height: 3em; }
.ui-field-error { color: var(--ui-danger-fg, inherit); font-size: 0.85em; }
.ui-text-field.has-error .ui-field-row { border-color: var(--ui-danger-fg, currentColor); }

.ui-checkbox,
.ui-switch {
    display: inline-flex;
    align-items: center;
    gap: 0.5ch;
    cursor: pointer;
}
.ui-checkbox.is-disabled,
.ui-switch.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-checkbox-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.2em;
    height: 1.2em;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 3px);
}
.ui-checkbox.is-checked .ui-checkbox-box { border-color: var(--ui-tone-border, currentColor); }
.ui-switch-track {
    display: inline-flex;
    align-items: center;
    width: 2.2em;
    height: 1.2em;
    padding: 0 0.15em;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius-pill, 999px);
}
.ui-switch-thumb {
    width: 0.8em;
    height: 0.8em;
    border-radius: 50%;
    background: var(--ui-muted-fg, currentColor);
    transition: transform 120ms ease, background 120ms ease;
}
.ui-switch.is-checked .ui-switch-thumb {
    transform: translateX(0.9em);
    background: var(--ui-tone-bg, currentColor);
}
.ui-switch-state { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }

.ui-radio-group { display: flex; flex-direction: column; gap: 0.25ch; }
.ui-radio-option {
    display: inline-flex;
    align-items: baseline;
    gap: 0.5ch;
    cursor: pointer;
    padding: 0 0.25ch;
    border-radius: var(--ui-radius, 4px);
}
.ui-radio-option:hover { background: var(--ui-hover-bg, transparent); }
.ui-radio-option.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-radio-copy { display: inline-flex; flex-direction: column; min-width: 0; }
.ui-radio-description { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }

.ui-alert {
    display: flex;
    align-items: flex-start;
    gap: 0.6ch;
    padding: 0.6ch 0.8ch;
    border: 1px solid var(--ui-border, currentColor);
    border-left-width: 3px;
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-alert-bg, transparent);
    color: var(--ui-alert-fg, inherit);
}
.ui-alert.is-success { border-left-color: var(--ui-success-fg, currentColor); }
.ui-alert.is-warning { border-left-color: var(--ui-warning-fg, currentColor); }
.ui-alert.is-danger,
.ui-alert.is-error { border-left-color: var(--ui-danger-fg, currentColor); }
.ui-alert.is-accent { border-left-color: var(--ui-accent-fg, currentColor); }
.ui-alert-body { display: flex; flex-direction: column; gap: 0.15ch; flex: 1 1 auto; min-width: 0; }
.ui-alert-title { font-weight: 600; }
.ui-alert-line { white-space: pre-wrap; }
.ui-alert-action,
.ui-alert-close {
    flex: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius, 4px);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0 0.5ch;
}
.ui-alert-action:hover,
.ui-alert-close:hover { border-color: var(--ui-border, currentColor); }

.ui-select-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5ch;
    min-width: 0;
    padding: 0.1em 0.6ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-select-bg, transparent);
    color: inherit;
    cursor: pointer;
}
.ui-select-trigger.is-open { border-color: var(--ui-tone-border, currentColor); }
.ui-select-trigger.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-select-value {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ui-select-clear {
    flex: none;
    border: 0;
    background: transparent;
    color: var(--ui-muted-fg, inherit);
    cursor: pointer;
    font: inherit;
    padding: 0 0.15ch;
}
.ui-select-arrow { flex: none; color: var(--ui-muted-fg, inherit); }

.ui-kbd { display: inline-flex; align-items: center; gap: 0.2ch; }
.ui-kbd-node { display: contents; }
.ui-kbd-key {
    display: inline-block;
    min-width: 1.4em;
    padding: 0 0.35ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 3px);
    background: var(--ui-kbd-bg, transparent);
    color: inherit;
    font-family: var(--ui-mono-font, monospace);
    font-size: 0.85em;
    text-align: center;
}
.ui-kbd-separator { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }

.ui-scrollbar { display: inline-flex; flex-direction: column; line-height: 1; }
.ui-scrollbar.is-vertical .ui-scrollbar-rail { display: flex; flex-direction: column; }
.ui-scrollbar.is-horizontal .ui-scrollbar-track { display: inline-flex; white-space: nowrap; }
.ui-scrollbar-track-cell { color: var(--ui-muted-fg, inherit); }
.ui-scrollbar-thumb { color: var(--ui-tone-fg, inherit); }
.ui-scrollbar-rail .ui-scrollbar-track-cell,
.ui-scrollbar-rail .ui-scrollbar-thumb { display: block; }
`;

export function installUiStyles(doc?: Document | null): void {
    installStyleSheet(doc, UI_STYLE_ID, UI_CSS);
}

/** Install only the bare-button reset (dialog/alert widgets call this). */
export function installPlainButtonStyles(doc?: Document | null): void {
    installStyleSheet(doc, PLAIN_BUTTON_STYLE_ID, PLAIN_BUTTON_CSS);
}
