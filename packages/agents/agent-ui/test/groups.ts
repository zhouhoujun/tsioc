/**
 * File grouping for the agent-ui test runner.
 *
 * Two heavy specs are isolated (they pass standalone and dominate the suite),
 * and the remaining files are split into three contiguous slices of the
 * original order. Contiguous slices keep DOM-heavy neighbours together — the
 * earlier random/file-balanced split changed their order and surfaced teardown
 * assumptions. All groups are merged back down when memory is tight.
 */

export const HEAVY_GROUPS: Record<string, string[]> = {
    'console-renderer': ['test/console-renderer.spec.ts'],
    'session-tabs': ['test/session-tab-isolation.spec.ts']
};

/** Split into the two standalone heavy specs plus three ordered chunks. */
export function planGroups(files: string[]): Record<string, string[]> {
    const ordered = files.slice().sort();
    const claimed = new Set<string>();
    const groups: Record<string, string[]> = {};
    for (const [name, members] of Object.entries(HEAVY_GROUPS)) {
        const present = members.filter(file => ordered.includes(file));
        if (present.length !== members.length) {
            // A renamed/removed heavy spec: fall back to one pass so no case is lost.
            return { all: ordered };
        }
        groups[name] = present;
        present.forEach(file => claimed.add(file));
    }
    const remainder = ordered.filter(file => !claimed.has(file));
    const chunks = 3;
    const size = Math.ceil(remainder.length / chunks);
    for (let index = 0; index < chunks; index++) {
        const chunk = remainder.slice(index * size, (index + 1) * size);
        if (chunk.length) {
            groups[`remainder-${index + 1}`] = chunk;
        }
    }
    return groups;
}

/**
 * Merge the five planned groups down to the memory budget. The heavy specs keep
 * their own worker whenever the count allows; merged remainders are adjacent
 * slices, so concatenating them preserves the original suite order.
 */
export function selectGroups(groups: Record<string, string[]>, count: number): Record<string, string[]> {
    const names = Object.keys(groups);
    if (count >= names.length) {
        return groups;
    }
    const [consoleGroup, tabsGroup, ...remainders] = names;
    if (count === 1) {
        return { all: names.flatMap(name => groups[name]).sort() };
    }
    if (count === 2) {
        return {
            [consoleGroup]: groups[consoleGroup],
            rest: [tabsGroup, ...remainders].flatMap(name => groups[name]).sort()
        };
    }
    if (count === 3) {
        return {
            [consoleGroup]: groups[consoleGroup],
            [tabsGroup]: groups[tabsGroup],
            rest: remainders.flatMap(name => groups[name]).sort()
        };
    }
    // count === 4: keep the first remainder chunk separate.
    return {
        [consoleGroup]: groups[consoleGroup],
        [tabsGroup]: groups[tabsGroup],
        [remainders[0]]: groups[remainders[0]],
        rest: remainders.slice(1).flatMap(name => groups[name]).sort()
    };
}
