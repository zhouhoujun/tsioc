import { installStyleSheet } from '../../src/styles';

export const CASCADER_STYLE_ID = 'tsdi-cascader-styles';

export const CASCADER_CSS = `
.ui-cascader { position: relative; display: inline-flex; flex-direction: column; min-width: 16ch; border: 1px solid var(--ui-border, currentColor); border-radius: var(--ui-radius, 4px); background: var(--ui-field-bg, transparent); }
.ui-cascader:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
.ui-cascader-trigger { display: flex; align-items: center; justify-content: space-between; gap: 1ch; padding: 0.15em 0.6ch; cursor: pointer; }
.ui-cascader-value.is-placeholder,
.ui-cascader-caret { color: var(--ui-muted-fg, inherit); }
.ui-cascader-panel {
    position: absolute;
    z-index: 24;
    left: 0;
    top: calc(100% + 2px);
    display: flex;
    max-height: 16em;
    overflow-y: auto;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-popover-bg, var(--ui-dialog-bg, var(--ui-bg, inherit)));
}
.ui-cascader-column { display: flex; flex-direction: column; min-width: 12ch; border-right: 1px solid var(--ui-border, currentColor); }
.ui-cascader-column:last-child { border-right: 0; }
.ui-cascader-column-title { padding: 0.1em 0.6ch; color: var(--ui-muted-fg, inherit); font-weight: 600; }
.ui-cascader-option { display: flex; align-items: center; justify-content: space-between; gap: 1ch; padding: 0.1em 0.6ch; cursor: pointer; color: inherit; }
.ui-cascader-option.is-active { background: var(--ui-selected-bg, transparent); color: var(--ui-current-fg, inherit); font-weight: 600; }
.ui-cascader-option.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-cascader-option-caret { color: var(--ui-muted-fg, inherit); }
`;

export function installCascaderStyles(doc?: Document | null): void {
    installStyleSheet(doc, CASCADER_STYLE_ID, CASCADER_CSS);
}
