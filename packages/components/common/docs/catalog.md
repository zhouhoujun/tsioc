# @tsdi/components/common catalog

## accordion

- selector: `ui-accordion`
- Generic collapsible section with optional icon rows.

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| className |  | '' |
| controlled | boolean |  |
| count | number \| string | '' |
| disabled | boolean |  |
| draggable | boolean |  |
| dragStartAction | (event: any, item: any) => void |  |
| expanded | boolean |  |
| expandedChange |  | new EventEmitter<boolean>() |
| items | AccordionItem[] | [] |
| selectAction | (item: any) => void |  |
| title |  | '' |
| toggleAction | (expanded: boolean) => void |  |

## alert

- selector: `ui-alert-dialog`
- Renderer-neutral alert dialog. Uses the shared dialog chrome classes but

| attribute | type | default |
| --- | --- | --- |
| acceptAction | () => void |  |
| actionLabel |  | 'OK' |
| ariaDescribedby |  | '' |
| ariaLabel |  | '' |
| ariaLabelledby |  | '' |
| closable | boolean |  |
| closeAction | () => void |  |
| closeLabel |  | '✕' |
| closeOnEscape | boolean |  |
| hint |  | '' |
| horizontalChrome |  | 6 |
| lines | string[] | [] |
| maxHeight |  | '60vh' |
| maxWidth |  | 88 |
| minWidth |  | 24 |
| modal | boolean |  |
| title |  | '' |
| tone | 'info' \| 'success' \| 'warning' \| 'error' | 'info' |

## alert-notice

- selector: `ui-alert`
- Inline alert/callout (not a modal). The host decides when it is visible;

| attribute | type | default |
| --- | --- | --- |
| action | () => void |  |
| actionLabel |  | '' |
| className |  | '' |
| closeAction | () => void |  |
| closeLabel |  | 'Dismiss' |
| dismissible | boolean |  |
| icon |  | '' |
| iconGlyph |  | '' |
| lines | string[] | [] |
| title |  | '' |
| tone | UiTone |  |

## autocomplete

- selector: `ui-autocomplete`
- Combobox with host-filtered suggestions (Ant Design AutoComplete).

| attribute | type | default |
| --- | --- | --- |
| ariaDescribedby |  | '' |
| ariaInvalid |  | '' |
| ariaLabel |  | 'Search' |
| changeAction | (value: string) => void |  |
| className |  | '' |
| disabled | boolean |  |
| emptyLabel |  | 'No suggestions' |
| loading | boolean |  |
| loadingLabel |  | 'Loading…' |
| loadOptions | AutoCompleteOptionLoader |  |
| multiple | boolean |  |
| open | boolean |  |
| options | AutoCompleteOption[] | [] |
| placeholder |  | '' |
| removeAction | (value: string) => void |  |
| removeLabel |  | 'Remove' |
| selectAction | (value: string) => void |  |
| selected | number |  |
| value |  | '' |
| values | string[] | [] |

## avatar

- selector: `ui-avatar`
- Compact person/entity avatar. Uses `src` when the renderer supports images;

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| className |  | '' |
| icon |  | '' |
| iconGlyph |  | '' |
| label |  | '' |
| shape | AvatarShape | 'circle' |
| size | UiSize |  |
| src |  | '' |
| status | AvatarStatus \| '' | '' |
| tone | UiTone |  |

## badge

- selector: `ui-badge`
- Compact semantic label/pill. Use it for statuses, counts and filter chips.

| attribute | type | default |
| --- | --- | --- |
| action | () => void |  |
| active | boolean |  |
| className |  | '' |
| disabled | boolean |  |
| dot | boolean |  |
| icon |  | '' |
| iconGlyph |  | '' |
| label |  | '' |
| size | UiSize |  |
| tone | UiTone |  |
| variant | BadgeVariant | 'subtle' |

## breadcrumb

- selector: `ui-breadcrumb`
- Flat breadcrumb trail. `maxItems > 0` collapses the middle into a single

| attribute | type | default |
| --- | --- | --- |
| action | (item: BreadcrumbItem, index: number) => void |  |
| ariaLabel |  | 'Breadcrumb' |
| className |  | '' |
| ellipsis |  | '…' |
| items | BreadcrumbItem[] | [] |
| maxItems | number |  |
| separator |  | '›' |

## button

- selector: `ui-button`
- Renderer-neutral action button.

| attribute | type | default |
| --- | --- | --- |
| action | () => void |  |
| ariaLabel |  | '' |
| block | boolean |  |
| className |  | '' |
| disabled | boolean |  |
| icon |  | '' |
| iconClass |  | '' |
| iconGlyph |  | '' |
| iconOnly |  | false |
| label |  | '' |
| loading | boolean |  |
| loadingLabel |  | '' |
| pressed | boolean |  |
| shape | ButtonShape |  |
| size | UiSize |  |
| tone | UiTone |  |
| type | 'button' \| 'submit' \| 'reset' | 'button' |
| variant | ButtonVariant | 'ghost' |

## card

- selector: `ui-card`
- Generic surface card with an optional heading and action slot.

| attribute | type | default |
| --- | --- | --- |
| className |  | '' |
| dense | boolean |  |
| divider | boolean |  |
| meta |  | '' |
| subtitle |  | '' |
| title |  | '' |
| tone | UiTone |  |

## cascader

- selector: `ui-cascader`
- Hierarchical path picker (Ant Design Cascader).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Cascader' |
| changeAction | (path: string[], nodes: CascaderOption[]) => void |  |
| className |  | '' |
| disabled | boolean |  |
| options | CascaderOption[] | [] |
| placeholder |  | 'Select…' |
| value | string[] |  |

## checkbox

- selector: `ui-checkbox`
- Renderer-neutral checkbox. Uses a semantic `role="checkbox"` control instead

| attribute | type | default |
| --- | --- | --- |
| changeAction | (checked: boolean) => void |  |
| checked | boolean |  |
| className |  | '' |
| disabled | boolean |  |
| label |  | '' |

## chip

- selector: `ui-chip`
- Removable/actionable compact entity (Ant Design Tag closable / MUI Chip).

| attribute | type | default |
| --- | --- | --- |
| action | () => void |  |
| ariaLabel |  | '' |
| avatar |  | '' |
| className |  | '' |
| closable | boolean |  |
| closeLabel |  | 'Remove' |
| disabled | boolean |  |
| icon |  | '' |
| iconGlyph |  | '' |
| label |  | '' |
| removeAction | () => void |  |
| selected | boolean |  |
| size | UiSize |  |
| tone | UiTone |  |
| variant | ChipVariant |  |

## command-palette

- selector: `ui-command-palette`
- Overlay command palette composed from ui-search-list and the shared overlay stack.

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Command palette' |
| beforeCloseAction | (() => boolean \| Promise<boolean>) \| undefined | undefined |
| changeAction | ((query: string) => void) \| undefined | undefined |
| className |  | '' |
| closable | boolean |  |
| closeAction | (() => void) \| undefined | undefined |
| closeLabel |  | '✕' |
| emptyLabel |  | 'No matching commands' |
| hint |  | '' |
| items | SearchListItem[] | [] |
| loadingLabel |  | 'Searching…' |
| maxVisible |  | 12 |
| minChars |  | 0 |
| open | boolean |  |
| openChange |  | new EventEmitter<boolean>() |
| overlayEnabled | boolean |  |
| placeholder |  | 'Type a command…' |
| recentIds | string[] | [] |
| retryLabel |  | 'Retry' |
| scrollLock | boolean |  |
| selectAction | ((item: SearchListItem) => void) \| undefined | undefined |
| source | SearchListSource \| undefined | undefined |
| title |  | '' |

Keyboard:

- Type: filter commands locally or call source(query, signal)
- Arrow/Home/End: move the active command
- Enter: run the active command
- Escape/backdrop: close unless beforeCloseAction vetoes

## data-table

- selector: `ui-data-table`
- Accessible table with sorting, pagination, selection, expandable rows, sticky/resizable columns, async page source and opt-in virtual windowing.

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Table' |
| bordered | boolean |  |
| caption |  | '' |
| className |  | '' |
| clearFiltersLabel |  | 'Clear filters' |
| collapseLabel |  | 'Collapse row' |
| columnChangeAction | (state: DataTableColumnState) => void |  |
| columnOrder | string[] | [] |
| columns | DataTableColumn[] | [] |
| columnWidths | Record<string, number> | {} |
| dense | boolean |  |
| detailLines | (row: DataTableRow, index: number) => string[] |  |
| emptyLabel |  | '' |
| errorLabel |  | 'Failed to load table data' |
| expandable | boolean |  |
| expandAction | (key: string, expanded: boolean, row: DataTableRow) => void |  |
| expandedKeys | Array<string \| number> | [] |
| expandLabel |  | 'Expand row' |
| filterAction | (filters: Record<string, string>) => void |  |
| filters | Record<string, string> | {} |
| hiddenColumns | string[] | [] |
| keyboardNavigation | boolean |  |
| loading | boolean |  |
| loadingLabel |  | 'Loading…' |
| multiSort | boolean |  |
| page | number \| string | 1 |
| pageChangeAction | (page: number) => void |  |
| pageSize | number \| string | 10 |
| pagination | boolean |  |
| paginationLabel |  | 'Table pagination' |
| resizableColumns | boolean |  |
| retryLabel |  | 'Retry' |
| rowAction | (row: DataTableRow, index: number) => void |  |
| rowKey | string \| ((row: DataTableRow, index: number) => string \| number) | 'id' |
| rows | DataTableRow[] | [] |
| scrollTop |  | 0 |
| selectable | boolean |  |
| selectAllLabel |  | 'Select all rows' |
| selectedKey |  | '' |
| selectedKeys | Array<string \| number> | [] |
| selectionAction | (keys: string[], rows: DataTableRow[]) => void |  |
| selectRowLabel |  | 'Select row' |
| sortAction | (key: string, direction: DataTableSortDirection) => void |  |
| sortDirection | DataTableSortDirection \| '' | '' |
| sortKey |  | '' |
| sorts | DataTableSort[] | [] |
| sortsAction | (sorts: DataTableSort[]) => void |  |
| source | DataTableSource |  |
| stickyHeader | boolean |  |
| striped | boolean |  |
| viewportHeight |  | 0 |
| virtual |  | false |
| virtualOverscan |  | 2 |
| virtualRowHeight |  | 32 |
| windowAction | (start: number, end: number, total: number) => void |  |

Keyboard:

- Tab/Shift+Tab: move between interactive headers/cells
- Enter/Space: sort header, select row, expand row
- Home/End: first/last interactive column

## descriptions

- selector: `ui-descriptions`
- Read-only key/value detail list (Ant Design Descriptions / MUI DescriptionList).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Details' |
| bordered | boolean |  |
| className |  | '' |
| columns | number |  |
| dense | boolean |  |
| emptyLabel |  | '' |
| extra |  | '' |
| groups | DescriptionGroup[] | [] |
| items | DescriptionItem[] | [] |
| layout | 'horizontal' \| 'vertical' |  |
| separatorChar |  | '─' |
| separatorWidth | number \| string | 12 |
| size | UiSize |  |
| title |  | '' |

## dialog

- selector: `ui-dialog-panel`
- Renderer-neutral dialog shell with fixed title/hint and a single scrolling body.

| attribute | type | default |
| --- | --- | --- |
| ariaDescribedby |  | '' |
| ariaLabel |  | '' |
| ariaLabelledby |  | '' |
| beforeCloseAction | () => boolean \| Promise<boolean> |  |
| className |  | '' |
| closable | boolean |  |
| closeAction | () => void |  |
| closeLabel |  | '✕' |
| closeOnEscape | boolean |  |
| fullWidth |  | false |
| hint |  | '' |
| horizontalChrome |  | 6 |
| initialFocus |  | '' |
| lineActions | Array<(() => void) \| undefined> | [] |
| lineOptionIndexes | Array<number \| undefined> | [] |
| lines | string[] | [] |
| maxHeight |  | '60vh' |
| maxWidth |  | 88 |
| minWidth |  | 24 |
| modal | boolean |  |
| overlayOpen | boolean |  |
| restoreFocus | boolean \| string | true |
| scrollLock | boolean |  |
| title |  | '' |
| trapFocus | boolean \| string | true |

Keyboard:

- Escape: close/dismiss (host may map to deny/reject)
- Tab/Shift+Tab: move within projected content (host focus trap)
- Enter: activate the highlighted/primary action
- Arrow/PageUp/PageDown: scroll only the dialog body

## divider

- selector: `ui-divider`
- Semantic separator with an optional inline label.

| attribute | type | default |
| --- | --- | --- |
| className |  | '' |
| fill | boolean |  |
| label |  | '' |
| orientation | DividerOrientation | 'horizontal' |

## drawer

- selector: `ui-drawer`
- Host-controlled side panel (Ant Design Drawer).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| beforeCloseAction | () => boolean \| Promise<boolean> |  |
| className |  | '' |
| closable | boolean |  |
| closeAction | () => void |  |
| closeLabel |  | 'Close' |
| lines | string[] | [] |
| overlayOpen | boolean |  |
| placement | DrawerPlacement | 'right' |
| scrollLock | boolean |  |
| size | number \| string | 32 |
| title |  | '' |
| visible | boolean |  |

## dynamic-form

- selector: `ui-dynamic-field-widget`
- Schema-driven form with typed values, groups, visibility, validation and custom widgets.

| attribute | type | default |
| --- | --- | --- |
| actionAction | (field: DynamicFormField, actionId: string) => void |  |
| blurAction | (field: DynamicFormField) => void |  |
| changeAction | (change: DynamicFormChange) => void |  |
| classPrefix |  | 'df' |
| component | Type<any> \| undefined |  |
| describedBy |  | '' |
| emptyLabel |  | 'No fields' |
| errorId |  | '' |
| focusFieldAction | (key: string) => void |  |
| hintId |  | '' |
| itemIndex | number |  |
| label |  | '' |
| messages | Record<string, string> | {} |
| required | boolean \| string | false |
| resetAction | (value: Record<string, any>) => void |  |
| resetFieldLabel |  | 'Reset to default' |
| resetLabel |  | '' |
| showActions |  | false |
| submitAction | (result: DynamicFormResult) => void |  |
| submitLabel |  | '' |
| validateOn | 'none' \| 'change' \| 'blur' \| 'submit' | 'none' |
| validationDelay |  | 250 |
| validityAction | (valid: boolean, errors: Record<string, any> \| null) => void |  |
| widgets | DynamicFormWidget[] | [] |

Keyboard:

- Tab/Shift+Tab: move between fields
- Enter: submit when the field does not consume it
- Escape: cancel/close host dialog
- Arrow keys: select options/segmented values

## empty-state

- selector: `ui-empty`
- Empty/search-result placeholder with an optional primary action.

| attribute | type | default |
| --- | --- | --- |
| action | () => void |  |
| actionLabel |  | '' |
| className |  | '' |
| hint |  | '' |
| icon |  | '' |
| iconGlyph |  | '' |
| title |  | '' |
| tone | UiTone |  |

## field

- selector: `ui-field-group`
- Form-field wrapper with label, hint, error, required marker and aria linkage.

| attribute | type | default |
| --- | --- | --- |
| className |  | '' |
| controlId |  | '' |
| error |  | '' |
| errorId |  | '' |
| hint |  | '' |
| hintId |  | '' |
| invalid |  | false |
| label |  | '' |
| required |  | false |

Keyboard:

- Tab/Shift+Tab: enter/leave the projected control
- Host control keeps its native keyboard semantics

## grid

- selector: `ui-grid-layout`
- Generic CSS grid layout for common pages and editors.

| attribute | type | default |
| --- | --- | --- |
| alignItems | string |  |
| area | string |  |
| areas | string \| string[] |  |
| autoFit |  | false |
| columnGap | number \| string |  |
| columns | number \| string | 1 |
| end | number \| string |  |
| fill |  | false |
| flow | 'row' \| 'column' \| 'dense' \| string |  |
| gap | number \| string | 12 |
| justifyItems | string |  |
| minItemWidth | number \| string | 200 |
| rowEnd | number \| string |  |
| rowGap | number \| string |  |
| rows | number \| string |  |
| rowSpan | number \| string |  |
| rowStart | number \| string |  |
| span | number \| string |  |
| start | number \| string |  |

## icon

- selector: `ui-icon`
- icon component

## image

- selector: `ui-image`
- Image with an accessible caption (Ant Design Image / MUI Image).

| attribute | type | default |
| --- | --- | --- |
| alt |  | '' |
| className |  | '' |
| fallback |  | '' |
| fit | 'cover' \| 'contain' \| 'fill' \| 'none' \| 'scale-down' | 'cover' |
| height | number \| string | '' |
| src |  | '' |
| width | number \| string | '' |

## inline-input

- selector: `ui-inline-input`
- Click-to-edit inline value used by tab/session/task titles with Enter/blur commit and Escape cancel.

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| cancelAction | () => void |  |
| changeAction | (value: string) => void |  |
| className |  | '' |
| disabled | boolean |  |
| editAction | () => void |  |
| editGlyph |  | '✎' |
| editing | boolean |  |
| editLabel |  | 'Edit' |
| label |  | '' |
| maxLength |  | 200 |
| placeholder |  | '' |
| selectOnFocus | boolean |  |
| submitAction | (value: string) => void |  |
| submitOnBlur | boolean |  |
| value |  | '' |

Keyboard:

- Enter/Space on the value: begin editing
- Enter: commit and notify changeAction/submitAction
- Escape: cancel and restore the previous value
- Blur: commit (submitOnBlur defaults to true)

## kbd

- selector: `ui-kbd`
- Keyboard shortcut hint (`Ctrl + K`). Renders `<kbd>` boxes in DOM and the

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| className |  | '' |
| keys | string[] | [] |
| label |  | '' |
| separator |  | '+' |
| size | UiSize |  |
| tone | UiTone |  |

## keymap

- selector: `ui-keymap-panel`
- Renderer-neutral keymap overlay. Hosts own key binding semantics, grouping

| attribute | type | default |
| --- | --- | --- |
| grouped |  | false |
| groups | KeymapGroup[] | [] |
| hint |  | '' |
| items | KeymapItem[] | [] |
| maxHeight |  | '60vh' |
| title |  | '' |

## layout

- selector: `ui-workspace-layout`
- Generic workspace layout used by editors and consoles.

| attribute | type | default |
| --- | --- | --- |
| bottomCollapsed |  | false |
| bottomRatio |  | 0.26 |
| collapseAction | (pane: WorkspacePane, collapsed: boolean) => void |  |
| leftCollapsed |  | false |
| leftRatio |  | 0.2 |
| minBottom |  | 80 |
| minLeft |  | 160 |
| minRight |  | 180 |
| resizable |  | true |
| resizeAction | (pane: WorkspacePane, ratio: number) => void |  |
| rightCollapsed |  | false |
| rightRatio |  | 0.24 |

## list

- selector: `ui-list`
- Shared list surface with paged, windowed drawing. TUI and DOM renderers own

| attribute | type | default |
| --- | --- | --- |
| activeOptionId |  | '' |
| ariaLabel |  | 'List' |
| autoLoad |  | false |
| closeAction | () => void |  |
| closeLabel |  | '✕' |
| context |  | '' |
| contextLines | string[] | [] |
| cursor | string |  |
| detailLines | string[] | [] |
| empty | string |  |
| emptyLabel |  | '' |
| error |  | '' |
| hasMore |  | true |
| hasPrevious |  | false |
| header |  | '' |
| hint |  | '' |
| items | ListItem[] | [] |
| listLabel |  | '' |
| loading |  | false |
| loadingLabel |  | 'Loading…' |
| loadPage | ListLoader |  |
| loadPreviousPage | ListPreviousLoader |  |
| maxHeight |  | '60vh' |
| meta |  | '' |
| moreLabel |  | 'Load more' |
| olderLabel |  | 'Load older' |
| panelClass |  | '' |
| previousCursor | string |  |
| scrollbarLength |  | 16 |
| secondaryHint |  | '' |
| selectAction | (item: ListItem) => void |  |
| selectValueAction | (value: string) => void |  |
| showClose |  | false |
| showScrollbar | boolean |  |
| title |  | '' |
| visibleItems |  | 0 |
| windowOffset |  | 0 |

## markdown

- selector: `ui-markdown-table`
- Semantic table shell shared by DOM hosts. The terminal renderer can consume

| attribute | type | default |
| --- | --- | --- |
| header | MarkdownTableCell[] | [] |
| lines | MarkdownToken[][] | [] |
| rows | MarkdownTableCell[][] | [] |

## menu-bar

- selector: `ui-menu-bar`
- Renderer-neutral menu dropdown.

| attribute | type | default |
| --- | --- | --- |
| align | 'left' \| 'right' | 'right' |
| beforeCloseAction | () => boolean \| Promise<boolean> |  |
| caret |  | '▾' |
| disabled |  | false |
| groups | MenuBarGroup[] | [] |
| icon |  | 'menu' |
| label |  | 'Menu' |
| open | boolean |  |
| openChange |  | new EventEmitter<boolean>() |
| overlayEnabled | boolean |  |
| selectAction | (id: string) => void |  |
| triggerTitle |  | '' |

## pagination

- selector: `ui-pagination`
- Page selector bar. `total` is the number of items (not pages); the component

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Pagination' |
| changeAction | (page: number) => void |  |
| className |  | '' |
| ellipsis |  | '…' |
| jumpLabel |  | 'Go to page' |
| maxButtons |  | 7 |
| nextLabel |  | 'Next page' |
| nextText |  | '›' |
| page |  | 1 |
| pageLabel |  | 'Go to page {page}' |
| pageSize |  | 10 |
| pageSizeChangeAction | (size: number) => void |  |
| pageSizeLabel |  | 'Items per page' |
| pageSizeOptions | Array<number \| string> | [10, 20, 50, 100] |
| previousLabel |  | 'Previous page' |
| previousText |  | '‹' |
| showQuickJumper | boolean |  |
| showSizeChanger | boolean |  |
| total |  | 0 |

## panel

- selector: `ui-panel`
- Optional per-part inline skin, supplied by DOM/TUI hosts.

| attribute | type | default |
| --- | --- | --- |
| collapseText | string |  |
| expanded | boolean |  |
| expandedChange |  | new EventEmitter<boolean>() |
| expandText | string |  |
| hint |  | '' |
| items | PanelItem[] | [] |
| locale | 'zh-CN' \| 'en' |  |
| meta |  | '' |
| selection |  | '' |
| styles | PanelStyles |  |
| summary |  | '' |

## popover

- selector: `ui-popover`
- Renderer-neutral popover (Ant Design Popover / MUI Popover).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| beforeCloseAction | () => boolean \| Promise<boolean> |  |
| className |  | '' |
| closable | boolean |  |
| closeAction | () => void |  |
| closeLabel |  | 'Close' |
| lines | string[] | [] |
| overlayOpen | boolean |  |
| placement | PopoverPlacement |  |
| scrollLock | boolean |  |
| title |  | '' |
| visible | boolean |  |

## progress

- selector: `ui-progress`
- Renderer-neutral progress indicator.

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| className |  | '' |
| indeterminate | boolean |  |
| indeterminateLabel |  | 'Loading' |
| interval | number |  |
| label |  | '' |
| max |  | 100 |
| reduceMotion | boolean |  |
| showValue | boolean |  |
| tone | UiTone |  |
| value |  | 0 |
| width |  | 20 |

## qr-code

- selector: `ui-qr-code`
- QR matrix renderer (Ant Design QRCode display half).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'QR code' |
| className |  | '' |
| matrix | Array<Array<boolean \| number \| string>> \| string[] | [] |
| off |  | '  ' |
| on |  | '██' |
| quietZone | number \| string | 0 |

## radio-group

- selector: `ui-radio-group`
- Renderer-neutral radio group. Uses semantic `role="radio"` rows so the

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Options' |
| changeAction | (value: string) => void |  |
| className |  | '' |
| disabled | boolean |  |
| options | RadioOption[] | [] |
| value |  | '' |

## rate

- selector: `ui-rate`
- Star rating (Ant Design Rate / MUI Rating).

| attribute | type | default |
| --- | --- | --- |
| allowClear | boolean |  |
| ariaLabel |  | 'Rating' |
| changeAction | (value: number) => void |  |
| character |  | '★' |
| className |  | '' |
| count | number \| string | 5 |
| disabled | boolean |  |
| emptyCharacter |  | '☆' |
| readonly | boolean |  |
| size | UiSize |  |
| value | number \| string | 0 |

## result

- selector: `ui-result`
- Full-page operation result (Ant Design Result).

| attribute | type | default |
| --- | --- | --- |
| action | () => void |  |
| actionLabel |  | '' |
| ariaLabel |  | '' |
| className |  | '' |
| lines | string[] | [] |
| status | ResultStatus | 'info' |
| subTitle |  | '' |
| title |  | '' |

## scrollbar

- selector: `ui-scrollbar`
- Renderer-neutral scrollbar track. Vertical mode emits one cell per line for

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Scrollbar' |
| className |  | '' |
| length |  | 10 |
| offset |  | 0 |
| orientation | ScrollbarOrientation | 'vertical' |
| thumbChar |  | '█' |
| total |  | 0 |
| trackChar |  | '░' |
| visible |  | 0 |

## search-field

- selector: `ui-search-field`
- Renderer-neutral search/text field with optional leading icon, clear action

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| changeAction | (value: string) => void |  |
| className |  | '' |
| clearable | boolean |  |
| clearAction | () => void |  |
| clearLabel |  | 'Clear' |
| disabled | boolean |  |
| error |  | '' |
| hint |  | '' |
| icon |  | 'search' |
| iconGlyph |  | '' |
| inputId |  | '' |
| label |  | '' |
| name |  | '' |
| placeholder |  | '' |
| readonly | boolean |  |
| submitAction | (value: string) => void |  |
| value |  | '' |

## search-list

- selector: `ui-search-list`
- Searchable list/command palette with local filtering, grouped rows, recent items and an abortable async source.

| attribute | type | default |
| --- | --- | --- |
| activeChangeAction | (item: SearchListItem \| null) => void |  |
| ariaLabel |  | 'Search' |
| changeAction | (query: string) => void |  |
| className |  | '' |
| closeAction | () => void |  |
| disabled | boolean |  |
| emptyLabel |  | 'No matches' |
| items | SearchListItem[] | [] |
| loadingLabel |  | 'Searching…' |
| maxVisible |  | 12 |
| minChars |  | 0 |
| placeholder |  | 'Search…' |
| query |  | '' |
| recentIds | string[] | [] |
| recentLabel |  | 'Recent' |
| retryLabel |  | 'Retry' |
| selectAction | (item: SearchListItem) => void |  |
| selectedId |  | '' |
| showInput | boolean |  |
| source | SearchListSource |  |

Keyboard:

- ArrowDown/ArrowUp: move the active option
- Home/End: first/last option
- Enter: choose the active option
- Escape: request close
- Typing: filters locally or calls source(query, signal)

## segmented

- selector: `ui-segmented`
- Renderer-neutral segmented control (Ant Design Segmented / MUI ToggleButtonGroup).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Segmented control' |
| changeAction | (value: string) => void |  |
| className |  | '' |
| disabled | boolean |  |
| options | SegmentedOption[] | [] |
| size | UiSize |  |
| value |  | '' |

## select

- selector: `ui-select-list`
- Windowed single/multi selection list with search, detail lines and a fixed title/hint.

| attribute | type | default |
| --- | --- | --- |
| accessibilityLabel | string |  |
| ariaLabel |  | 'Selection menu' |
| closeAction | () => void |  |
| closeLabel |  | '✕' |
| detailLines | string[] | [] |
| emptyText |  | '' |
| fitContent |  | false |
| hint |  | '' |
| keydownAction | (event: KeyboardEvent) => void |  |
| maxHeight |  | '60vh' |
| maxWidth |  | 88 |
| meta |  | '' |
| minWidth |  | 28 |
| options | SelectOption[] | [] |
| selectAction | (value: string) => void |  |
| selectedIndex |  | 0 |
| suggestion |  | false |
| title |  | '' |
| visibleCount |  | 0 |
| widthOptions | SelectOption[] |  |
| widthTitle |  | '' |

Keyboard:

- Arrow/Home/End: move selection
- PageUp/PageDown: move by a page
- Enter: accept the highlighted option
- Escape: close without selection
- Typing: filters/creates when the host enables search

## select-trigger

- selector: `ui-select-trigger`
- Select/menu trigger for a host-owned dropdown (`select-list`, menu bar, ...).

| attribute | type | default |
| --- | --- | --- |
| action | () => void |  |
| ariaLabel |  | '' |
| className |  | '' |
| clearable | boolean |  |
| clearAction | () => void |  |
| clearLabel |  | 'Clear' |
| disabled | boolean |  |
| icon |  | '' |
| iconGlyph |  | '' |
| label |  | '' |
| open | boolean |  |
| placeholder |  | 'Select…' |
| value |  | '' |

## skeleton

- selector: `ui-skeleton`
- Static loading placeholder. Renders text blocks (`░`) so terminal hosts show

| attribute | type | default |
| --- | --- | --- |
| className |  | '' |
| label |  | 'Loading' |
| lines |  | 3 |
| lineWidths | number[] |  |
| width |  | 24 |

## slider

- selector: `ui-slider`
- Renderer-neutral slider (Ant Design Slider / MUI Slider).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Slider' |
| changeAction | (value: number) => void |  |
| className |  | '' |
| disabled | boolean |  |
| label |  | '' |
| max | number \| string | 100 |
| min | number \| string | 0 |
| showValue | boolean |  |
| step | number \| string | 1 |
| unit |  | '' |
| value | number \| string | 0 |
| width | number \| string | 10 |

## space

- selector: `ui-space`
- Inline/stack layout primitive (Ant Design Space / MUI Stack).

| attribute | type | default |
| --- | --- | --- |
| action | (item: SpaceItem \| string, index: number) => void |  |
| ariaLabel |  | 'Space' |
| className |  | '' |
| direction | 'horizontal' \| 'vertical' | 'horizontal' |
| items | Array<SpaceItem \| string> | [] |
| itemsGap |  | '' |
| separator |  | ' ' |
| size | UiSize |  |
| wrap | boolean |  |

## spinner

- selector: `ui-spinner`
- Renderer-neutral loading spinner (Ant Design Spin / MUI CircularProgress).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | '' |
| className |  | '' |
| frames |  | '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏' |
| interval | number \| string | 100 |
| label |  | '' |
| pause | boolean |  |
| size | UiSize |  |

## stat

- selector: `ui-stat`
- Compact metric tile (label + value + hint/trend), used by dashboards and

| attribute | type | default |
| --- | --- | --- |
| className |  | '' |
| hint |  | '' |
| label |  | '' |
| tone | UiTone |  |
| trend | StatTrend | 'flat' |
| trendLabel |  | '' |
| value | string \| number | '' |

## status-list

- selector: `ui-status-list`
- Renderer-neutral status list: title, semantic state rows and a hint. Hosts

| attribute | type | default |
| --- | --- | --- |
| hint |  | '' |
| items | StatusListItem[] | [] |
| title |  | '' |

## steps

- selector: `ui-steps`
- Ordered progress steps (wizard headers, task pipelines).

| attribute | type | default |
| --- | --- | --- |
| action | (item: StepItem, index: number) => void |  |
| ariaLabel |  | 'Steps' |
| className |  | '' |
| connector |  | '─' |
| current | number \| string | 0 |
| items | StepItem[] | [] |
| orientation | StepsOrientation | 'horizontal' |

## switch

- selector: `ui-switch`
- Renderer-neutral on/off switch. The state label (`On`/`Off`) is part of the

| attribute | type | default |
| --- | --- | --- |
| changeAction | (checked: boolean) => void |  |
| checked | boolean |  |
| className |  | '' |
| disabled | boolean |  |
| label |  | '' |
| offLabel |  | 'Off' |
| onLabel |  | 'On' |

## tab-bar

- selector: `ui-tab-bar`
- Shared tab strip used by console surfaces (agent-ui session tabs included).

| attribute | type | default |
| --- | --- | --- |
| activationMode | 'automatic' \| 'manual' | 'automatic' |
| source | TabBarSource |  |

## tabs

- selector: `ui-tabs`
- Generic tabs: the shared {@link TabBarComponent} strip plus a pane container

| attribute | type | default |
| --- | --- | --- |
| activationMode | 'automatic' \| 'manual' | 'automatic' |
| activeId |  | '' |
| source | TabsSource |  |
| stripOnly |  | false |

## text-field

- selector: `ui-text-field`
- Renderer-neutral text field with optional multiline mode, clear button and

| attribute | type | default |
| --- | --- | --- |
| addonAfter |  | '' |
| addonBefore |  | '' |
| ariaLabel |  | '' |
| autocomplete |  | '' |
| blurAction | () => void |  |
| changeAction | (value: string) => void |  |
| className |  | '' |
| clearable | boolean |  |
| clearAction | () => void |  |
| clearLabel |  | 'Clear' |
| disabled | boolean |  |
| enterKeyHint |  | '' |
| error |  | '' |
| hideGlyph |  | '○' |
| hidePasswordLabel |  | 'Hide password' |
| hint |  | '' |
| inputId |  | '' |
| inputMode |  | '' |
| label |  | '' |
| maxLength | number \| string | 0 |
| multiline | boolean |  |
| name |  | '' |
| placeholder |  | '' |
| prefix |  | '' |
| readonly | boolean |  |
| required | boolean |  |
| revealable | boolean |  |
| rows |  | 3 |
| showCount | boolean |  |
| showGlyph |  | '◉' |
| showPasswordLabel |  | 'Show password' |
| submitAction | (value: string) => void |  |
| suffix |  | '' |
| type | TextFieldType | 'text' |
| value |  | '' |

## timeline

- selector: `ui-timeline`
- Vertical activity timeline. Status drives the marker glyph and the semantic

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Timeline' |
| className |  | '' |
| items | TimelineItem[] | [] |

## toast

- selector: `ui-toast-stack`
- Renderer-neutral toast strip. The host owns the queue (see `ToastService`)

| attribute | type | default |
| --- | --- | --- |
| actionAction | (id: string) => void |  |
| closeAction | (id: string) => void |  |
| closeLabel |  | '✕' |
| items | readonly ToastEntry[] | [] |
| messageWidth |  | 0 |
| pauseAction | (id: string) => void |  |
| pauseOnHover | boolean |  |
| resumeAction | (id: string) => void |  |

## toolbar

- selector: `ui-toolbar`
- Renderer-neutral action strip. Items are data, not projected markup, so the

| attribute | type | default |
| --- | --- | --- |
| action | (item: ToolbarItem, index: number) => void |  |
| ariaLabel |  | 'Toolbar' |
| className |  | '' |
| compact | boolean |  |
| items | ToolbarItem[] | [] |
| maxVisible | number \| string | 0 |
| orientation | ToolbarOrientation | 'horizontal' |
| overflowGlyph |  | '…' |
| overflowLabel |  | 'More' |

## tooltip

- selector: `ui-tooltip`
- Renderer-neutral tooltip (Ant Design Tooltip / MUI Tooltip).

| attribute | type | default |
| --- | --- | --- |
| closeDelay | number \| string | 0 |
| content |  | '' |
| disabled | boolean |  |
| focusable | boolean |  |
| openDelay | number \| string | 0 |
| placement | TooltipPlacement |  |
| visible | boolean |  |
| visibleChange |  | new EventEmitter<boolean>() |

## transfer

- selector: `ui-transfer`
- Two-pane transfer list (Ant Design Transfer).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Transfer' |
| changeAction | (targetKeys: string[], direction: TransferDirection, movedKeys: string[]) => void |  |
| className |  | '' |
| disabled | boolean |  |
| emptyLabel |  | 'No items' |
| items | TransferItem[] | [] |
| moveAllLeftLabel |  | 'Move all to source' |
| moveAllRightLabel |  | 'Move all to target' |
| moveLeftLabel |  | 'Move to source' |
| moveRightLabel |  | 'Move to target' |
| sourceTitle |  | 'Source' |
| targetKeys | Array<string \| number> | [] |
| targetTitle |  | 'Target' |

## tree

- selector: `ui-tree`
- Hierarchical tree with flattened rendering. Expansion state is owned by the

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Tree' |
| className |  | '' |
| expandedIds | string[] | [] |
| indent |  | 2 |
| indentChar |  | ' ' |
| items | TreeNode[] | [] |
| selectAction | (node: TreeNode) => void |  |
| selectedId |  | '' |
| selectionFollowsFocus | boolean |  |
| toggleAction | (node: TreeNode, expanded: boolean) => void |  |

## tree-select

- selector: `ui-tree-select`
- Tree-backed single selection field (Ant Design TreeSelect).

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Tree select' |
| changeAction | (node: TreeNode) => void |  |
| className |  | '' |
| disabled | boolean |  |
| expandedIds | string[] | [] |
| items | TreeNode[] | [] |
| placeholder |  | 'Select…' |
| selectedId |  | '' |

## typeahead

- selector: `ui-typeahead`
- Async combobox over the shared autocomplete input with abortable source, loading/error/retry.

| attribute | type | default |
| --- | --- | --- |
| ariaLabel |  | 'Search' |
| changeAction | (value: string) => void |  |
| className |  | '' |
| emptyLabel |  | 'No matches' |
| loadingLabel |  | 'Loading…' |
| minChars |  | 1 |
| placeholder |  | '' |
| retryLabel |  | 'Retry' |
| selectAction | (value: string) => void |  |
| source | TypeaheadSource |  |
| value |  | '' |

Keyboard:

- Arrow/Home/End: move the active option
- Enter: accept the active option
- Escape: close suggestions
- Typing: calls source(query, signal); stale responses are ignored

## upload

- selector: `ui-upload`
- Upload surface (Ant Design Upload).

| attribute | type | default |
| --- | --- | --- |
| accept |  | '' |
| ariaLabel |  | 'Upload' |
| className |  | '' |
| disabled | boolean |  |
| files | Array<UploadFile \| string> | [] |
| hint |  | '' |
| label |  | 'Upload' |
| multiple | boolean |  |
| pickAction | () => void |  |
| removeAction | (name: string) => void |  |
| removeLabel |  | 'Remove file' |

