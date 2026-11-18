import { Attribute, Directive, DirectiveType, ElementRef, OnDestroy, OnInit, Renderer } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { ICON_SVG_NAMESPACE } from './icon.types';
import { iconGlyphText, iconPathAttributes } from './icon-library';
import { installIconStyles } from './icon.styles';

const SIZES = ['xs', 'sm', 'md', 'lg'];
const DEFAULT_SIZE = 'sm';
const SIZE_CLASS = 'tsdi-icon';

type RenderedNode = any;

/**
 * Shared icon directive.
 *
 * Attach the directive to an `<icon>` element and it draws the registered
 * vector (plus a glyph fallback for text-only renderers) inside that element:
 *
 * ```html
 * <icon name="run" size="sm"></icon>
 * <icon [name]="node.type" [glyph]="node.icon" size="sm"></icon>
 * <icon name="custom" glyph="◆" size="md" label="Custom node"></icon>
 * ```
 *
 * The host element keeps its own classes/layout; the directive only adds the
 * `tsdi-icon` skin classes, the SVG and the fallback glyph. Legacy glyphs passed
 * as `icon`/`glyph` are resolved to their registered vector when one exists.
 */
@Directive({
    selector: 'icon, ui-icon',
    dirType: DirectiveType.Normal
})
export class IconDirective implements OnInit, OnDestroy {
    protected iconName = '';
    protected glyphValue = '';
    protected sizeValue = DEFAULT_SIZE;
    protected labelValue = '';
    protected strokeValue: number | string | undefined;
    protected ready = false;
    protected pendingRender = false;

    constructor(
        @Optional() protected elementRef?: ElementRef,
        @Optional() protected renderer?: Renderer
    ) { }

    /** Registered icon name for the element form (`<icon name="run">`). */
    @Attribute()
    set name(value: string) {
        const next = value == null ? '' : String(value);
        if (next === this.iconName) {
            return;
        }
        this.iconName = next;
        this.scheduleRender();
    }
    get name(): string {
        return this.iconName;
    }

    /** Registered icon name, or a legacy glyph. */
    @Attribute()
    set icon(value: string) {
        const next = value == null ? '' : String(value);
        if (next === this.iconName) {
            return;
        }
        this.iconName = next;
        this.scheduleRender();
    }
    get icon(): string {
        return this.iconName;
    }

    /** Glyph fallback (also used to resolve legacy node icons by character). */
    @Attribute()
    set glyph(value: string) {
        const next = value == null ? '' : String(value);
        if (next === this.glyphValue) {
            return;
        }
        this.glyphValue = next;
        this.scheduleRender();
    }
    get glyph(): string {
        return this.glyphValue;
    }

    /** Named size shared by every host: `xs`, `sm`, `md` or `lg`. */
    @Attribute()
    set size(value: string) {
        const next = SIZES.includes(String(value)) ? String(value) : DEFAULT_SIZE;
        if (next === this.sizeValue) {
            return;
        }
        this.sizeValue = next;
        this.scheduleRender();
    }
    get size(): string {
        return this.sizeValue;
    }

    /** Optional accessible label; when omitted the icon is decorative. */
    @Attribute()
    set label(value: string) {
        const next = value == null ? '' : String(value);
        if (next === this.labelValue) {
            return;
        }
        this.labelValue = next;
        this.scheduleRender();
    }
    get label(): string {
        return this.labelValue;
    }

    /** Optional stroke-width override inside the 16x16 viewBox. */
    @Attribute()
    set strokeWidth(value: number | string) {
        if (value === this.strokeValue) {
            return;
        }
        this.strokeValue = value;
        this.scheduleRender();
    }
    get strokeWidth(): number | string | undefined {
        return this.strokeValue;
    }

    get glyphText(): string {
        return iconGlyphText(this.iconName, this.glyphValue);
    }

    get pathAttributes(): Array<Record<string, string>> {
        return iconPathAttributes(this.iconName, this.glyphValue, this.strokeValue);
    }

    onInit(): void {
        // Plain attributes such as `<icon name="run" size="sm" label="Run">` are
        // assigned to these @Attribute setters by the compiler; no manual
        // attribute scan is needed (kebab-case aliases are handled there too).
        const el = this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined;
        installIconStyles(el?.ownerDocument);
        this.ready = true;
        this.render();
    }

    onDestroy(): void {
        this.pendingRender = false;
        this.ready = false;
        this.clear();
    }

    /** Coalesce attribute writes from one binding pass into a single redraw. */
    protected scheduleRender(): void {
        if (!this.ready || this.pendingRender) {
            return;
        }
        this.pendingRender = true;
        void Promise.resolve().then(() => {
            this.pendingRender = false;
            if (this.ready) {
                this.render();
            }
        });
    }

    protected render(): void {
        if (!this.ready) {
            return;
        }
        const el = this.elementRef?.nativeElement;
        const renderer = this.renderer;
        if (!el || !renderer) {
            return;
        }

        this.applyHostAttributes(el, renderer);

        this.clear();
        const paths = this.pathAttributes;
        if (paths.length) {
            const svg = renderer.createElement('svg', ICON_SVG_NAMESPACE);
            renderer.setAttribute(svg, 'class', 'tsdi-icon-svg');
            renderer.setAttribute(svg, 'viewBox', '0 0 16 16');
            renderer.setAttribute(svg, 'aria-hidden', 'true');
            renderer.setAttribute(svg, 'focusable', 'false');
            paths.forEach(attrs => {
                const path = renderer.createElement('path', ICON_SVG_NAMESPACE);
                Object.entries(attrs).forEach(([key, value]) => {
                    renderer.setAttribute(path, key, value);
                });
                renderer.appendChild(svg, path);
            });
            renderer.appendChild(el, svg);
        }

        const glyph = this.glyphText;
        if (glyph) {
            const span = renderer.createElement('span');
            renderer.setAttribute(span, 'class', 'tsdi-icon-glyph');
            renderer.setAttribute(span, 'aria-hidden', 'true');
            renderer.appendChild(span, renderer.createText(glyph));
            renderer.appendChild(el, span);
        }
    }

    protected applyHostAttributes(el: any, renderer: Renderer): void {
        renderer.addClass(el, 'tsdi-icon');
        SIZES.forEach(size => {
            renderer.removeClass(el, `${SIZE_CLASS}-${size}`);
        });
        renderer.addClass(el, `${SIZE_CLASS}-${this.sizeValue}`);
        renderer.setAttribute(el, 'data-icon', this.iconName);
        renderer.setAttribute(el, 'role', this.labelValue ? 'img' : 'presentation');
        renderer.setAttribute(el, 'aria-hidden', this.labelValue ? 'false' : 'true');
        if (this.labelValue) {
            renderer.setAttribute(el, 'aria-label', this.labelValue);
            renderer.setAttribute(el, 'title', this.labelValue);
        } else {
            renderer.removeAttribute(el, 'aria-label');
            renderer.removeAttribute(el, 'title');
        }
    }

    protected clear(): void {
        const renderer = this.renderer;
        const el = this.elementRef?.nativeElement;
        if (!renderer || !el) {
            return;
        }
        // The icon host owns its content. Clear every child (not just our own
        // tracked nodes) so a second binding pass on the same host cannot leave
        // duplicate SVG/glyph pairs behind.
        Array.from(((el as any).childNodes || []) as RenderedNode[]).forEach(node => {
            renderer.removeChild(el, node);
        });
    }
}
