import type { TabBarComponent, TabItem } from './tab-bar';

export function tabIndexFor(bar: TabBarComponent, tab: TabItem, index: number): number {
    if (!tab || tab.disabled) {
        return -1;
    }
    const items = bar.items;
    if (bar.focusedKey && items.some(item => item?.id === bar.focusedKey && !item.disabled)) {
        return tab.id === bar.focusedKey ? 0 : -1;
    }
    if (tab.active) {
        return 0;
    }
    if (items.some(item => item?.active && !item.disabled)) {
        return -1;
    }
    return items.findIndex(item => item && !item.disabled) === index ? 0 : -1;
}

export function focusAfterClose(bar: TabBarComponent): void {
    void Promise.resolve().then(() => Promise.resolve()).then(() => {
        const items = bar.items;
        const target = items.find(item => item.active && !item.disabled) ?? items.find(item => !item.disabled);
        bar.focusedKey = target?.id || '';
        if (target) {
            (bar as any).focusTab(items.indexOf(target));
        }
    });
}

export function onTabKeydown(bar: TabBarComponent, event: any, tab: TabItem, index: number): void {
    if (!tab) {
        return;
    }
    const key = String(event?.key || '');
    if (key === 'F2') {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        bar.beginRename(tab.id, event);
        return;
    }
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event?.preventDefault?.();
        bar.select(tab.id, event);
        return;
    }
    if ((key === 'Delete' || key === 'Backspace') && tab.showClose !== false) {
        event?.preventDefault?.();
        bar.closeTab(tab.id, event);
        return;
    }
    if (event?.altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
        const ids = bar.items.map(item => item.id);
        const from = ids.indexOf(tab.id);
        const to = from + (key === 'ArrowRight' ? 1 : -1);
        if (from >= 0 && to >= 0 && to < ids.length) {
            event.preventDefault?.();
            [ids[from], ids[to]] = [ids[to], ids[from]];
            bar.focusedKey = tab.id;
            bar.reorderAction?.(ids, tab.id, bar.items[to]?.id || '');
            void Promise.resolve().then(() => (bar as any).focusTab(to));
        }
        return;
    }
    let targetIndex = -1;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
        targetIndex = nextEnabledTab(bar, index, 1);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        targetIndex = nextEnabledTab(bar, index, -1);
    } else if (key === 'Home') {
        targetIndex = nextEnabledTab(bar, -1, 1);
    } else if (key === 'End') {
        targetIndex = nextEnabledTab(bar, bar.items.length, -1);
    }
    if (targetIndex < 0) {
        return;
    }
    event?.preventDefault?.();
    const target = bar.items[targetIndex];
    bar.focusedKey = target.id;
    if ((bar as any).mode === 'automatic') {
        bar.select(target.id, event);
    }
    const focus = () => (bar as any).focusTab(targetIndex);
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(focus);
    } else {
        focus();
    }
}

function nextEnabledTab(bar: TabBarComponent, from: number, step: 1 | -1): number {
    const items = bar.items;
    if (!items.length) {
        return -1;
    }
    for (let offset = 1; offset <= items.length; offset++) {
        const index = ((from + step * offset) % items.length + items.length) % items.length;
        if (items[index] && !items[index].disabled) {
            return index;
        }
    }
    return -1;
}
