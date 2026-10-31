import { Inject, Injectable, Module, ModuleWithProviders } from '@tsdi/ioc';
import {
    AbstractTemplateCompiler,
    Renderer,
    RNode,
    TemplateCompiler,
    TemplateCompilerOptions,
    TemplateParser
} from '@tsdi/components';
import {
    CONSOLE_TEMPLATE,
    ConsoleComment,
    ConsoleCssStyleDeclaration,
    ConsoleElement,
    ConsoleNode,
    ConsoleRenderer,
    ConsoleTemplateParser,
    ConsoleText,
    DEFAULT_CONSOLE_TEMPLATE_OPTIONS,
    provideConsoleTemplateDefaults
} from './console';
import { fitByDisplayWidth, getDisplayWidth, sliceByDisplayWidth } from './display-width';
import {
    clampConsoleSelectIndex,
    formatConsoleSelectOptionTableRow,
    isConsolePlaceholderActive,
    resolveConsoleOptionLabelColumnWidth,
    resolveConsoleSelectDetailLines,
    resolveConsolePlaceholderDisplayValue,
    resolveConsoleSelectWindow
} from './input';
import { provideConsoleTerminalLifecycle, TerminalClickTarget } from './terminal';
import { CommonComponentsModule } from '@tsdi/components/common';

const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';

export interface TuiRenderOptions {
    width?: number;
    /** Top-level subtree that changed; other subtrees may reuse cached layout. */
    dirty?: ConsoleNode;
}

export interface TuiCursorTarget {
    id: string;
    row: number;
    column: number;
}

export interface TuiRenderRegion {
    id: string;
    startRow: number;
    endRow: number;
}

export interface TuiRenderLayout {
    lines: string[];
    cursorTargets: TuiCursorTarget[];
    regions: TuiRenderRegion[];
    clickTargets: TerminalClickTarget[];
}

type TuiRenderRegionDraft = TuiRenderRegion & { element?: ConsoleElement };

interface TuiStyledSegment {
    text: string;
    styleMap: Record<string, string>;
}

@Injectable()
export class TuiRenderer extends ConsoleRenderer {
    renderToTuiLines(node: RNode | RNode[], options: TuiRenderOptions = {}): string[] {
        return this.renderToTuiLayout(node, options).lines;
    }

    protected subtreeLayoutCache = new Map<object, {
        lines: string[];
        cursorTargets: TuiCursorTarget[];
        regions: TuiRenderRegionDraft[];
        clickTargets: TerminalClickTarget[];
    }>();
    protected subtreeLayoutWidth?: number;

    renderToTuiLayout(node: RNode | RNode[], options: TuiRenderOptions = {}): TuiRenderLayout {
        const nodes = Array.isArray(node) ? node : [node];
        const width = options.width;
        const dirty = options.dirty;
        if (this.subtreeLayoutWidth !== width) {
            this.subtreeLayoutCache.clear();
            this.subtreeLayoutWidth = width;
        }
        const recomputeAll = !dirty || !nodes.includes(dirty as any);
        const lines: string[] = [];
        const cursorTargets: TuiCursorTarget[] = [];
        const regions: TuiRenderRegionDraft[] = [];
        const clickTargets: TerminalClickTarget[] = [];
        nodes.forEach(current => {
            const key = current as object;
            let entry = this.subtreeLayoutCache.get(key);
            if (recomputeAll || dirty === current || !entry) {
                entry = this.renderSubtreeLayout(current as ConsoleNode, width);
                this.subtreeLayoutCache.set(key, entry);
            }
            const baseRow = lines.length;
            for (const line of entry.lines) {
                lines.push(line);
            }
            for (const target of entry.cursorTargets) {
                cursorTargets.push({ id: target.id, row: target.row + baseRow, column: target.column });
            }
            for (const target of entry.clickTargets) {
                clickTargets.push({ ...target, y: target.y + baseRow });
            }
            for (const region of entry.regions) {
                regions.push({ ...region, startRow: region.startRow + baseRow, endRow: region.endRow + baseRow });
            }
        });
        while (lines.length && !this.stripAnsi(lines[lines.length - 1]).trim()) {
            lines.pop();
        }
        return {
            lines,
            cursorTargets,
            clickTargets,
            regions: regions.map(region => ({
                id: region.id,
                startRow: region.startRow,
                endRow: region.endRow
            }))
        };
    }

    protected renderSubtreeLayout(node: ConsoleNode, width?: number): {
        lines: string[];
        cursorTargets: TuiCursorTarget[];
        regions: TuiRenderRegionDraft[];
        clickTargets: TerminalClickTarget[];
    } {
        const lines: string[] = [];
        const cursorTargets: TuiCursorTarget[] = [];
        const regions: TuiRenderRegionDraft[] = [];
        const clickTargets: TerminalClickTarget[] = [];
        const visited = new WeakSet<object>();
        this.tuiTextCache = this.buildTuiTextMap([node]);
        try {
            this.walkTuiNode(node, lines, {}, width, cursorTargets, regions, clickTargets, visited);
        } finally {
            this.tuiTextCache = undefined;
        }
        return { lines, cursorTargets, regions, clickTargets };
    }

    protected tuiTextCache?: Map<object, string>;

    protected buildTuiTextMap(nodes: ConsoleNode[]): Map<object, string> {
        const map = new Map<object, string>();
        const computing = new WeakSet<object>();
        const compute = (node: ConsoleNode): string => {
            if (!node || typeof node !== 'object') {
                return '';
            }
            const cached = map.get(node);
            if (cached !== undefined) {
                return cached;
            }
            if (computing.has(node)) {
                return '';
            }
            computing.add(node);
            let text: string;
            if (node instanceof ConsoleText || node instanceof ConsoleComment) {
                text = node.textContent || '';
            } else if (node instanceof ConsoleElement) {
                text = node.childNodes.map(child => compute(child as ConsoleNode)).join('');
            } else {
                text = '';
            }
            computing.delete(node);
            map.set(node, text);
            return text;
        };
        nodes.forEach(node => compute(node));
        return map;
    }

    protected walkTuiNode(
        current: ConsoleNode,
        lines: string[],
        inherited: Record<string, string>,
        width?: number,
        cursorTargets: TuiCursorTarget[] = [],
        regions: TuiRenderRegionDraft[] = [],
        clickTargets: TerminalClickTarget[] = [],
        visited: WeakSet<object> = new WeakSet<object>()
    ): void {
        if (current && typeof current === 'object') {
            if (visited.has(current)) {
                return;
            }
            visited.add(current);
        }
        if (current instanceof ConsoleText) {
            const value = current.textContent || '';
            if (value.trim()) {
                lines.push(this.applyAnsi(this.normalizeInlineWhitespace(value), inherited, width, true));
            }
            return;
        }
        if (current instanceof ConsoleComment) {
            return;
        }

        const element = current as ConsoleElement;
        const styleMap = this.mergeStyles(inherited, this.getStyleMap(element));
        if (String(styleMap.display || '').trim().toLowerCase() === 'none') {
            return;
        }
        const tag = (element.tagName || '').toLowerCase();
        const text = this.tuiTextCache?.get(element) ?? this.collectText(element);
        const regionId = this.resolveRenderRegionId(element);
        const regionStart = regionId ? lines.length : -1;
        const interactive = this.hasPointerHandler(element) || element.focusable;
        const clickStart = interactive ? lines.length : -1;
        const elementStartRow = lines.length;
        const contentStartRow = elementStartRow + this.resolveBoxPadding(styleMap.padding).top;
        const finishRegion = () => {
            if (!regionId || lines.length <= regionStart) {
                return;
            }
            const region = { id: regionId, startRow: regionStart, endRow: lines.length };
            regions.push({ ...region, element });
        };
        const finishClickTarget = () => {
            if (clickStart < 0 || lines.length <= clickStart) {
                return;
            }
            clickTargets.push({
                node: element,
                x: 0,
                y: clickStart,
                width: width ?? this.resolveMaxLineWidth(lines.slice(clickStart)),
                height: lines.length - clickStart,
                interactive: this.hasPointerHandler(element) ? 'pointer' : 'focus',
                hoverable: this.resolveHoverable(element)
            });
        };

        switch (tag) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
                if (text.trim()) {
                    lines.push(...this.renderInlineLines(element, { ...styleMap, 'font-weight': 'bold' }, width));
                }
                this.collectNestedClickTargets(element, clickStart >= 0 ? clickStart : contentStartRow, lines.length, lines, width, clickTargets, visited);
                finishClickTarget();
                finishRegion();
                return;
            case 'p':
            case 'label':
            case 'li':
                if (text.trim()) {
                    const labelStyle = element.getAttribute('labelStyle');
                    const merged = labelStyle ? this.mergeStyles(styleMap, this.parseInlineStyle(labelStyle)) : styleMap;
                    const rendered = this.renderInlineLines(element, merged, width);
                    const align = String(merged['text-align'] || merged.textAlign || '').trim().toLowerCase();
                    lines.push(...(align === 'right' && width
                        ? rendered.map(line => {
                            const pad = width - getDisplayWidth(this.stripAnsi(line));
                            return pad > 0 ? `${' '.repeat(pad)}${line}` : line;
                        })
                        : rendered));
                }
                this.collectNestedClickTargets(element, clickStart >= 0 ? clickStart : contentStartRow, lines.length, lines, width, clickTargets, visited);
                finishClickTarget();
                finishRegion();
                return;
            case 'span':
            case 'a':
                if (text.trim()) {
                    const textStyle = element.getAttribute('textStyle');
                    const merged = textStyle ? this.mergeStyles(styleMap, this.parseInlineStyle(textStyle)) : styleMap;
                    lines.push(...this.renderInlineLines(element, merged, width));
                }
                this.collectNestedClickTargets(element, clickStart >= 0 ? clickStart : contentStartRow, lines.length, lines, width, clickTargets, visited);
                finishClickTarget();
                finishRegion();
                return;
            case 'button':
                if (text.trim()) {
                    lines.push(this.applyAnsi(`[ ${this.renderInlineText(element, styleMap)} ]`, styleMap, width));
                }
                this.collectNestedClickTargets(element, clickStart >= 0 ? clickStart : contentStartRow, lines.length, lines, width, clickTargets, visited);
                finishClickTarget();
                finishRegion();
                return;
            case 'select': {
                const title = element.getAttribute('title') || '';
                const meta = element.getAttribute('meta') || '';
                const hint = element.getAttribute('hint') || '';
                const options = element.getAttribute('options');
                const selectedIdx = parseInt(element.getAttribute('selectedIndex') || '0', 10);
                const visibleCount = parseInt(element.getAttribute('visibleCount') || '6', 10);
                const detailTitle = element.getAttribute('detailTitle') || '';
                const detailLinesText = element.getAttribute('detailLines');
                const descriptionMaxWidth = parseInt(element.getAttribute('descriptionMaxWidth') || '32', 10);
                const titleStyle = this.parseInlineStyle(element.getAttribute('titleStyle') || '');
                const metaStyle = this.parseInlineStyle(element.getAttribute('metaStyle') || '');
                const hintStyle = this.parseInlineStyle(element.getAttribute('hintStyle') || '');
                const optionStyle = this.parseInlineStyle(element.getAttribute('optionStyle') || '');
                const optionActiveStyle = this.parseInlineStyle(element.getAttribute('optionActiveStyle') || '');
                const detailLabelStyle = this.parseInlineStyle(element.getAttribute('detailLabelStyle') || '');
                const detailValueStyle = this.parseInlineStyle(element.getAttribute('detailValueStyle') || '');
                let parsedOptions: Array<{label: string; value: string}> = [];
                let detailLines: string[] = [];
                try {
                    if (options) { parsedOptions = JSON.parse(options); }
                } catch {}
                try {
                    if (detailLinesText) {
                        detailLines = JSON.parse(detailLinesText);
                    }
                } catch {}
                const safeSelectedIdx = clampConsoleSelectIndex(parsedOptions.length, selectedIdx);
                const safeVisibleCount = Number.isFinite(visibleCount) && visibleCount > 0 ? visibleCount : 6;
                const visibleWindow = resolveConsoleSelectWindow(parsedOptions.length, safeSelectedIdx, safeVisibleCount);
                const visibleStart = visibleWindow.start;
                // Dialog chrome (title/question, meta, details, hint) must wrap
                // at the terminal width. Padding these through `applyAnsi`
                // truncated a confirmation question mid-word, hiding the
                // snapshot/ref the user was asked to approve.
                const pushWrappedChrome = (value: string, style: Record<string, string>) => {
                    const wrapped = this.wrapStyledSegmentLine([{ text: value, styleMap: style }], width);
                    if (!width || width <= 0) {
                        lines.push(...wrapped);
                        return;
                    }
                    for (const line of wrapped) {
                        const pad = Math.max(0, width - getDisplayWidth(this.stripAnsi(line)));
                        lines.push(pad ? `${line}${this.applyAnsi(' '.repeat(pad), style, undefined, true)}` : line);
                    }
                };
                if (title) {
                    pushWrappedChrome(title, this.mergeStyles(styleMap, {
                        'font-weight': 'bold',
                        ...titleStyle
                    }));
                }
                if (meta) {
                    pushWrappedChrome(meta, this.mergeStyles(styleMap, metaStyle));
                }
                const visibleOptions = parsedOptions.slice(visibleStart, visibleStart + visibleWindow.count);
                const optionLabelColumnWidth = resolveConsoleOptionLabelColumnWidth(visibleOptions, visibleStart);
                const optionClickRows: Array<{ index: number; row: number }> = [];
                visibleOptions.forEach((opt, idx) => {
                    const absoluteIndex = visibleStart + idx;
                    lines.push(this.applyAnsi(
                        formatConsoleSelectOptionTableRow(
                            absoluteIndex,
                            opt.label,
                            absoluteIndex === safeSelectedIdx,
                            (opt as any).description || '',
                            optionLabelColumnWidth,
                            Number.isFinite(descriptionMaxWidth) && descriptionMaxWidth > 0 ? descriptionMaxWidth : 32
                        ),
                        this.mergeStyles(styleMap, absoluteIndex === safeSelectedIdx ? optionActiveStyle : optionStyle),
                        width
                    ));
                    optionClickRows.push({ index: absoluteIndex, row: lines.length - 1 });
                });
                if (detailTitle) {
                    pushWrappedChrome(detailTitle, this.mergeStyles(styleMap, detailLabelStyle));
                }
                if (detailTitle || detailLinesText) {
                    const resolvedDetailLines = detailLines.length
                        ? detailLines
                        : resolveConsoleSelectDetailLines(parsedOptions[safeSelectedIdx] as any);
                    resolvedDetailLines.forEach(line => {
                        pushWrappedChrome(String(line || ''), this.mergeStyles(styleMap, detailValueStyle));
                    });
                }
                if (hint) {
                    pushWrappedChrome(hint, this.mergeStyles(styleMap, {
                        color: '#6f7c8a',
                        ...hintStyle
                    }));
                }
                finishClickTarget();
                // One hit target per option row: a click selects the row under
                // the pointer instead of being swallowed by the container.
                for (const entry of optionClickRows) {
                    clickTargets.push({
                        node: element,
                        x: 0,
                        y: entry.row,
                        width: width ?? this.resolveMaxLineWidth(lines.slice(entry.row, entry.row + 1)),
                        height: 1,
                        interactive: 'pointer',
                        hoverable: true,
                        optionIndex: entry.index
                    });
                }
                finishRegion();
                return;
            }
            case 'input': {
                const lineStart = lines.length;
                const rawValue = element.getAttribute('value') || text || '';
                const value = (element.getAttribute('mask') || '').toLowerCase() === 'true' ? '•'.repeat(rawValue.length) : rawValue;
                const prompt = element.getAttribute('prompt') || '';
                const cursor = element.getAttribute('cursor') || ' ';
                const placeholder = element.getAttribute('placeholder') || '';
                const cursorPos = parseInt(element.getAttribute('cursorPos') || '0', 10);
                const focused = element.focused;
                const shellStyle = element.getAttribute('shellStyle') || '';
                const promptStyle = this.parseInlineStyle(element.getAttribute('promptStyle') || '');
                const valueStyle = this.parseInlineStyle(element.getAttribute('valueStyle') || '');
                const placeholderStyle = this.parseInlineStyle(element.getAttribute('placeholderStyle') || 'color: #6e7681;');
                const cursorStyle = this.parseInlineStyle(element.getAttribute('cursorStyle') || 'color: #7ee787; background: #2ea043;');
                const showCursor = (element.getAttribute('showCursor') || 'true').toLowerCase() !== 'false';
                const mergedStyle = shellStyle ? this.mergeStyles(styleMap, this.parseInlineStyle(shellStyle)) : styleMap;
                if (!value && !prompt && !placeholder) {
                    lines.push(this.applyAnsi('', mergedStyle, width));
                    finishClickTarget();
                    finishRegion();
                    return;
                }
                const displayValue = resolveConsolePlaceholderDisplayValue(value, placeholder, focused);
                const isPlaceholder = isConsolePlaceholderActive(value, placeholder);
                const safeCursorPos = Math.max(0, Math.min(cursorPos, displayValue.length));
                const promptText = prompt
                    ? this.applyAnsi(prompt, this.mergeStyles(mergedStyle, promptStyle), undefined, true)
                    : '';
                this.recordCursorTarget(element, cursorTargets, {
                    row: lineStart,
                    column: getDisplayWidth(prompt) + getDisplayWidth(displayValue.slice(0, safeCursorPos))
                });
                if (!focused || !showCursor) {
                    const valueText = displayValue
                        ? this.applyAnsi(displayValue, this.mergeStyles(mergedStyle, isPlaceholder ? placeholderStyle : valueStyle), undefined, true)
                        : '';
                    lines.push(`${promptText}${valueText}`);
                    finishClickTarget();
                    finishRegion();
                    return;
                }
                const cursorChar = safeCursorPos < displayValue.length ? displayValue[safeCursorPos] : cursor;
                const beforeCursor = displayValue.slice(0, safeCursorPos);
                const afterCursor = safeCursorPos < displayValue.length ? displayValue.slice(safeCursorPos + 1) : '';
                const beforeText = beforeCursor
                    ? this.applyAnsi(beforeCursor, this.mergeStyles(mergedStyle, isPlaceholder ? placeholderStyle : valueStyle), undefined, true)
                    : '';
                const cursorText = this.applyAnsi(
                    cursorChar,
                    this.mergeStyles(
                        this.mergeStyles(mergedStyle, isPlaceholder ? placeholderStyle : valueStyle),
                        cursorStyle
                    ),
                    undefined,
                    true
                );
                const afterText = afterCursor
                    ? this.applyAnsi(afterCursor, this.mergeStyles(mergedStyle, isPlaceholder ? placeholderStyle : valueStyle), undefined, true)
                    : '';
                lines.push(`${promptText}${beforeText}${cursorText}${afterText}`);
                finishClickTarget();
                finishRegion();
                return;
            }
            case 'textarea': {
                const lineStart = lines.length;
                const rawValue = element.getAttribute('value') || text || '';
                const value = (element.getAttribute('mask') || '').toLowerCase() === 'true' ? '•'.repeat(rawValue.length) : rawValue;
                const prompt = element.getAttribute('prompt') || '';
                const placeholder = element.getAttribute('placeholder') || '';
                const continuationPrompt = element.getAttribute('continuationPrompt') || '  ';
                const cursor = element.getAttribute('cursor') || ' ';
                const cursorPos = parseInt(element.getAttribute('cursorPos') || '0', 10);
                const focused = element.focused;
                const shellStyle = element.getAttribute('shellStyle') || '';
                const promptStyle = this.parseInlineStyle(element.getAttribute('promptStyle') || '');
                const valueStyle = this.parseInlineStyle(element.getAttribute('valueStyle') || '');
                const placeholderStyle = this.parseInlineStyle(element.getAttribute('placeholderStyle') || 'color: #6e7681;');
                const cursorStyle = this.parseInlineStyle(element.getAttribute('cursorStyle') || 'color: #7ee787; background: #2ea043;');
                const showCursor = (element.getAttribute('showCursor') || 'true').toLowerCase() !== 'false';
                const mergedStyle = shellStyle ? this.mergeStyles(styleMap, this.parseInlineStyle(shellStyle)) : styleMap;
                const displayValue = resolveConsolePlaceholderDisplayValue(value, placeholder, focused);
                if (!displayValue && !prompt) {
                    lines.push(this.applyAnsi('', mergedStyle, width));
                    finishClickTarget();
                    finishRegion();
                    return;
                }
                const rendered = this.renderEditableTextLines({
                    value: displayValue,
                    cursorPos,
                    cursor,
                    prompt,
                    continuationPrompt,
                    mergedStyle,
                    promptStyle,
                    valueStyle: isConsolePlaceholderActive(value, placeholder) ? placeholderStyle : valueStyle,
                    cursorStyle,
                    placeholderActive: false,
                    showCursor: focused && showCursor
                });
                lines.push(...rendered.lines);
                this.recordCursorTarget(element, cursorTargets, {
                    row: lineStart + rendered.cursorRow,
                    column: rendered.cursorColumn
                });
                finishClickTarget();
                finishRegion();
                return;
            }
            case 'br':
                lines.push('');
                finishClickTarget();
                finishRegion();
                return;
            case 'section':
            case 'div': {
                const start = lines.length;
                const childLines: string[] = [];
                const childTargets: TuiCursorTarget[] = [];
                const childRegions: TuiRenderRegionDraft[] = [];
                const childClickTargets: TerminalClickTarget[] = [];
                const childInherited = this.getInheritedStyleMap(styleMap);
                const hasOwnFrame = this.hasBlockFrame(styleMap, width);
                const blockMaxWidth = this.resolveBlockMaxWidth(styleMap, width);
                const blockWidth = blockMaxWidth && width ? Math.min(width, blockMaxWidth) : width;
                const childWidth = this.resolveBlockContentWidth(styleMap, blockWidth);
                element.childNodes.forEach(child => this.walkTuiNode(
                    child as ConsoleNode,
                    childLines,
                    childInherited,
                    childWidth,
                    childTargets,
                    childRegions,
                    childClickTargets,
                    visited
                ));
                const framedLines = this.renderBlockLines(childLines, styleMap, blockWidth);
                const layoutWidth = typeof width === 'number' ? width : undefined;
                const indent = layoutWidth && blockMaxWidth && typeof blockWidth === 'number' && blockWidth < layoutWidth
                    ? Math.floor((layoutWidth - blockWidth) / 2)
                    : 0;
                const framed = indent && layoutWidth
                    ? framedLines.map(line => {
                        const pad = Math.max(0, layoutWidth - indent - getDisplayWidth(this.stripAnsi(line)));
                        return `${' '.repeat(indent)}${line}${' '.repeat(pad)}`;
                    })
                    : framedLines;
                lines.push(...framed);
                const offset = this.resolveBlockContentOffset(styleMap);
                childTargets.forEach(target => cursorTargets.push({
                    ...target,
                    row: start + offset.row + target.row,
                    column: indent + offset.column + target.column
                }));
                childRegions.forEach(region => {
                    const absolute = {
                        id: region.id,
                        startRow: start + offset.row + region.startRow,
                        endRow: start + offset.row + region.endRow
                    };
                    regions.push({ ...absolute, element: region.element });
                });
                childClickTargets.forEach(target => {
                    // Keep extra target metadata (e.g. the select option index);
                    // rebuilding field-by-field silently dropped it.
                    clickTargets.push({
                        ...target,
                        x: indent + offset.column + target.x,
                        y: start + offset.row + target.y
                    });
                });
                if (hasOwnFrame && lines.length > start && this.stripAnsi(lines[lines.length - 1]).trim()) {
                    lines.push('');
                }
                finishClickTarget();
                finishRegion();
                return;
            }
            default:
                element.childNodes.forEach(child => this.walkTuiNode(
                    child as ConsoleNode,
                    lines,
                    this.getInheritedStyleMap(styleMap),
                    width,
                    cursorTargets,
                    regions,
                    clickTargets,
                    visited
                ));
                finishClickTarget();
                finishRegion();
                return;
        }
    }

    protected hasPointerHandler(element?: ConsoleElement): boolean {
        return !!element && ['click', 'mousedown', 'wheel'].some(type => element.hasEventListener(type));
    }

    /** Whether a pointer target contains its own pointer targets (those need the shared search cursor). */
    protected hasNestedPointerTarget(element: ConsoleElement): boolean {
        return (element.childNodes || []).some(child => {
            if (!(child instanceof ConsoleElement)) {
                return false;
            }
            return this.hasPointerHandler(child) || !!child.focusable || this.hasNestedPointerTarget(child);
        });
    }

    protected collectNestedClickTargets(
        element: ConsoleElement,
        startRow: number,
        endRow: number,
        lines: string[],
        width: number | undefined,
        clickTargets: TerminalClickTarget[],
        visited: WeakSet<object>,
        searchCursor: Map<number, number> = new Map<number, number>()
    ): void {
        element.childNodes.forEach(child => {
            if (!(child instanceof ConsoleElement) || visited.has(child)) {
                return;
            }
            visited.add(child);
            const childElement = child as ConsoleElement;
            const styleMap = this.getStyleMap(childElement);
            if (String(styleMap.display || '').trim().toLowerCase() === 'none') {
                return;
            }
            if (this.hasPointerHandler(childElement) || childElement.focusable) {
                const childText = this.stripAnsi(this.renderInlineText(childElement, styleMap));
                const inline = startRow === endRow - 1 && startRow < lines.length && childText;
                const rowText = inline ? this.stripAnsi(lines[startRow]) : '';
                // Repeated inline labels (e.g. two identical tab close buttons)
                // must resolve to their own columns; `indexOf` from 0 would put
                // every later duplicate on the first occurrence.
                const searchStart = inline ? (searchCursor.get(startRow) ?? 0) : 0;
                const offset = inline ? rowText.indexOf(childText, searchStart) : -1;
                clickTargets.push({
                    node: childElement,
                    x: offset >= 0 ? getDisplayWidth(rowText.slice(0, offset)) : 0,
                    y: startRow,
                    width: offset >= 0 ? Math.max(1, getDisplayWidth(childText)) : (width ?? this.resolveMaxLineWidth(lines.slice(startRow, endRow))),
                    height: endRow - startRow,
                    interactive: this.hasPointerHandler(childElement) ? 'pointer' : 'focus',
                    hoverable: this.resolveHoverable(childElement)
                });
                if (offset >= 0 && !this.hasNestedPointerTarget(childElement)) {
                    searchCursor.set(startRow, offset + childText.length);
                }
            }
            this.collectNestedClickTargets(childElement, startRow, endRow, lines, width, clickTargets, visited, searchCursor);
        });
    }

    /**
     * Hover fades belong to pointer affordances only. A row opts out with
     * `data-hover="none"` (timeline rows that cannot expand/collapse); focus
     * targets such as the composer input never fade.
     */
    protected resolveHoverable(element: ConsoleElement): boolean {
        if (!this.hasPointerHandler(element)) {
            return false;
        }
        const marker = String(element.getAttribute('data-hover') || '').trim().toLowerCase();
        return marker !== 'none';
    }

    protected getInheritedStyleMap(styleMap: Record<string, string>): Record<string, string> {
        const inherited: Record<string, string> = {};
        ['color', 'font-weight'].forEach(key => {
            if (styleMap[key]) {
                inherited[key] = styleMap[key];
            }
        });
        return inherited;
    }

    protected recordCursorTarget(
        element: ConsoleElement,
        cursorTargets: TuiCursorTarget[],
        position: { row: number; column: number }
    ): void {
        const id = element.getAttribute('cursorTarget') || element.getAttribute('data-cursor-target');
        if (!id) {
            return;
        }
        cursorTargets.push({
            id,
            row: position.row,
            column: position.column
        });
    }

    protected resolveRenderRegionId(element: ConsoleElement): string {
        const explicit = element.getAttribute('renderRegion') || element.getAttribute('data-render-region');
        if (explicit) {
            return explicit;
        }
        const id = element.getAttribute('id');
        if (id) {
            return id;
        }
        const className = String(element.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean)[0];
        if (className) {
            return className;
        }
        return (element.tagName || '').toLowerCase();
    }

    protected resolveBorderEdges(styleMap: Record<string, string>): { box: boolean; left: boolean; bottom: boolean } {
        const box = !!styleMap.border;
        const bottomStyle = String(styleMap['border-bottom'] ?? styleMap.borderBottom ?? '').trim().toLowerCase();
        return { box, left: box || !!(styleMap['border-left'] || styleMap.borderLeft), bottom: box && !/^(none|0|no)$/.test(bottomStyle) };
    }

    protected resolveBlockContentWidth(styleMap: Record<string, string>, width?: number): number | undefined {
        if (!width || !this.hasBlockFrame(styleMap, width)) {
            return width;
        }
        const padding = this.resolveBoxPadding(styleMap.padding);
        const border = this.resolveBorderEdges(styleMap);
        const hasBackground = !!(styleMap.background || styleMap['background-color']);
        // Do not paint the terminal's final column for unbordered background bands.
        // Some terminals auto-wrap or retain that cell as a vertical shadow.
        const renderWidth = !border.box && hasBackground ? Math.max(1, width - 1) : width;
        // Reserved edge columns must mirror the painted border edges, or total width drifts from `width`.
        const edgeColumns = border.box ? 2 : border.left ? 1 : 0;
        return Math.max(4, renderWidth - edgeColumns - padding.left - padding.right);
    }

    protected resolveBlockMaxWidth(styleMap: Record<string, string>, width?: number): number | undefined {
        const raw = styleMap['max-width'] || styleMap.maxWidth;
        if (!raw || !width || width <= 0) {
            return undefined;
        }
        const text = String(raw).trim();
        const parsed = text.endsWith('%')
            ? Math.floor(width * (parseFloat(text) / 100))
            : parseInt(text.replace(/ch$/, ''), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return undefined;
        }
        return Math.max(8, Math.min(width, Math.floor(parsed)));
    }

    protected renderBlockLines(lines: string[], styleMap: Record<string, string>, width?: number): string[] {
        const hasFrame = this.hasBlockFrame(styleMap, width);
        if (!hasFrame || !width) {
            return lines;
        }
        const padding = this.resolveBoxPadding(styleMap.padding);
        const border = this.resolveBorderEdges(styleMap);
        const innerWidth = this.resolveBlockContentWidth(styleMap, width) as number;
        const contentLines = lines.length ? lines : [''];
        const framed: string[] = [];
        const horizontal = border.box ? this.applyAnsi('─'.repeat(Math.max(1, width - 2)), styleMap, undefined, true) : '';
        const topPad = ' '.repeat(Math.max(0, padding.top));
        const bottomPad = ' '.repeat(Math.max(0, padding.bottom));
        const renderRow = (raw: string) => {
            const leftPad = this.applyAnsi(' '.repeat(Math.max(0, padding.left)), styleMap, undefined, true);
            const rightPad = this.applyAnsi(' '.repeat(Math.max(0, padding.right)), styleMap, undefined, true);
            const body = this.applyAnsi(this.padVisible(raw, innerWidth), styleMap, undefined, true);
            const leading = border.left ? this.applyAnsi('│', styleMap, undefined, true) : '';
            const trailing = border.box ? this.applyAnsi('│', styleMap, undefined, true) : '';
            return `${leading}${leftPad}${body}${rightPad}${trailing}`;
        };
        const rounded = !!styleMap['border-radius'];
        if (border.box) {
            framed.push(`${this.applyAnsi(rounded ? '╭' : '┌', styleMap, undefined, true)}${horizontal}${this.applyAnsi(rounded ? '╮' : '┐', styleMap, undefined, true)}`);
        }
        for (let index = 0; index < padding.top; index++) {
            framed.push(renderRow(topPad));
        }
        contentLines.forEach(line => framed.push(renderRow(line)));
        for (let index = 0; index < padding.bottom; index++) {
            framed.push(renderRow(bottomPad));
        }
        if (border.box && border.bottom) {
            framed.push(`${this.applyAnsi(rounded ? '╰' : '└', styleMap, undefined, true)}${horizontal}${this.applyAnsi(rounded ? '╯' : '┘', styleMap, undefined, true)}`);
        }
        return framed;
    }

    protected resolveMaxLineWidth(lines: string[]): number {
        return lines.reduce((max, line) => Math.max(max, getDisplayWidth(this.stripAnsi(line))), 0);
    }

    protected resolveBlockContentOffset(styleMap: Record<string, string>): { row: number; column: number } {
        const padding = this.resolveBoxPadding(styleMap.padding);
        const hasFrame = this.hasBlockFrame(styleMap);
        const border = this.resolveBorderEdges(styleMap);
        if (!hasFrame) {
            return { row: 0, column: 0 };
        }
        return {
            row: (border.box ? 1 : 0) + padding.top,
            column: (border.left ? 1 : 0) + padding.left
        };
    }

    protected hasBlockFrame(styleMap: Record<string, string>, width?: number): boolean {
        const hasBoxStyle = !!(styleMap.background || styleMap['background-color'] || styleMap.border || styleMap['border-left'] || styleMap.borderLeft || styleMap.padding);
        if (typeof width === 'number') {
            return width > 0 && hasBoxStyle;
        }
        return hasBoxStyle;
    }

    protected renderInlineLines(element: ConsoleElement, inherited: Record<string, string>, width?: number): string[] {
        const padding = this.resolveBoxPadding(inherited.padding);
        const leftPad = padding.left > 0
            ? this.applyAnsi(' '.repeat(padding.left), inherited, undefined, true)
            : '';
        const rightPad = padding.right > 0
            ? this.applyAnsi(' '.repeat(padding.right), inherited, undefined, true)
            : '';
        const availableWidth = width
            ? Math.max(1, width - padding.left - padding.right)
            : undefined;
        const hasBackground = !!(inherited.background || inherited['background-color']);
        const hasPadding = padding.top > 0 || padding.right > 0 || padding.bottom > 0 || padding.left > 0;
        const wrapped = this.wrapStyledSegments(
            this.collectInlineSegmentLines(element, inherited),
            availableWidth,
            width != null && String(inherited['white-space'] || '').trim().toLowerCase() !== 'nowrap'
        );
        const rows = wrapped.map(chunk => {
            const content = `${leftPad}${chunk}${rightPad}`;
            if (!width || (!hasBackground && !hasPadding)) {
                return content;
            }
            return this.applyAnsi(this.padVisible(content, width), inherited, undefined, true);
        });
        if (!hasPadding || (padding.top <= 0 && padding.bottom <= 0)) {
            return rows;
        }
        const blankContent = `${leftPad}${rightPad}`;
        const blankRow = width && (hasBackground || hasPadding)
            ? this.applyAnsi(this.padVisible(blankContent, width), inherited, undefined, true)
            : blankContent;
        return [
            ...Array.from({ length: Math.max(0, padding.top) }, () => blankRow),
            ...rows,
            ...Array.from({ length: Math.max(0, padding.bottom) }, () => blankRow)
        ];
    }

    protected renderInlineText(current: ConsoleNode, inherited: Record<string, string>): string {
        if (current instanceof ConsoleComment) {
            return '';
        }
        if (current instanceof ConsoleText) {
            const value = current.textContent || '';
            if (!value.trim()) {
                return '';
            }
            const text = /[\r\n\t]/.test(value)
                ? this.normalizeInlineWhitespace(value).trim()
                : value;
            return this.applyAnsi(text, inherited, undefined, true);
        }
        const element = current as ConsoleElement;
        const styleMap = this.mergeStyles(inherited, this.getStyleMap(element));
        const tag = (element.tagName || '').toLowerCase();
        if (tag === 'br') {
            return '';
        }
        if (tag === 'input') {
            const value = element.getAttribute('value') || this.collectText(element) || '';
            return this.applyAnsi(value, styleMap);
        }
        return element.childNodes
            .map(child => this.renderInlineText(child as ConsoleNode, styleMap))
            .join('');
    }

    protected collectInlineSegmentLines(current: ConsoleNode, inherited: Record<string, string>): TuiStyledSegment[][] {
        const lines: TuiStyledSegment[][] = [[]];
        this.appendInlineSegments(current, inherited, lines);
        return lines.length ? lines : [[]];
    }

    protected appendInlineSegments(
        current: ConsoleNode,
        inherited: Record<string, string>,
        lines: TuiStyledSegment[][]
    ): void {
        if (current instanceof ConsoleComment) {
            return;
        }
        if (current instanceof ConsoleText) {
            const value = current.textContent || '';
            if (!value.trim()) {
                return;
            }
            const text = /[\r\n\t]/.test(value)
                ? this.normalizeInlineWhitespace(value).trim()
                : value;
            if (!text) {
                return;
            }
            lines[lines.length - 1].push({ text, styleMap: inherited });
            return;
        }
        const element = current as ConsoleElement;
        const styleMap = this.mergeStyles(inherited, this.getStyleMap(element));
        const tag = (element.tagName || '').toLowerCase();
        if (tag === 'br') {
            lines.push([]);
            return;
        }
        if (tag === 'input') {
            const value = element.getAttribute('value') || this.collectText(element) || '';
            if (value) {
                lines[lines.length - 1].push({ text: value, styleMap });
            }
            return;
        }
        element.childNodes.forEach(child => this.appendInlineSegments(child as ConsoleNode, styleMap, lines));
    }

    protected wrapStyledSegments(
        segmentLines: TuiStyledSegment[][],
        width?: number,
        wrap = true
    ): string[] {
        if (!segmentLines.length) {
            return [''];
        }
        return segmentLines.flatMap(segments => this.wrapStyledSegmentLine(segments, width, wrap));
    }

    protected wrapStyledSegmentLine(
        segments: TuiStyledSegment[],
        width?: number,
        wrap = true
    ): string[] {
        if (!segments.length) {
            return [''];
        }
        if (!wrap || !width || width <= 0) {
            return [segments.map(segment => this.applyAnsi(segment.text, segment.styleMap, undefined, true)).join('')];
        }
        const lines: string[] = [];
        let currentLine = '';
        let currentWidth = 0;
        const flush = () => {
            lines.push(currentLine);
            currentLine = '';
            currentWidth = 0;
        };
        segments.forEach(segment => {
            let rest = segment.text;
            while (rest) {
                if (currentWidth >= width) {
                    flush();
                }
                const availableWidth = Math.max(1, width - currentWidth);
                const chunk = sliceByDisplayWidth(rest, availableWidth) || rest.slice(0, 1);
                currentLine += this.applyAnsi(chunk, segment.styleMap, undefined, true);
                currentWidth += getDisplayWidth(chunk);
                rest = rest.slice(chunk.length);
                if (rest && currentWidth >= width) {
                    flush();
                }
            }
        });
        if (!lines.length || currentLine) {
            lines.push(currentLine);
        }
        return lines;
    }

    protected collectText(current: ConsoleNode, visited: WeakSet<object> = new WeakSet<object>()): string {
        if (current && typeof current === 'object') {
            if (visited.has(current)) {
                return '';
            }
            visited.add(current);
        }
        if (current instanceof ConsoleText || current instanceof ConsoleComment) {
            return current.textContent || '';
        }
        if (current instanceof ConsoleElement) {
            return current.childNodes.map(child => this.collectText(child as ConsoleNode, visited)).join('');
        }
        return '';
    }

    protected getStyleMap(element: ConsoleElement): Record<string, string> {
        const styles: Record<string, string> = {};
        const styleDeclaration = element.style as ConsoleCssStyleDeclaration;
        if (styleDeclaration && typeof styleDeclaration.getProperties === 'function') {
            Object.assign(styles, styleDeclaration.getProperties());
        }
        const inlineStyle = element.getAttribute('style');
        if (inlineStyle) {
            inlineStyle.split(';')
                .map(item => item.trim())
                .filter(Boolean)
                .forEach(entry => {
                    const index = entry.indexOf(':');
                    if (index === -1) {
                        return;
                    }
                    const name = entry.slice(0, index).trim();
                    const value = entry.slice(index + 1).trim();
                    if (name) {
                        styles[name] = value;
                    }
                });
        }
        return styles;
    }

    protected mergeStyles(left: Record<string, string>, right: Record<string, string>): Record<string, string> {
        return {
            ...left,
            ...right
        };
    }

    protected parseInlineStyle(styleText: string): Record<string, string> {
        const style: Record<string, string> = {};
        String(styleText || '').split(';').map(s => s.trim()).filter(Boolean).forEach(part => {
            const idx = part.indexOf(':');
            if (idx < 0) { return; }
            style[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
        });
        return style;
    }

    protected applyAnsi(value: string, styleMap: Record<string, string>, width?: number, inline = false): string {
        const text = !inline && width && (styleMap.background || styleMap['background-color'])
            ? this.padVisible(value, width)
            : value;
        const codes: string[] = [];
        const foreground = this.resolveColor(styleMap.color, false);
        const background = this.resolveColor(styleMap['background-color'] || styleMap.background, true);
        if (styleMap['font-weight'] === 'bold') {
            codes.push(ANSI_BOLD);
        }
        if (foreground) {
            codes.push(foreground);
        }
        if (background) {
            codes.push(background);
        }
        if (!codes.length) {
            return text;
        }
        const prefix = codes.join('');
        const continuedText = text.split(ANSI_RESET).join(`${ANSI_RESET}${prefix}`);
        return `${prefix}${continuedText}${ANSI_RESET}`;
    }

    protected normalizeInlineWhitespace(value: string): string {
        return value.replace(/\s+/g, ' ');
    }

    protected resolveColor(value?: string, background = false): string {
        if (!value) {
            return '';
        }
        const hex = this.extractHexColor(value);
        if (!hex) {
            return '';
        }
        const rgb = this.hexToRgb(hex);
        if (!rgb) {
            return '';
        }
        return `\x1b[${background ? '48' : '38'};2;${rgb.r};${rgb.g};${rgb.b}m`;
    }

    protected resolveBoxPadding(value?: string): { top: number; right: number; bottom: number; left: number } {
        if (!value) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }
        const parts = value
            .split(/\s+/)
            .map(part => parseInt(part.replace(/px$/, ''), 10))
            .filter(num => Number.isFinite(num));
        if (!parts.length) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }
        if (parts.length === 1) {
            return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
        }
        if (parts.length === 2) {
            return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
        }
        if (parts.length === 3) {
            return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
        }
        return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    }

    protected extractHexColor(value: string): string | undefined {
        const match = value.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
        return match ? `#${match[1]}` : undefined;
    }

    protected hexToRgb(value: string): { r: number; g: number; b: number } | undefined {
        const normalized = value.replace('#', '');
        const source = normalized.length === 3
            ? normalized.split('').map(ch => `${ch}${ch}`).join('')
            : normalized;
        if (source.length !== 6) {
            return undefined;
        }
        return {
            r: parseInt(source.slice(0, 2), 16),
            g: parseInt(source.slice(2, 4), 16),
            b: parseInt(source.slice(4, 6), 16)
        };
    }

    protected stripAnsi(value: string): string {
        return value.replace(/\x1b\[[0-9;]*m/g, '');
    }

    protected padVisible(value: string, width: number): string {
        const visible = this.stripAnsi(value);
        if (getDisplayWidth(visible) > width) {
            return sliceByDisplayWidth(visible, width);
        }
        return `${value}${' '.repeat(width - getDisplayWidth(visible))}`;
    }

    protected fitVisible(value: string, width: number): string {
        const visible = this.stripAnsi(value);
        if (getDisplayWidth(visible) <= width) {
            return value;
        }
        return fitByDisplayWidth(visible, width);
    }

    protected renderEditableTextLines(options: {
        value: string;
        cursorPos: number;
        cursor: string;
        prompt: string;
        continuationPrompt?: string;
        mergedStyle: Record<string, string>;
        promptStyle: Record<string, string>;
        valueStyle: Record<string, string>;
        cursorStyle: Record<string, string>;
        placeholderActive?: boolean;
        showCursor?: boolean;
    }): { lines: string[]; cursorRow: number; cursorColumn: number } {
        const {
            value,
            cursorPos,
            cursor,
            prompt,
            continuationPrompt = '',
            mergedStyle,
            promptStyle,
            valueStyle,
            cursorStyle,
            placeholderActive = false,
            showCursor = true
        } = options;
        const normalizedValue = String(value || '').replace(/\r/g, '');
        const lines = normalizedValue.split('\n');
        const resolveCursorPosition = () => {
            let remainingCursor = Math.max(0, Math.min(cursorPos, normalizedValue.length));
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const lineValue = lines[lineIndex];
                const cursorOnLine = remainingCursor <= lineValue.length || lineIndex === lines.length - 1;
                if (cursorOnLine) {
                    const safeCursorPos = Math.max(0, Math.min(remainingCursor, lineValue.length));
                    const prefixValue = lineIndex === 0 ? prompt : continuationPrompt;
                    return {
                        cursorRow: lineIndex,
                        cursorColumn: getDisplayWidth(prefixValue) + getDisplayWidth(lineValue.slice(0, safeCursorPos))
                    };
                }
                remainingCursor -= lineValue.length + 1;
            }
            return {
                cursorRow: 0,
                cursorColumn: getDisplayWidth(prompt)
            };
        };
        const cursorPosition = resolveCursorPosition();
        if (!showCursor) {
            const renderedLines = lines.map((lineValue, lineIndex) => {
                const prefixValue = lineIndex === 0 ? prompt : continuationPrompt;
                const promptText = prefixValue
                    ? this.applyAnsi(prefixValue, this.mergeStyles(mergedStyle, promptStyle), undefined, true)
                    : '';
                const lineText = lineValue
                    ? this.applyAnsi(lineValue, this.mergeStyles(mergedStyle, placeholderActive ? {} : valueStyle), undefined, true)
                    : '';
                return `${promptText}${lineText}`;
            });
            return { lines: renderedLines, ...cursorPosition };
        }
        let remainingCursor = Math.max(0, Math.min(cursorPos, normalizedValue.length));
        const renderedLines = lines.map((lineValue, lineIndex) => {
            const prefixValue = lineIndex === 0 ? prompt : continuationPrompt;
            const promptText = prefixValue
                ? this.applyAnsi(prefixValue, this.mergeStyles(mergedStyle, promptStyle), undefined, true)
                : '';
            const cursorOnLine = remainingCursor <= lineValue.length || lineIndex === lines.length - 1;
            if (!cursorOnLine) {
                remainingCursor -= lineValue.length + 1;
                const lineText = lineValue
                    ? this.applyAnsi(lineValue, this.mergeStyles(mergedStyle, placeholderActive ? {} : valueStyle), undefined, true)
                    : '';
                return `${promptText}${lineText}`;
            }
            const safeCursorPos = Math.max(0, Math.min(remainingCursor, lineValue.length));
            const beforeCursor = lineValue.slice(0, safeCursorPos);
            const cursorChar = safeCursorPos < lineValue.length ? lineValue[safeCursorPos] : cursor;
            const afterCursor = safeCursorPos < lineValue.length ? lineValue.slice(safeCursorPos + 1) : '';
            const beforeText = beforeCursor
                ? this.applyAnsi(beforeCursor, this.mergeStyles(mergedStyle, placeholderActive ? {} : valueStyle), undefined, true)
                : '';
            const cursorText = this.applyAnsi(
                cursorChar,
                this.mergeStyles(
                    this.mergeStyles(mergedStyle, placeholderActive ? {} : valueStyle),
                    cursorStyle
                ),
                undefined,
                true
            );
            const afterText = afterCursor
                ? this.applyAnsi(afterCursor, this.mergeStyles(mergedStyle, placeholderActive ? {} : valueStyle), undefined, true)
                : '';
            remainingCursor = 0;
            return `${promptText}${beforeText}${cursorText}${afterText}`;
        });
        return { lines: renderedLines, ...cursorPosition };
    }
}

@Injectable()
export class TuiTemplateCompiler extends AbstractTemplateCompiler {
    constructor(
        readonly parser: ConsoleTemplateParser,
        readonly renderer: ConsoleRenderer,
        @Inject(CONSOLE_TEMPLATE, { defaultValue: DEFAULT_CONSOLE_TEMPLATE_OPTIONS }) protected options: TemplateCompilerOptions
    ) {
        super();
    }
}

@Module({
    imports: [CommonComponentsModule],
    declarations: [],
    providers: [
        TuiRenderer,
        ConsoleTemplateParser,
        TuiTemplateCompiler,
        ...provideConsoleTemplateDefaults(DEFAULT_CONSOLE_TEMPLATE_OPTIONS),
        { provide: ConsoleRenderer, useExisting: TuiRenderer },
        { provide: Renderer, useExisting: TuiRenderer, asDefault: true },
        { provide: TemplateParser, useExisting: ConsoleTemplateParser, asDefault: true },
        { provide: TemplateCompiler, useClass: TuiTemplateCompiler, deps: [ConsoleTemplateParser, ConsoleRenderer, CONSOLE_TEMPLATE], asDefault: true }
    ],
    exports: [
        CommonComponentsModule,
        TuiRenderer,
        ConsoleRenderer,
        ConsoleTemplateParser,
        TuiTemplateCompiler
    ]
})
export class TuiTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<TuiTemplateModule> {
        return {
            module: TuiTemplateModule,
            providers: [{ provide: CONSOLE_TEMPLATE, useValue: options }]
        };
    }
}

@Module({
    providedIn: 'root',
    imports: [TuiTemplateModule],
    providers: [
        ...provideConsoleTerminalLifecycle()
    ],
    exports: [
        CommonComponentsModule,
        TuiTemplateModule,
        TuiRenderer,
        ConsoleRenderer,
        ConsoleTemplateParser,
        TuiTemplateCompiler
    ]
})
export class TuiConsoleModule {
    static withOptions(options: TemplateCompilerOptions): any {
        return {
            module: TuiConsoleModule,
            providers: [],
            imports: [TuiTemplateModule.withOptions(options)]
        } as any;
    }
}

export const ConsoleTemplateCompiler = TuiTemplateCompiler;
export const ConsoleTemplateModule = TuiTemplateModule;
