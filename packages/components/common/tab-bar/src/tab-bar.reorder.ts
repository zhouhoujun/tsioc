import type { TabItem } from './tab-bar';

export interface TabReorderHost {
    draggingId: string;
    items: TabItem[];
    reorderAction?: (ids: string[], id: string, targetId: string) => void;
    contextAction?: (id: string, event: Event) => void;
}

export function startTabDrag(host: TabReorderHost, tab: TabItem, event?: any): void {
    if (!tab?.id) { return; }
    host.draggingId = tab.id;
    event?.dataTransfer?.setData?.('text/plain', tab.id);
}

export function dropTab(host: TabReorderHost, tab: TabItem, event?: any): void {
    event?.preventDefault?.();
    const source = host.draggingId;
    host.draggingId = '';
    if (!source || !tab?.id || source === tab.id || !host.reorderAction) { return; }
    const ids = host.items.map(item => item.id);
    const from = ids.indexOf(source);
    const to = ids.indexOf(tab.id);
    if (from < 0 || to < 0) { return; }
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    host.reorderAction(ids, source, tab.id);
}

export function contextTab(host: TabReorderHost, tab: TabItem, event?: any): void {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    host.contextAction?.(tab?.id || '', event);
}
