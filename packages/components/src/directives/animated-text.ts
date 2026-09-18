import { Injectable } from '@tsdi/ioc';
import { Attribute } from '../decorators/atteribute';
import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { DirectiveType } from '../refs/directive';
import { Optional } from '@tsdi/ioc';

/**
 * @deprecated 动画现由渲染时的 Date.now() 派生，不再需要 tick 服务。
 * 保留该类型以兼容已有 consumer 的导入与注入配置。
 */
@Injectable()
export class AnimatedTextLifecycleService {
}

/**
 * 字符光扫文本指令（属性指令，挂载于宿主元素上）。
 *
 * 字符扫描位置在真实数据驱动的渲染中由 Date.now() 派生，不创建定时器，
 * 也不为动画额外触发渲染。
 *
 * 用法（宿主组件模板）：
 * ```html
 * <span animated-text
 *     :text="workingText"
 *     :interval="120"
 *     :scan-width="3"
 *     :active-style="workingActiveStyle"
 *     :trail-style="workingTrailStyle"
 *     :base-style="workingBaseStyle"></span>
 * ```
 *
 * 其中 `workingText` 为任意长度文本（多语言直接传 Unicode 文本）：
 * ```ts
 * workingText = '• Working';
 * workingActiveStyle = { color: '#f0883e', 'font-weight': 'bold' };
 * workingTrailStyle = { color: '#f0a85e' };
 * workingBaseStyle = { color: '#8b949e' };
 * ```
 *
 * 效果：一个可配置宽度的高亮光带从文本左侧向右扫过，光带字符用 activeStyle，
 * 已扫过的字符用 trailStyle（渐隐尾迹），未扫到的用 baseStyle；循环或单次。
 *
 * @export
 * @class AnimatedTextDirective
 */
@Directive({
    selector: '[animated-text]',
    dirType: DirectiveType.Normal
})
export class AnimatedTextDirective {

    protected _text = '';
    protected _interval = 120;
    protected _scanWidth = 1;
    protected _loop = true;
    protected charSpans: any[] = [];

    @Attribute()
    activeStyle: Record<string, string> = {};

    @Attribute()
    trailStyle?: Record<string, string>;

    @Attribute()
    baseStyle: Record<string, string> = {};

    @Attribute()
    renderRegion = '';

    constructor(
        protected elementRef?: ElementRef,
        protected renderer?: Renderer,
        @Optional() protected lifecycle?: AnimatedTextLifecycleService
    ) {
    }

    @Attribute()
    set text(value: string) {
        const next = String(value ?? '');
        if (next !== this._text) {
            this._text = next;
            this.render();
        }
    }

    get text(): string {
        return this._text;
    }

    @Attribute()
    set interval(value: number) {
        const next = Number(value) || 120;
        if (next !== this._interval) {
            this._interval = next;
        }
    }

    get interval(): number {
        return this._interval;
    }

    @Attribute()
    set scanWidth(value: number) {
        this._scanWidth = Math.max(1, Math.floor(Number(value) || 1));
    }

    get scanWidth(): number {
        return this._scanWidth;
    }

    @Attribute()
    set loop(value: boolean) {
        this._loop = value !== false;
    }

    get loop(): boolean {
        return this._loop;
    }

    protected get charList(): string[] {
        return Array.from(this._text || '');
    }

    get scanIndex(): number {
        const len = this.charList.length;
        if (!len) {
            return 0;
        }
        const offset = Math.floor(Date.now() / Math.max(1, this._interval));
        return this._loop ? offset % len : Math.min(offset, len - 1);
    }

    get chars(): { text: string; style: Record<string, string> }[] {
        const list = this.charList;
        const head = this.scanIndex;
        const merged: { text: string; style: Record<string, string> }[] = [];
        let pendingSpace = '';
        list.forEach((ch, i) => {
            let style = this.baseStyle || {};
            if (i >= head && i < head + this.scanWidth) {
                style = this.activeStyle || style;
            } else if (i < head) {
                style = this.trailStyle || style;
            }
            // 独立空格 span 会被 TUI/HTML 渲染器丢弃；前置到下一个字符
            // 可跨 ANSI 样式边界保留光扫文本中的单词间距。
            if (ch === ' ') {
                pendingSpace += ch;
                return;
            }
            merged.push({ text: `${pendingSpace}${ch}`, style });
            pendingSpace = '';
        });
        if (pendingSpace && merged.length) {
            merged[merged.length - 1].text += pendingSpace;
        }
        return merged;
    }

    onInit(): void {
        if (this.charList.length) {
            this.render();
        }
    }

    protected render(): void {
        const renderer = this.renderer;
        const el = this.elementRef?.nativeElement;
        if (!renderer || !el) {
            return;
        }

        const oldChildren = Array.from((el.childNodes || []) as any[]);
        oldChildren.forEach(child => renderer.removeChild(el, child));
        this.charSpans = [];

        this.chars.forEach(item => {
            const span = renderer.createElement('span');
            const textNode = renderer.createText(item.text);
            renderer.appendChild(span, textNode);
            Object.entries(item.style).forEach(([key, value]) => {
                renderer.setStyle(span, key, String(value ?? ''));
            });
            renderer.appendChild(el, span);
            this.charSpans.push(span);
        });
    }
}
