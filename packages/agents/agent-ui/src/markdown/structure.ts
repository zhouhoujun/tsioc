/**
 * Pre-processing: split inline numbered plans into real list lines.
 * Fenced code is left untouched.
 */
export function normalizeMarkdownStructure(content: string): string {
    const sourceLines = String(content || '').replace(/\r/g, '').split('\n');
    const normalized: string[] = [];
    let inFence = false;

    sourceLines.forEach(sourceLine => {
        const trimmed = sourceLine.trim();
        if (trimmed.startsWith('```')) {
            inFence = !inFence;
            normalized.push(sourceLine);
            return;
        }
        if (inFence) {
            normalized.push(sourceLine);
            return;
        }

        normalized.push(...expandInlineStructuredText(sourceLine));
    });

    return normalized.join('\n');
}

/**
 * `1. ` is only an ordered-list marker when the dot is followed by
 * whitespace and the digits are not part of a preceding token. Without both
 * conditions, version numbers (`v24.21.0`) and decimals (`1.5`) were split
 * into fake list items — a short answer containing two versions was broken
 * after the leading `v`/`版本`.
 */
const ORDERED_ITEM_RE = /\d{1,3}\.\s+/g;

function isOrderedItemAt(value: string, index: number): boolean {
    return index === 0 || !/[\w.]/.test(value[index - 1]);
}

function findFirstOrderedItem(value: string): number {
    ORDERED_ITEM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ORDERED_ITEM_RE.exec(value))) {
        if (isOrderedItemAt(value, match.index)) {
            return match.index;
        }
    }
    return -1;
}

function countOrderedItems(value: string): number {
    ORDERED_ITEM_RE.lastIndex = 0;
    let count = 0;
    let match: RegExpExecArray | null;
    while ((match = ORDERED_ITEM_RE.exec(value))) {
        if (isOrderedItemAt(value, match.index)) {
            count += 1;
        }
    }
    return count;
}

function expandInlineStructuredText(sourceLine: string): string[] {
    const original = String(sourceLine || '');
    if (!original.trim()) {
        return [original];
    }

    if (countOrderedItems(original) < 2) {
        return [original];
    }

    let line = original
        .replace(/\s*[；;]\s*(?=\d{1,3}\.\s+)/g, '\n')
        .replace(/\s*[，,]\s*(?=\d{1,3}\.\s+)/g, '\n');

    const firstListIndex = findFirstOrderedItem(line);
    if (firstListIndex > 0) {
        const prefix = line.slice(0, firstListIndex).trimEnd();
        if (prefix.length && prefix.length <= 24 && !/[.!?。！？]$/.test(prefix)) {
            line = `${prefix}\n${line.slice(firstListIndex).trimStart()}`;
        }
    }

    return line.split('\n');
}
