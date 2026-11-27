import { installStyleSheet } from '../../src/styles';

/**
 * Default skin for the generic accordion.
 *
 * Hosts keep their own palette: every color, radius, padding and type value is
 * a `--ui-accordion-*` variable with a sensible fallback. The workflow palette
 * maps those variables to its theme tokens instead of restyling the header.
 */
export const ACCORDION_STYLE_ID = 'tsdi-accordion-styles';

export const ACCORDION_CSS = `
ui-accordion {
    display: block;
    min-width: 0;
}

.ui-accordion-heading { display: contents; }
.ui-accordion {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.ui-accordion-header {
    display: flex;
    align-items: center;
    gap: var(--ui-accordion-gap, 6px);
    width: 100%;
    box-sizing: border-box;
    margin: var(--ui-accordion-margin, 0);
    min-height: var(--ui-accordion-min-height, 40px);
    padding: var(--ui-accordion-padding, 10px 12px);
    border: 1px solid transparent;
    border-radius: var(--ui-accordion-radius, 8px);
    background: var(--ui-accordion-background, transparent);
    color: var(--ui-accordion-title-color, var(--ui-text, inherit));
    font: inherit;
    font-size: var(--ui-accordion-font-size, 14px);
    font-weight: var(--ui-accordion-font-weight, 500);
    letter-spacing: var(--ui-accordion-letter-spacing, normal);
    text-transform: var(--ui-accordion-text-transform, none);
    text-align: left;
    cursor: pointer;
    transition:
        background-color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        border-color var(--ui-motion-fast, 120ms) var(--ui-ease, ease),
        color var(--ui-motion-fast, 120ms) var(--ui-ease, ease);
}

.ui-accordion-header:hover {
    background: var(--ui-accordion-hover-background, var(--ui-hover-bg, transparent));
    border-color: var(--ui-accordion-hover-border, var(--ui-border, transparent));
    color: var(--ui-accordion-hover-color, var(--ui-text, inherit));
}

.ui-accordion-header:focus-visible {
    outline: 2px solid var(--ui-accordion-focus-ring, var(--ui-focus-ring, currentColor));
    outline-offset: 1px;
}

.ui-accordion-header:disabled {
    cursor: default;
    opacity: var(--ui-disabled-opacity, 0.55);
}

.ui-accordion.is-sm .ui-accordion-header {
    min-height: 0;
    padding: var(--ui-accordion-padding, 5px 6px);
    border-radius: var(--ui-accordion-radius, 6px);
    color: var(--ui-accordion-title-color, var(--ui-muted, #64748b));
    font-size: var(--ui-accordion-font-size, 10px);
    font-weight: var(--ui-accordion-font-weight, 700);
    letter-spacing: var(--ui-accordion-letter-spacing, 0.08em);
    text-transform: var(--ui-accordion-text-transform, uppercase);
}

.ui-accordion.is-card {
    border: 1px solid var(--ui-accordion-card-border, var(--ui-border, currentColor));
    border-radius: var(--ui-accordion-card-radius, 10px);
    background: var(--ui-accordion-card-background, var(--ui-surface, transparent));
    overflow: hidden;
}

.ui-accordion.is-plain .ui-accordion-body {
    padding: 0;
}

.ui-accordion-caret {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: var(--ui-accordion-caret-width, 14px);
    height: var(--ui-accordion-caret-width, 14px);
    color: var(--ui-accordion-caret-color, currentColor);
    /* The glyph stays in the DOM for non-CSS renderers; HTML paints the
       larger chevron below instead of the tiny triangle character. */
    font-size: 0;
    line-height: 1;
}

.ui-accordion-caret::before {
    content: '';
    box-sizing: border-box;
    width: var(--ui-accordion-caret-mark, 8px);
    height: var(--ui-accordion-caret-mark, 8px);
    border-right: var(--ui-accordion-caret-stroke, 2px) solid currentColor;
    border-bottom: var(--ui-accordion-caret-stroke, 2px) solid currentColor;
    transform: rotate(45deg);
    transition: transform var(--ui-motion-fast, 120ms) var(--ui-ease, ease);
}

.ui-accordion[data-expanded="false"] .ui-accordion-caret::before {
    transform: rotate(-45deg);
}

.ui-accordion-title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ui-accordion-count {
    flex: 0 0 auto;
    min-width: var(--ui-accordion-count-min-width, 18px);
    padding: var(--ui-accordion-count-padding, 0 5px);
    border-radius: var(--ui-accordion-count-radius, 999px);
    background: var(--ui-accordion-count-background, var(--ui-surface-alt, transparent));
    color: var(--ui-accordion-count-color, var(--ui-muted, inherit));
    font-size: var(--ui-accordion-count-size, 9px);
    line-height: var(--ui-accordion-count-line-height, 16px);
    letter-spacing: 0;
    text-align: center;
}

.ui-accordion-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: var(--ui-accordion-body-padding, 2px 12px 12px 34px);
    animation: ui-accordion-reveal var(--ui-motion-fast, 140ms) var(--ui-ease, ease);
}

.ui-accordion.is-sm .ui-accordion-body {
    padding: var(--ui-accordion-body-padding, 0);
}

@keyframes ui-accordion-reveal {
    from { opacity: 0; transform: translateY(-3px); }
    to { opacity: 1; transform: translateY(0); }
}

.ui-accordion-item {
    display: flex;
    align-items: center;
    gap: var(--ui-accordion-item-gap, 8px);
    min-width: 0;
}

.ui-accordion-item.is-disabled {
    cursor: default;
    opacity: var(--ui-disabled-opacity, 0.55);
}

.ui-accordion-item-icon {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: var(--ui-accordion-item-icon-size, 20px);
    height: var(--ui-accordion-item-icon-size, 20px);
    border-radius: var(--ui-accordion-item-icon-radius, 5px);
    background: var(--ui-accordion-item-icon-background, var(--ui-surface-alt, transparent));
    color: var(--ui-accordion-item-icon-color, inherit);
}

.ui-accordion-item-text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}

.ui-accordion-item-label {
    font-size: var(--ui-accordion-item-label-size, inherit);
    font-weight: var(--ui-accordion-item-label-weight, 600);
    color: var(--ui-accordion-item-label-color, inherit);
}

.ui-accordion-item-description {
    overflow: hidden;
    font-size: var(--ui-accordion-item-description-size, 11px);
    color: var(--ui-accordion-item-description-color, var(--ui-muted, #64748b));
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ui-accordion-item-badge {
    flex: 0 0 auto;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--ui-accordion-item-badge-background, var(--ui-surface-alt, transparent));
    color: var(--ui-accordion-item-badge-color, var(--ui-muted, inherit));
    font-size: 10px;
    line-height: 16px;
}

@media (prefers-reduced-motion: reduce) {
    .ui-accordion-header,
    .ui-accordion-caret::before {
        transition: none;
    }
    .ui-accordion-body {
        animation: none;
    }
}
`;

/** Install the shared accordion skin once per document (idempotent). */
export function installAccordionStyles(doc?: Document | null): void {
    installStyleSheet(doc, ACCORDION_STYLE_ID, ACCORDION_CSS);
}
