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
    ConsoleText
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
import { provideConsoleTerminalLifecycle } from './terminal';
import { TuiInputComponent, TuiTextareaComponent, TuiSelectComponent, LabelComponent } from './components';

const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';

const tuiDefaultOptions = {
    delimiters: ['{{', '}}']
} as TemplateCompilerOptions;

export interface TuiRenderOptions {
    width?: number;
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

    renderToTuiLayout(node: RNode | RNode[], options: TuiRenderOptions = {}): TuiRenderLayout {
        const nodes = Array.isArray(node) ? node : [node];
        const lines: string[] = [];
        const cursorTargets: TuiCursorTarget[] = [];
        const regions: TuiRenderRegionDraft[] = [];
        const width = options.width;
        const visited = new WeakSet<object>();
        nodes.forEach(current => this.walkTuiNode(current as ConsoleNode, lines, {}, width, cursorTargets, regions, visited));
        while (lines.length && !this.stripAnsi(lines[lines.length - 1]).trim()) {
            lines.pop();
        }
        return {
            lines,
            cursorTargets,
            regions: regions.map(region => ({
                id: region.id,
                startRow: region.startRow,
                endRow: region.endRow
            }))
        };
    }

    protected walkTuiNode(
        current: ConsoleNode,
        lines: string[],
        inherited: Record<string, string>,
        width?: number,
        cursorTargets: TuiCursorTarget[] = [],
        regions: TuiRenderRegionDraft[] = [],
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
        const text = this.collectText(element);
        const regionId = this.resolveRenderRegionId(element);
        const regionStart = regionId ? lines.length : -1;
        const finishRegion = () => {
            if (!regionId || lines.length <= regionStart) {
                return;
            }
            const region = { id: regionId, startRow: regionStart, endRow: lines.length };
            regions.push({ ...region, element });
        };

        switch (tag) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
                if (text.trim()) {
                    lines.push(...this.renderInlineLines(element, { ...styleMap, 'font-weight': 'bold' }, width));
                }
                finishRegion();
                return;
            case 'p':
            case 'label':
            case 'li':
                if (text.trim()) {
                    const labelStyle = element.getAttribute('labelStyle');
                    const merged = labelStyle ? this.mergeStyles(styleMap, this.parseInlineStyle(labelStyle)) : styleMap;
                    lines.push(...this.renderInlineLines(element, merged, width));
                }
                finishRegion();
                return;
            case 'span':
            case 'a':
                if (text.trim()) {
                    const textStyle = element.getAttribute('textStyle');
                    const merged = textStyle ? this.mergeStyles(styleMap, this.parseInlineStyle(textStyle)) : styleMap;
                    lines.push(...this.renderInlineLines(element, merged, width));
                }
                finishRegion();
                return;
            case 'button':
                if (text.trim()) {
                    lines.push(this.applyAnsi(`[ ${this.renderInlineText(element, styleMap)} ]`, styleMap, width));
                }
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
                if (title) {
                    lines.push(this.applyAnsi(title, this.mergeStyles(styleMap, {
                        'font-weight': 'bold',
                        ...titleStyle
                    }), width));
                }
                if (meta) {
                    lines.push(this.applyAnsi(meta, this.mergeStyles(styleMap, metaStyle), width));
                }
                const visibleOptions = parsedOptions.slice(visibleStart, visibleStart + visibleWindow.count);
                const optionLabelColumnWidth = resolveConsoleOptionLabelColumnWidth(visibleOptions, visibleStart);
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
                });
                if (detailTitle) {
                    lines.push(this.applyAnsi(detailTitle, this.mergeStyles(styleMap, detailLabelStyle), width));
                }
                if (detailTitle || detailLinesText) {
                    const resolvedDetailLines = detailLines.length
                        ? detailLines
                        : resolveConsoleSelectDetailLines(parsedOptions[safeSelectedIdx] as any);
                    resolvedDetailLines.forEach(line => {
                        lines.push(this.applyAnsi(String(line || ''), this.mergeStyles(styleMap, detailValueStyle), width));
                    });
                }
                if (hint) {
                    lines.push(this.applyAnsi(hint, this.mergeStyles(styleMap, {
                        color: '#6f7c8a',
                        ...hintStyle
                    }), width));
                }
                finishRegion();
                return;
            }
            case 'input': {
                const lineStart = lines.length;
                const value = element.getAttribute('value') || text || '';
                const prompt = element.getAttribute('prompt') || '';
                const cursor = element.getAttribute('cursor') || ' ';
                const placeholder = element.getAttribute('placeholder') || '';
                const cursorPos = parseInt(element.getAttribute('cursorPos') || '0', 10);
                const focused = (element.getAttribute('focused') || '').toLowerCase() === 'true';
                const shellStyle = element.getAttribute('shellStyle') || '';
                const promptStyle = this.parseInlineStyle(element.getAttribute('promptStyle') || '');
                const valueStyle = this.parseInlineStyle(element.getAttribute('valueStyle') || '');
                const placeholderStyle = this.parseInlineStyle(element.getAttribute('placeholderStyle') || 'color: #6e7681;');
                const cursorStyle = this.parseInlineStyle(element.getAttribute('cursorStyle') || 'color: #7ee787; background: #2ea043;');
                const showCursor = (element.getAttribute('showCursor') || 'true').toLowerCase() !== 'false';
                const mergedStyle = shellStyle ? this.mergeStyles(styleMap, this.parseInlineStyle(shellStyle)) : styleMap;
                if (!value && !prompt && !placeholder) {
                    lines.push(this.applyAnsi('', mergedStyle, width));
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
                finishRegion();
                return;
            }
            case 'textarea': {
                const lineStart = lines.length;
                const value = element.getAttribute('value') || text || '';
                const prompt = element.getAttribute('prompt') || '';
                const placeholder = element.getAttribute('placeholder') || '';
                const continuationPrompt = element.getAttribute('continuationPrompt') || '  ';
                const cursor = element.getAttribute('cursor') || ' ';
                const cursorPos = parseInt(element.getAttribute('cursorPos') || '0', 10);
                const focused = (element.getAttribute('focused') || '').toLowerCase() === 'true';
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
                finishRegion();
                return;
            }
            case 'br':
                lines.push('');
                finishRegion();
                return;
            case 'section':
            case 'div': {
                const start = lines.length;
                const childLines: string[] = [];
                const childTargets: TuiCursorTarget[] = [];
                const childRegions: TuiRenderRegionDraft[] = [];
                const childInherited = this.getInheritedStyleMap(styleMap);
                const hasOwnFrame = this.hasBlockFrame(styleMap, width);
                element.childNodes.forEach(child => this.walkTuiNode(child as ConsoleNode, childLines, childInherited, width, childTargets, childRegions, visited));
                const framed = this.renderBlockLines(childLines, styleMap, width);
                lines.push(...framed);
                const offset = this.resolveBlockContentOffset(styleMap);
                childTargets.forEach(target => cursorTargets.push({
                    ...target,
                    row: start + offset.row + target.row,
                    column: offset.column + target.column
                }));
                childRegions.forEach(region => {
                    const absolute = {
                        id: region.id,
                        startRow: start + offset.row + region.startRow,
                        endRow: start + offset.row + region.endRow
                    };
                    regions.push({ ...absolute, element: region.element });
                });
                if (hasOwnFrame && lines.length > start && this.stripAnsi(lines[lines.length - 1]).trim()) {
                    lines.push('');
                }
                finishRegion();
                return;
            }
            default:
                element.childNodes.forEach(child => this.walkTuiNode(child as ConsoleNode, lines, this.getInheritedStyleMap(styleMap), width, cursorTargets, regions, visited));
                finishRegion();
                return;
        }
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

    protected renderBlockLines(lines: string[], styleMap: Record<string, string>, width?: number): string[] {
        const hasFrame = this.hasBlockFrame(styleMap, width);
        if (!hasFrame || !width) {
            return lines;
        }
        const padding = this.resolveBoxPadding(styleMap.padding);
        const hasBorder = !!styleMap.border;
        const innerWidth = Math.max(4, width - (hasBorder ? 2 : 0) - padding.left - padding.right);
        const contentLines = lines.length ? lines : [''];
        const framed: string[] = [];
        const horizontal = hasBorder ? this.applyAnsi('─'.repeat(Math.max(1, width - 2)), styleMap, undefined, true) : '';
        const topPad = ' '.repeat(Math.max(0, padding.top));
        const bottomPad = ' '.repeat(Math.max(0, padding.bottom));
        const renderRow = (raw: string) => {
            const leftPad = this.applyAnsi(' '.repeat(Math.max(0, padding.left)), styleMap, undefined, true);
            const rightPad = this.applyAnsi(' '.repeat(Math.max(0, padding.right)), styleMap, undefined, true);
            const body = this.applyAnsi(this.padVisible(raw, innerWidth), styleMap, undefined, true);
            if (!hasBorder) {
                return `${leftPad}${body}${rightPad}`;
            }
            return `${this.applyAnsi('│', styleMap, undefined, true)}${leftPad}${body}${rightPad}${this.applyAnsi('│', styleMap, undefined, true)}`;
        };
        if (hasBorder) {
            framed.push(`${this.applyAnsi('┌', styleMap, undefined, true)}${horizontal}${this.applyAnsi('┐', styleMap, undefined, true)}`);
        }
        for (let index = 0; index < padding.top; index++) {
            framed.push(renderRow(topPad));
        }
        contentLines.forEach(line => framed.push(renderRow(line)));
        for (let index = 0; index < padding.bottom; index++) {
            framed.push(renderRow(bottomPad));
        }
        if (hasBorder) {
            framed.push(`${this.applyAnsi('└', styleMap, undefined, true)}${horizontal}${this.applyAnsi('┘', styleMap, undefined, true)}`);
        }
        return framed;
    }

    protected resolveBlockContentOffset(styleMap: Record<string, string>): { row: number; column: number } {
        const padding = this.resolveBoxPadding(styleMap.padding);
        const hasFrame = this.hasBlockFrame(styleMap);
        const hasBorder = !!styleMap.border;
        if (!hasFrame) {
            return { row: 0, column: 0 };
        }
        return {
            row: (hasBorder ? 1 : 0) + padding.top,
            column: (hasBorder ? 1 : 0) + padding.left
        };
    }

    protected hasBlockFrame(styleMap: Record<string, string>, width?: number): boolean {
        const hasBoxStyle = !!(styleMap.background || styleMap['background-color'] || styleMap.border || styleMap.padding);
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
        if (getDisplayWidth(visible) >= width) {
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
        @Inject(CONSOLE_TEMPLATE, { defaultValue: tuiDefaultOptions }) protected options: TemplateCompilerOptions
    ) {
        super();
    }
}

@Module({
    declarations: [],
    providers: [
        TuiRenderer,
        ConsoleTemplateParser,
        TuiTemplateCompiler,
        { provide: CONSOLE_TEMPLATE, useValue: tuiDefaultOptions },
        { provide: ConsoleRenderer, useExisting: TuiRenderer },
        { provide: Renderer, useExisting: TuiRenderer, asDefault: true },
        { provide: TemplateParser, useExisting: ConsoleTemplateParser, asDefault: true },
        { provide: TemplateCompiler, useClass: TuiTemplateCompiler, deps: [ConsoleTemplateParser, ConsoleRenderer, CONSOLE_TEMPLATE], asDefault: true }
    ],
    exports: [
        TuiRenderer,
        ConsoleRenderer,
        ConsoleTemplateParser,
        TuiTemplateCompiler,
        TuiInputComponent,
        TuiTextareaComponent,
        TuiSelectComponent,
        LabelComponent
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
        TuiTemplateModule,
        TuiRenderer,
        ConsoleRenderer,
        ConsoleTemplateParser,
        TuiTemplateCompiler,
        TuiInputComponent,
        TuiTextareaComponent,
        TuiSelectComponent,
        LabelComponent
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
