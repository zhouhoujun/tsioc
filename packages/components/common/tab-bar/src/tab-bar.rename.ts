import type { TabBarComponent, TabItem } from './tab-bar';

export function canRenameTab(bar: TabBarComponent, tab: TabItem): boolean {
    return !!(bar as any).activeSource?.rename && tab?.renamable !== false && !bar.hostWindowed;
}

export function renameTabTitle(bar: TabBarComponent, tab: TabItem): string {
    return (bar as any).activeSource?.renameLabel || `Rename ${String(tab?.label || '').trim()}`.trim();
}

export function beginTabRename(bar: TabBarComponent, id: string, event?: Event): void {
    const tab = bar.items.find(item => item.id === id);
    if (!tab || !canRenameTab(bar, tab)) {
        return;
    }
    event?.preventDefault?.();
    event?.stopPropagation?.();
    bar.renamingId = id;
}

export function commitTabRename(bar: TabBarComponent, id: string, title: string): void {
    const next = String(title ?? '').trim();
    bar.renamingId = '';
    if (!next) {
        return;
    }
    void (bar as any).activeSource?.rename?.(id, next);
}

export function cancelTabRename(bar: TabBarComponent): void {
    bar.renamingId = '';
}
