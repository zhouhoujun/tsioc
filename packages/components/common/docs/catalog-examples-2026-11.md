# Component catalog examples (2026-11)

Copy-ready examples for the capabilities added by the parity plan. Every
example is renderer-neutral: the same markup paints in the browser and TUI.

## Button + ButtonGroup

```html
<ui-button label="Save" :loading="saving" loadingLabel="Saving…" :action="save"></ui-button>
<ui-button-group ariaLabel="Editor actions">
  <ui-button label="Bold" :action="format('bold')"></ui-button>
  <ui-button label="Italic" :action="format('italic')"></ui-button>
</ui-button-group>
```

- Loading keeps the original label slot and animates a shared-clock spinner.
- Group supports Arrow/Home/End focus movement and skips disabled buttons.

## Select multi-select, grouping and type-ahead

```html
<select-list :options="people" multiple :values="selectedPeople"
  clearable ariaLabel="Assignees" :valuesAction="setPeople"></select-list>
```

```ts
people = [
  { label: 'Ada Lovelace', value: 'ada', group: 'Engineering' },
  { label: 'Grace Hopper', value: 'grace', group: 'Engineering' },
  { label: 'Alan Turing', value: 'alan', group: 'Research' }
];
```

Typing letters jumps to the next matching option. Chips expose remove buttons;
`clearable` adds a clear action.

## Tree checkbox, multi-select and lazy branches

```html
<ui-tree :items="nodes" checkable multiple :checkedIds="checked"
  :checkAction="setChecked" :loadChildren="loadChildren"></ui-tree>
```

```ts
async loadChildren(node) {
  return api.children(node.id);
}
```

Unloaded branches use `lazy: true`; the tree renders a loading glyph while the
host promise is pending.

## TreeSelect multiple / checkable

```html
<ui-tree-select :items="nodes" checkable multiple :checkedIds="checked"
  :checkAction="setChecked" :loadChildren="loadChildren"></ui-tree-select>
```

Checked labels are shown as a comma-separated value; the panel stays open while
checking.

## DataTable editing + column chooser

```html
<ui-data-table :columns="columns" :rows="rows" editable
  :editAction="updateCell" :columnOrder="order" :hiddenColumns="hidden"
  :columnChangeAction="saveLayout"></ui-data-table>

<ui-data-table-columns :columns="columns" :hiddenColumns="hidden"
  :columnOrder="order" :changeAction="setLayout"></ui-data-table-columns>
```

- Double-click or Enter starts editing; Enter commits, Escape cancels.
- `ui-data-table-columns` provides visibility, order and reset; the emitted
  `{ order, hidden, widths }` can be persisted directly.

## Dialog / Drawer backdrop

```html
<dialog-panel title="Delete?" :lines="['This cannot be undone.']"
  overlayOpen backdrop closeOnBackdrop :closeAction="close"></dialog-panel>
```

Backdrop and inert background are browser-only; terminal hosts render the same
panel without a backdrop.

## DynamicForm summary and leave guard

```html
<dynamic-form :schema="schema" :value="value" showErrorSummary
  errorSummaryLabel="Please fix these fields" :beforeLeaveAction="confirmDiscard">
</dynamic-form>
```

```ts
async confirmDiscard() {
  return !form.isDirty || await confirm('Discard changes?');
}
```

`resetToInitial()` restores `initialSnapshot`, while `reset()` keeps the schema
defaults behavior.

## Tabs overflow, reorder and context actions

```html
<tab-bar :source="source" :reorderAction="reorderTabs"
  :contextAction="showTabMenu"></tab-bar>
```

The default overflow is a single `…` menu; `overflowMode="scroll"` opts into the
legacy arrows. Hosts window their own `items` in TUI and provide `overflowItems`.

## Accordion group

```html
<ui-accordion-group :items="sections" :activeId="openSection"
  :toggleAction="setOpenSection"></ui-accordion-group>
```

Set `multiple` to keep independent expanded sections.

## Toast provider

```html
<ui-toast-provider position="bottom-right" pauseOnHover pauseAllOnHover>
</ui-toast-provider>
```

```ts
@ViewChild(ToastProviderComponent) toasts!: ToastProviderComponent;
this.toasts.show('Saved', { tone: 'success', actionLabel: 'Undo', action: undo });
```

## Tooltip portal

```html
<ui-tooltip content="Copied" placement="top" flip portal focusable>
  <ui-button label="Copy"></ui-button>
</ui-tooltip>
```

`portal` switches the popup to fixed viewport coordinates so scrolling/clipping
containers cannot cut it off; terminal hosts keep the inline tooltip.
