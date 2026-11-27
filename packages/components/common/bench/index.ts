import { Spring } from '../motion/src';
import { DataTableColumn, DataTableRow } from '../data-table/src/data-table.types';
import {
    filterDataTableRows,
    formatDataTableCell,
    sortDataTableRows
} from '../data-table/src/data-table.view';
import { flattenDataTableTree } from '../data-table/src/data-table.tree';
import { menuAncestorPath } from '../menu-bar/src/menu-bar.submenu';

/**
 * Common widget hot-path harness.
 *
 * Run with: npm run bench
 *
 * Reports CPU time (not wall time) so scheduler noise does not dominate; use
 * the numbers to compare before/after changes, not as absolute budgets.
 */

function cpuMs(): number {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000;
}

function measure(name: string, run: () => number): void {
    const start = cpuMs();
    let work = 0;
    for (let index = 0; index < 3; index++) {
        work = run();
    }
    const duration = cpuMs() - start;
    console.log(`${name.padEnd(38)} ${duration.toFixed(2).padStart(9)} ms  ${work}`);
}

function rows(count: number): DataTableRow[] {
    return Array.from({ length: count }, (_value, index) => ({
        id: String(index),
        name: index % 3 === 0 ? `build-${index}` : `run-${index}`,
        value: index
    }));
}

measure('calibration', () => {
    const items = Array.from({ length: 256 }, (_value, index) => ({ value: index, nested: { value: index * 2 } }));
    let acc = 0;
    for (let round = 0; round < 200_000; round++) {
        for (const item of items) {
            acc += item.value + item.nested.value;
        }
    }
    return acc;
});

const columns: DataTableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'value', label: 'Value', align: 'right' }
];

measure('data-table filter 5k rows', () => {
    const filtered = filterDataTableRows(rows(5000), { name: 'build' });
    return filtered.length;
});

measure('data-table sort 5k rows', () => {
    const sorted = sortDataTableRows(rows(5000).map((row, index) => ({ row, index })), 'value', 'desc');
    return sorted.length;
});

measure('data-table format 100k cells', () => {
    const data = rows(1000);
    let total = 0;
    for (let round = 0; round < 100; round++) {
        for (const row of data) {
            for (const column of columns) {
                total += formatDataTableCell(column, row, round).length;
            }
        }
    }
    return total;
});

const treeRows: DataTableRow[] = Array.from({ length: 1000 }, (_value, index) => ({
    id: `p${index}`,
    name: `parent-${index}`,
    children: Array.from({ length: 5 }, (_child, childIndex) => ({
        id: `p${index}-${childIndex}`,
        name: `child-${index}-${childIndex}`
    }))
}));

measure('data-table tree flatten 6k rows', () => {
    let total = 0;
    for (let round = 0; round < 100; round++) {
        total += flattenDataTableTree(treeRows, 'children', (row, index) => String(row.id ?? index)).length;
    }
    return total;
});

const menuGroups = [{
    items: Array.from({ length: 30 }, (_value, index) => ({
        id: `g${index}`,
        label: `Group ${index}`,
        children: Array.from({ length: 10 }, (_child, childIndex) => ({
            id: `g${index}-${childIndex}`,
            label: `Item ${childIndex}`,
            children: Array.from({ length: 5 }, (_leaf, leafIndex) => ({
                id: `g${index}-${childIndex}-${leafIndex}`,
                label: `Leaf ${leafIndex}`
            }))
        }))
    }))
}];

measure('menu ancestor path 2k', () => {
    let total = 0;
    for (let round = 0; round < 2_000; round++) {
        total += menuAncestorPath(menuGroups, 'g15-5-3').length;
    }
    return total;
});

measure('spring 200k steps', () => {
    const spring = new Spring({ value: 0, target: 100, stiffness: 170, damping: 26 });
    for (let frame = 0; frame < 200_000; frame++) {
        spring.step(16);
    }
    return Math.round(spring.value);
});
