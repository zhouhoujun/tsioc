import { unwrapReactive } from '@tsdi/components';

/**
 * Submenu path helpers. A path is the chain of open submenu parent ids from
 * the outer-most flyout to the inner-most one, so nested menus keep every
 * ancestor visible while opening a deeper level.
 */

/** Ancestor ids of `id` (outer-most first); empty for a top-level item. */
export function menuAncestorPath(groups: any[], id: string): string[] {
    const trail: string[] = [];
    const walk = (items: any[]): string[] | null => {
        for (const item of items || []) {
            if (!item) {
                continue;
            }
            if (item.id === id) {
                return trail.slice();
            }
            trail.push(item.id);
            const found = walk(item.children || []);
            if (found) {
                return found;
            }
            trail.pop();
        }
        return null;
    };
    for (const group of groups || []) {
        const found = walk(group?.items || []);
        if (found) {
            return found;
        }
    }
    return [];
}

/**
 * Whether moving to `target` stays inside the branch owned by `id`. Flyouts are
 * siblings in the DOM, so pointer/focus transitions must consult the menu data
 * instead of relying on DOM containment.
 */
export function submenuBranchKeepsOpen(groups: any[], id: string, target: any): boolean {
    const node = unwrapReactive(target);
    const submenu = node?.closest?.('.menu-bar-submenu') as HTMLElement | undefined;
    const item = node?.closest?.('[data-menu-id]') as HTMLElement | undefined;
    const nextId = String(submenu?.getAttribute?.('data-submenu-id')
        || item?.getAttribute?.('data-menu-id') || '');
    if (!nextId) {
        return false;
    }
    return nextId === id
        || menuAncestorPath(groups, nextId).includes(id)
        || menuAncestorPath(groups, id).includes(nextId);
}

/** Close `id` and every deeper level while keeping its ancestors open. */
export function truncateMenuPath(path: string[], id: string): string[] {
    const index = (path || []).indexOf(id);
    return index < 0 ? path || [] : path.slice(0, index);
}
