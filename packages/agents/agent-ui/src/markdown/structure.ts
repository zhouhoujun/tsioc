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

function expandInlineStructuredText(sourceLine: string): string[] {
    const original = String(sourceLine || '');
    if (!original.trim()) {
        return [original];
    }

    const numberedMatches = original.match(/\d+\.\s*/g) || [];
    if (numberedMatches.length < 2) {
        return [original];
    }

    let line = original
        .replace(/\s*[；;]\s*(?=\d+\.\s*)/g, '\n')
        .replace(/\s*[，,]\s*(?=\d+\.\s*)/g, '\n');

    const firstListIndex = line.search(/\d+\.\s*/);
    if (firstListIndex > 0) {
        const prefix = line.slice(0, firstListIndex).trimEnd();
        if (prefix.length && prefix.length <= 24 && !/[.!?。！？]$/.test(prefix)) {
            line = `${prefix}\n${line.slice(firstListIndex).trimStart()}`;
        }
    }

    return line.split('\n');
}
