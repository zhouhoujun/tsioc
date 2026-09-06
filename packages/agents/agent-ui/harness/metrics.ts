/**
 * P285 — Pure DOM metrics collector for the interaction gate.
 *
 * `collectGatewayMetrics` is intentionally SELF-CONTAINED: it references no
 * module-scope symbol, no import, and no node API. That is what makes
 * `collectorSource` (`collectGatewayMetrics.toString()`) safe to ship into a
 * real browser via `page.evaluate(...)`. Keep it free of any closure over
 * module state.
 *
 * The collector reads the REAL rendered messages panel (`.console-panel
 * .console-messages-panel`, rows `.message-row`, lines `label.message-line`
 * carrying the full `aria-label`) and reports:
 *  - row/line counts and distinct aria-labels (duplicate detection),
 *  - CJK line count (the interaction-gate acceptance lens),
 *  - a layout gate: `firstScreenVisibleRate` is ONLY reported when the viewport
 *    has height AND the rows are measurable (JSDOM => `measured: false`).
 */

export interface GatewayDomMetrics {
    viewport: { width: number; height: number };
    panelFound: boolean;
    rowCount: number;
    lineCount: number;
    /** Every aria-label observed on message lines, in DOM order. */
    ariaLabels: string[];
    /** Lines whose aria-label contains CJK characters. */
    cjkLineCount: number;
    distinctLabels: number;
    /** Labels that appeared more than once (dup rows if non-empty). */
    duplicateLabels: string[];
    layout: {
        /** True only when the viewport and rows are measurable (real browser). */
        measured: boolean;
        rowHeight: number;
        firstScreenVisibleRate: number | null;
    };
}

export function collectGatewayMetrics(
    doc: Document,
    root: Element | Document = doc,
    opts?: { viewport?: { width: number; height: number } }
): GatewayDomMetrics {
    // Keep these LOCAL: `collectorSource` (collectGatewayMetrics.toString()) ships
    // only the function body into the browser, so any module-scope reference would
    // throw ReferenceError on page.evaluate (P282 gate: PANEL_SELECTOR undefined).
    const PANEL_SELECTOR = '.console-panel.console-messages-panel';
    const ROW_SELECTOR = '.message-row';
    const LINE_SELECTOR = 'label.message-line[aria-label]';
    const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
    const win = doc.defaultView;
    const innerHeight = win && typeof win.innerHeight === 'number' ? win.innerHeight : 0;
    const innerWidth = win && typeof win.innerWidth === 'number' ? win.innerWidth : 0;
    const viewport = opts?.viewport ?? { width: innerWidth, height: innerHeight };

    const panel = root.querySelector(PANEL_SELECTOR);
    const rows = panel ? panel.querySelectorAll(ROW_SELECTOR) : [];
    const lines = panel ? panel.querySelectorAll(LINE_SELECTOR) : [];
    const ariaLabels: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
        const label = lines[i].getAttribute('aria-label');
        if (label) {
            ariaLabels.push(label);
        }
    }

    let cjkLineCount = 0;
    for (let i = 0; i < ariaLabels.length; i += 1) {
        if (CJK_RE.test(ariaLabels[i])) {
            cjkLineCount += 1;
        }
    }

    const seen = new Map<string, number>();
    for (let i = 0; i < ariaLabels.length; i += 1) {
        seen.set(ariaLabels[i], (seen.get(ariaLabels[i]) ?? 0) + 1);
    }
    const distinctLabels = seen.size;
    const duplicateLabels: string[] = [];
    for (const [label, count] of seen.entries()) {
        if (count > 1) {
            duplicateLabels.push(label);
        }
    }

    // Layout gate: only measure visibility when the viewport and the rows have
    // real geometry. JSDOM reports 0x0 everywhere => `measured: false`.
    let measured = false;
    let rowHeight = 0;
    let firstScreenVisibleRate: number | null = null;
    if (innerHeight > 0 && rows.length > 0 && typeof rows[0].getBoundingClientRect === 'function') {
        const first = rows[0].getBoundingClientRect();
        rowHeight = first.height;
        if (rowHeight > 0) {
            let visible = 0;
            for (let i = 0; i < rows.length; i += 1) {
                const rect = rows[i].getBoundingClientRect();
                if (rect.height > 0 && rect.top < innerHeight) {
                    visible += 1;
                }
            }
            firstScreenVisibleRate = rows.length > 0 ? visible / rows.length : 0;
            measured = true;
        }
    }

    return {
        viewport,
        panelFound: Boolean(panel),
        rowCount: rows.length,
        lineCount: ariaLabels.length,
        ariaLabels,
        cjkLineCount,
        distinctLabels,
        duplicateLabels,
        layout: {
            measured,
            rowHeight,
            firstScreenVisibleRate
        }
    };
}

/**
 * Source text of the collector, shipped to a real browser via
 * `page.evaluate(collectorSource)` and invoked as `collectGatewayMetrics(document, document)`.
 */
export const collectorSource = collectGatewayMetrics.toString();