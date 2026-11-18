import { installStyleSheet } from './styles';

/**
 * Default skin for the generic UI primitives. All colors stay themeable
 * through `--ui-*` variables; hosts may also ignore this sheet entirely and
 * style the stable classes themselves.
 */
export const UI_STYLE_ID = 'tsdi-ui-styles';

export const UI_CSS = `
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
`;

export function installUiStyles(doc?: Document | null): void {
    installStyleSheet(doc, UI_STYLE_ID, UI_CSS);
}
