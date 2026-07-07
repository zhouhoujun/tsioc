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

const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';

const tuiDefaultOptions = {
    delimiters: ['{{', '}}']
} as TemplateCompilerOptions;

export interface TuiRenderOptions {
    width?: number;
}

@Injectable()
export class TuiRenderer extends ConsoleRenderer {
    renderToTuiLines(node: RNode | RNode[], options: TuiRenderOptions = {}): string[] {
        const nodes = Array.isArray(node) ? node : [node];
        const lines: string[] = [];
        const width = options.width;
        nodes.forEach(current => this.walkTuiNode(current as ConsoleNode, lines, {}, width));
        while (lines.length && !this.stripAnsi(lines[lines.length - 1]).trim()) {
            lines.pop();
        }
        return lines;
    }

    protected walkTuiNode(current: ConsoleNode, lines: string[], inherited: Record<string, string>, width?: number): void {
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
        const tag = (element.tagName || '').toLowerCase();
        const text = this.collectText(element);

        switch (tag) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
                if (text) {
                    lines.push(this.renderInlineLine(element, { ...styleMap, 'font-weight': 'bold' }, width));
                }
                return;
            case 'p':
            case 'label':
            case 'li':
                if (text) {
                    lines.push(this.renderInlineLine(element, styleMap, width));
                }
                return;
            case 'span':
            case 'a':
                if (text) {
                    lines.push(this.renderInlineLine(element, styleMap, width));
                }
                return;
            case 'button':
                if (text) {
                    lines.push(this.applyAnsi(`[ ${this.renderInlineText(element, styleMap)} ]`, styleMap, width));
                }
                return;
            case 'input': {
                const value = element.getAttribute('value') || text || ' ';
                lines.push(this.applyAnsi(value, styleMap, width));
                return;
            }
            case 'br':
                lines.push('');
                return;
            case 'section': {
                const start = lines.length;
                element.childNodes.forEach(child => this.walkTuiNode(child as ConsoleNode, lines, styleMap, width));
                if (lines.length > start && this.stripAnsi(lines[lines.length - 1]).trim()) {
                    lines.push('');
                }
                return;
            }
            default:
                element.childNodes.forEach(child => this.walkTuiNode(child as ConsoleNode, lines, styleMap, width));
                return;
        }
    }

    protected renderInlineLine(element: ConsoleElement, inherited: Record<string, string>, width?: number): string {
        const line = this.renderInlineText(element, inherited);
        const background = inherited['background-color'] || inherited.background;
        if (!background || !width) {
            return line;
        }
        const visibleLength = this.stripAnsi(line).length;
        if (visibleLength >= width) {
            return line;
        }
        return `${line}${this.applyAnsi(' '.repeat(width - visibleLength), inherited, undefined, true)}`;
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
            return this.applyAnsi(this.normalizeInlineWhitespace(value), inherited, undefined, true);
        }
        const element = current as ConsoleElement;
        const styleMap = this.mergeStyles(inherited, this.getStyleMap(element));
        const tag = (element.tagName || '').toLowerCase();
        if (tag === 'br') {
            return '';
        }
        if (tag === 'input') {
            const value = element.getAttribute('value') || this.collectText(element) || ' ';
            return this.applyAnsi(value, styleMap);
        }
        return element.childNodes
            .map(child => this.renderInlineText(child as ConsoleNode, styleMap))
            .join('');
    }

    protected collectText(current: ConsoleNode): string {
        if (current instanceof ConsoleText || current instanceof ConsoleComment) {
            return current.textContent || '';
        }
        if (current instanceof ConsoleElement) {
            return current.childNodes.map(child => this.collectText(child as ConsoleNode)).join('').trim();
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
        return `${codes.join('')}${text}${ANSI_RESET}`;
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

    protected extractHexColor(value: string): string | undefined {
        const match = value.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
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
        if (visible.length >= width) {
            return visible.slice(0, width);
        }
        return `${value}${' '.repeat(width - visible.length)}`;
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
    exports: [TuiRenderer, ConsoleRenderer, ConsoleTemplateParser, TuiTemplateCompiler]
})
export class TuiTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<TuiTemplateModule> {
        return {
            module: TuiTemplateModule,
            providers: [{ provide: CONSOLE_TEMPLATE, useValue: options }]
        };
    }
}
