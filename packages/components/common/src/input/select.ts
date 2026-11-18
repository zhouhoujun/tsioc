export interface SelectWindow {
    start: number;
    count: number;
}

export function clampSelectIndex(length: number, selectedIndex: number): number {
    if (!Number.isFinite(length) || length <= 0) return 0;
    const index = Number.isFinite(selectedIndex) ? selectedIndex : 0;
    return Math.max(0, Math.min(length - 1, index));
}

export function resolveSelectWindow(length: number, selectedIndex: number, visibleCount: number): SelectWindow {
    const count = Number.isFinite(visibleCount) && visibleCount > 0 ? Math.floor(visibleCount) : 0;
    if (!Number.isFinite(length) || length <= 0 || count <= 0) return { start: 0, count: 0 };
    const selected = clampSelectIndex(length, selectedIndex);
    if (length <= count) return { start: 0, count: length };
    return {
        start: Math.max(0, Math.min(length - count, selected - Math.floor(count / 2))),
        count
    };
}

export const resolveListWindow = resolveSelectWindow;

export function formatIndexedOptionLabel(index: number, label: string, selected = false): string {
    return `${selected ? '›' : ' '} ${index + 1}. ${label}`;
}
