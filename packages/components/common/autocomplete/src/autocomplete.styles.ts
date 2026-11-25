import { installStyleSheet } from '../../src/styles';

export const AUTOCOMPLETE_STYLE_ID = 'tsdi-autocomplete-styles';

export const AUTOCOMPLETE_CSS = `
.ui-autocomplete { position: relative; display: inline-flex; flex-direction: column; min-width: 18ch; }
.ui-autocomplete-input {
    width: 100%;
    padding: 0.15em 0.6ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-field-bg, transparent);
    color: inherit;
    font: inherit;
}
.ui-autocomplete-input:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
.ui-autocomplete-panel {
    position: absolute;
    z-index: 23;
    left: 0;
    right: 0;
    top: calc(100% + 2px);
    max-height: 14em;
    overflow-y: auto;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-popover-bg, var(--ui-dialog-bg, var(--ui-bg, inherit)));
}
.ui-autocomplete-option { display: flex; align-items: baseline; gap: 0.5ch; padding: 0.1em 0.6ch; cursor: pointer; color: inherit; }
.ui-autocomplete-option.is-active { background: var(--ui-selected-bg, transparent); color: var(--ui-current-fg, inherit); font-weight: 600; }
.ui-autocomplete-option.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-autocomplete-description,
.ui-autocomplete-empty { color: var(--ui-muted-fg, inherit); }
.ui-autocomplete-empty { display: block; padding: 0.1em 0.6ch; }
`;

export function installAutocompleteStyles(doc?: Document | null): void {
    installStyleSheet(doc, AUTOCOMPLETE_STYLE_ID, AUTOCOMPLETE_CSS);
}
