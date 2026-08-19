import { Injectable } from '@tsdi/ioc';
import { Runner, Shutdown } from '@tsdi/core';
import { Attribute } from '../decorators/atteribute';
import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { DirectiveType } from '../refs/directive';
import { Optional } from '@tsdi/ioc';

/**
 * 动画共享 tick 生命周期服务。
 *
 * 作为 Application.run 生命周期成员：@Runner 启动共享 tick，@Shutdown/onDestroy
 * 在应用关闭时停止 —— 与 ConsoleTerminalApplicationLifecycleService 同构。
 * 动画指令订阅该服务的 tick 事件推进动画，不自行创建定时器，从而避免
 * 定时器脱离应用生命周期而泄漏、干扰测试时序与进程自然退出。
 */
@Injectable()
export class AnimatedTextLifecycleService {
    protected readonly interval = 200;
    protected timer?: ReturnType<typeof setInterval>;
    protected listeners = new Set<() => void>();

    @Runner()
    start(): void {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            this.listeners.forEach(fn => fn());
        }, this.interval);
        this.timer.unref?.();
    }

    @Shutdown()
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        this.listeners.clear();
    }

    onDestroy(): void {
        this.stop();
    }

    subscribe(listener: () => void): void {
        this.listeners.add(listener);
    }

    unsubscribe(listener: () => void): void {
        this.listeners.delete(listener);
    }
}

/**
 * 字符光扫文本指令（属性指令，挂载于宿主元素上）。
 *
 * 周期驱动字符扫描：指令订阅 AnimatedTextLifecycleService 的共享 tick，
 * 每个 tick 前进一个字符并重建逐字符 span。浏览器端直接更新 DOM 子节点；
 * TUI 端通过 ConsoleText textContent setter 触发 CHANGE_EVENT，驱动
 * TuiTerminalSurface 重渲染。tick 由 Application.run 生命周期统一启停，
 * 指令自身不创建定时器。
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
    protected scanOffset = 0;
    protected tickActive = false;
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
            this.scanOffset = 0;
            this.render();
            if (this.charList.length) {
                this.startTick();
            } else {
                this.stopTick();
            }
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
        return this._loop ? this.scanOffset % len : Math.min(this.scanOffset, len - 1);
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
            this.startTick();
        }
    }

    onDestroy(): void {
        this.stopTick();
    }

    protected startTick(): void {
        if (this.tickActive) {
            return;
        }
        if (!this.lifecycle) {
            return;
        }
        this.tickActive = true;
        this.listener = () => this.tick();
        this.lifecycle.subscribe(this.listener);
    }

    protected stopTick(): void {
        if (!this.tickActive) {
            return;
        }
        this.tickActive = false;
        this.lifecycle?.unsubscribe(this.listener);
        this.listener = () => {};
    }

    protected tick(): void {
        const len = this.charList.length;
        if (!len) {
            this.stopTick();
            return;
        }
        const el = this.elementRef?.nativeElement;
        // 指令实例可能随渲染周期重建但旧实例未被销毁：宿主元素已脱离文档时
        // 停止 tick，避免废弃实例持续干扰宿主应用。
        if (!el || el.parentNode == null) {
            this.stopTick();
            return;
        }
        this.scanOffset += 1;
        if (!this._loop && this.scanOffset >= len) {
            this.stopTick();
        }
        this.render();
    }

    protected listener: () => void = () => {};

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
