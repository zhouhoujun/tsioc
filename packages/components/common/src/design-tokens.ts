/**
 * Shared semantic tokens for the common component skins.
 *
 * Hosts can override any `--ui-*` token at their application root; component
 * variables keep their own `--ui-component-*` fallbacks. Keeping these values
 * in one sheet gives browser and terminal skins the same density, motion,
 * elevation and focus hierarchy.
 */
export const UI_DESIGN_TOKENS = `
:root {
    --ui-font-family: var(--ui-font-sans, system-ui, -apple-system, "Segoe UI", sans-serif);
    --ui-font-size-body: 14px;
    --ui-font-size-label: 12px;
    --ui-font-size-caption: 11px;
    --ui-line-height: 1.45;
    --ui-space-1: 4px;
    --ui-space-2: 8px;
    --ui-space-3: 12px;
    --ui-space-4: 16px;
    --ui-radius-sm: 4px;
    --ui-radius-md: 8px;
    --ui-radius-lg: 12px;
    --ui-elevation-1: 0 1px 2px rgba(15, 23, 42, 0.12);
    --ui-elevation-2: 0 8px 24px rgba(15, 23, 42, 0.18);
    --ui-focus-ring-width: 2px;
    --ui-focus-ring-offset: 1px;
}
`;
