/** Keyboard shortcut rows shown by the designer help overlay. */
export function workflowShortcutRows(
    t: (key: string, fallback: string) => string
): Array<{ action: string; keys: string }> {
    return [
        { action: t('save', 'Save'), keys: 'Ctrl+S' },
        { action: t('library', 'Workflows'), keys: 'Ctrl+O' },
        { action: t('run', 'Run'), keys: 'Ctrl+Enter' },
        { action: t('findNode', 'Find node'), keys: 'Ctrl+F' },
        { action: t('undo', 'Undo'), keys: 'Ctrl+Z' },
        { action: t('redo', 'Redo'), keys: 'Ctrl+Y' },
        { action: t('duplicate', 'Duplicate'), keys: 'Ctrl+D' },
        { action: t('copy', 'Copy'), keys: 'Ctrl+C' },
        { action: t('cut', 'Cut'), keys: 'Ctrl+X' },
        { action: t('paste', 'Paste'), keys: 'Ctrl+V' },
        { action: t('toggleNode', 'Enable/disable node'), keys: 'Ctrl+E' },
        { action: t('boxSelect', 'Box select'), keys: 'Shift+drag' },
        { action: t('quickAdd', 'Quick add node'), keys: 'Ctrl+K' },
        { action: t('groupSelection', 'Group selection'), keys: 'Ctrl+G' },
        { action: t('ungroup', 'Ungroup'), keys: 'Ctrl+Shift+G' },
        { action: t('delete', 'Delete'), keys: 'Delete' },
        { action: t('zoomPan', 'Zoom / pan'), keys: 'Ctrl+Wheel / Wheel' },
        { action: t('shortcuts', 'Keyboard shortcuts'), keys: '?' }
    ];
}
