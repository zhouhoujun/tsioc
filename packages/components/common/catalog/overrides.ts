import type { WidgetCatalogEntry } from './types';

type CatalogOverride = Partial<Pick<WidgetCatalogEntry, 'summary' | 'keyboard' | 'surfaces' | 'examples' | 'attributes'>>;

/** Hand-written quality metadata for core widgets; generated data fills the rest. */
export const CATALOG_OVERRIDES: Record<string, CatalogOverride> = {
    dialog: {
        summary: 'Renderer-neutral dialog shell with fixed title/hint and a single scrolling body.',
        keyboard: [
            'Escape: close/dismiss (host may map to deny/reject)',
            'Tab/Shift+Tab: move within projected content (host focus trap)',
            'Enter: activate the highlighted/primary action',
            'Arrow/PageUp/PageDown: scroll only the dialog body'
        ],
        surfaces: {
            html: 'Rendered above the composer; header/footer fixed, body scrolls.',
            console: 'Overlay panel anchored above the input; rows are windowed, title/hint stay painted.'
        },
        examples: [
            { title: 'Confirm dialog', props: { title: 'Delete file?', hint: 'Enter confirm · Esc cancel', lines: ['This cannot be undone.'] } }
        ]
    },
    select: {
        summary: 'Windowed single/multi selection list with search, detail lines and a fixed title/hint.',
        keyboard: [
            'Arrow/Home/End: move selection',
            'PageUp/PageDown: move by a page',
            'Enter: accept the highlighted option',
            'Escape: close without selection',
            'Typing: filters/creates when the host enables search'
        ],
        surfaces: {
            html: 'Anchored listbox; click selects; hover mirrors the selection.',
            console: 'Floating overlay above the composer; only visible rows are painted.'
        },
        examples: [
            { title: 'Security level', props: { title: 'Security level', options: [{ label: 'ask', value: 'ask' }, { label: 'auto', value: 'auto' }], visibleCount: 4 } }
        ]
    },
    'data-table': {
        summary: 'Accessible table with sorting, pagination, selection, expandable rows, sticky/resizable columns, async page source and opt-in virtual windowing.',
        keyboard: [
            'Tab/Shift+Tab: move between interactive headers/cells',
            'Enter/Space: sort header, select row, expand row',
            'Home/End: first/last interactive column'
        ],
        surfaces: {
            html: 'Sticky header/footer, horizontal scroll; selection via checkbox/row click.',
            console: 'Fixed header + windowed rows; horizontal overflow follows the terminal width.'
        },
        examples: [
            { title: 'Sortable table', props: { caption: 'Runs', columns: [{ key: 'name', label: 'Name', sortable: true }], rows: [{ id: '1', name: 'build' }] } },
            { title: 'Server pagination', props: { caption: 'Runs', pagination: true, pageSize: 2, columns: [{ key: 'name', label: 'Name', sortable: true }], source: 'Host-provided loadPage(request, signal) → { rows, total }' } }
        ]
    },
    field: {
        summary: 'Form-field wrapper with label, hint, error, required marker and aria linkage.',
        keyboard: [
            'Tab/Shift+Tab: enter/leave the projected control',
            'Host control keeps its native keyboard semantics'
        ],
        surfaces: {
            html: 'Label uses for=controlId; hint/error are referenced by aria-describedby.',
            console: 'Renders the same label/hint/error rows above/below the projected control.'
        },
        examples: [
            { title: 'Required field', props: { label: 'Name', hint: 'Shown to teammates', required: true, controlId: 'name' } }
        ]
    },
    'command-palette': {
        summary: 'Overlay command palette composed from ui-search-list and the shared overlay stack.',
        keyboard: [
            'Type: filter commands locally or call source(query, signal)',
            'Arrow/Home/End: move the active command',
            'Enter: run the active command',
            'Escape/backdrop: close unless beforeCloseAction vetoes'
        ],
        surfaces: {
            html: 'Fixed backdrop + centered panel; the search list keeps aria-activedescendant.',
            console: 'Host paints the same panel above the composer; input focus stays in the list.'
        },
        examples: [
            {
                title: 'Command palette',
                props: {
                    open: true,
                    title: 'Command palette',
                    hint: 'enter run   esc close',
                    recentIds: ['deploy'],
                    items: [
                        { id: 'deploy', label: 'Deploy', group: 'Run', shortcut: 'Ctrl+D' },
                        { id: 'delete', label: 'Delete session', group: 'Session' }
                    ]
                }
            }
        ]
    },
    'inline-input': {
        summary: 'Click-to-edit inline value used by tab/session/task titles with Enter/blur commit and Escape cancel.',
        keyboard: [
            'Enter/Space on the value: begin editing',
            'Enter: commit and notify changeAction/submitAction',
            'Escape: cancel and restore the previous value',
            'Blur: commit (submitOnBlur defaults to true)'
        ],
        surfaces: {
            html: 'Real input with focus/select on edit; the host persists the value.',
            console: 'Host renders the same editable row and routes Enter/Escape through the shared input model.'
        },
        examples: [
            { title: 'Session title', props: { value: 'Fix login flow', editLabel: 'Rename session' } }
        ]
    },
    'search-list': {
        summary: 'Searchable list/command palette with local filtering, grouped rows, recent items and an abortable async source.',
        keyboard: [
            'ArrowDown/ArrowUp: move the active option',
            'Home/End: first/last option',
            'Enter: choose the active option',
            'Escape: request close',
            'Typing: filters locally or calls source(query, signal)'
        ],
        surfaces: {
            html: 'Input plus grouped listbox; active row uses aria-activedescendant.',
            console: 'Host renders the same rows in its overlay window; input keeps focus.'
        },
        examples: [
            {
                title: 'Command list',
                props: {
                    placeholder: 'Search commands…',
                    recentIds: ['deploy'],
                    items: [
                        { id: 'deploy', label: 'Deploy', group: 'Run', shortcut: 'Ctrl+D' },
                        { id: 'delete', label: 'Delete session', group: 'Session' }
                    ]
                }
            }
        ]
    },
    typeahead: {
        summary: 'Async combobox over the shared autocomplete input with abortable source, loading/error/retry.',
        keyboard: [
            'Arrow/Home/End: move the active option',
            'Enter: accept the active option',
            'Escape: close suggestions',
            'Typing: calls source(query, signal); stale responses are ignored'
        ],
        surfaces: {
            html: 'Suggestions render below the input; retry button is focusable.',
            console: 'Uses the shared select overlay/window; loading/error rows stay above the input.'
        },
        examples: [
            { title: 'Async search', props: { placeholder: 'Search sessions…', ariaLabel: 'Search sessions', minChars: 2 } }
        ]
    },
    'dynamic-form': {
        summary: 'Schema-driven form with typed values, groups, visibility, validation and custom widgets.',
        keyboard: [
            'Tab/Shift+Tab: move between fields',
            'Enter: submit when the field does not consume it',
            'Escape: cancel/close host dialog',
            'Arrow keys: select options/segmented values'
        ],
        surfaces: {
            html: 'Native inputs/selects; errors and hints are aria-described.',
            console: 'Floating field windows; selects use the shared overlay row model.'
        },
        examples: [
            { title: 'Basic settings', props: { schema: { fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'enabled', label: 'Enabled', type: 'switch' }] } } }
        ]
    }
};
