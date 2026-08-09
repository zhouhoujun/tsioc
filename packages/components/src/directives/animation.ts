import { Optional } from '@tsdi/ioc';
import { Directive } from '../decorators/directive';
import { Attribute } from '../decorators/atteribute';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { DirectiveType } from '../refs/directive';
import { AnimatedTextLifecycleService } from './animated-text';

/**
 * 动画帧定义。
 *
 * @export
 * @interface AnimatedFrame
 */
export interface AnimatedFrame {
    text?: string;
    style?: Record<string, string> | string;
}

/**
 * 帧序列类型：字符串（纯文本帧）或 AnimatedFrame（文本 + 样式帧）。
 *
 * @export
 * @typedef {AnimatedFrameItem}
 */
export type AnimatedFrameItem = string | AnimatedFrame;

/**
 * 动画帧序列指令（属性指令，挂载于宿主元素上）。
 *
 * 周期驱动帧动画：指令订阅 AnimatedTextLifecycleService 的共享 tick，
 * 每个 tick 推进一帧并更新宿主元素（文本子节点 + 样式）。浏览器端直接更新
 * DOM；TUI 端通过 ConsoleText.textContent setter 触发 CHANGE_EVENT，驱动
 * TuiTerminalSurface 重渲染。tick 由 Application.run 生命周期统一启停，
 * 指令自身不创建定时器。
 *
 * 用法（宿主组件模板）：
 * ```html
 * <span animation-frame :frames="workingFrames" :interval="300"></span>
 * ```
 *
 * @export
 * @class AnimatedFrameDirective
 */
@Directive({
    selector: '[animation-frame]',
    dirType: DirectiveType.Normal
})
export class AnimatedFrameDirective {

    protected _frames: AnimatedFrameItem[] | string = [];
    protected _interval = 300;
    protected _loop = true;
    protected textNode: any = null;
    protected appliedStyleKeys: string[] = [];
    protected tickActive = false;
    protected frameOffset = 0;

    @Attribute()
    renderRegion = '';

    constructor(
        protected elementRef?: ElementRef,
        protected renderer?: Renderer,
        @Optional() protected lifecycle?: AnimatedTextLifecycleService
    ) {
    }

    @Attribute()
    set frames(value: AnimatedFrameItem[] | string) {
        this._frames = value;
    }

    get frames(): AnimatedFrameItem[] | string {
        return this._frames;
    }

    @Attribute()
    set interval(value: number) {
        const next = Number(value) || 300;
        if (next !== this._interval) {
            this._interval = next;
        }
    }

    get interval(): number {
        return this._interval;
    }

    @Attribute()
    set loop(value: boolean) {
        this._loop = value !== false;
    }

    get loop(): boolean {
        return this._loop;
    }

    protected get frameList(): AnimatedFrameItem[] {
        if (Array.isArray(this._frames)) {
            return this._frames;
        }
        if (typeof this._frames === 'string') {
            return this._frames.split(/[,，、\s]+/).filter(f => f !== '');
        }
        return [];
    }

    get frameIndex(): number {
        const len = this.frameList.length;
        if (!len) {
            return 0;
        }
        return this._loop ? this.frameOffset % len : Math.min(this.frameOffset, len - 1);
    }

    get frameText(): string {
        const frame = this.frameList[this.frameIndex];
        if (typeof frame === 'string') {
            return frame;
        }
        return frame?.text ?? '';
    }

    get frameStyle(): Record<string, string> | string {
        const frame = this.frameList[this.frameIndex];
        if (typeof frame === 'object') {
            return frame?.style ?? {};
        }
        return {};
    }

    onInit(): void {
        this.applyFrame();
        if (this.frameList.length) {
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
        const len = this.frameList.length;
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
        this.frameOffset += 1;
        this.applyFrame();
    }

    protected listener: () => void = () => {};

    protected applyFrame(): void {
        const renderer = this.renderer;
        const el = this.elementRef?.nativeElement;
        if (!renderer || !el) {
            return;
        }

        const oldChildren = Array.from((el.childNodes || []) as any[]);
        oldChildren.forEach(child => renderer.removeChild(el, child));

        const textNode = renderer.createText(this.frameText);
        renderer.appendChild(el, textNode);
        this.textNode = textNode;

        const style = this.frameStyle;
        const nextKeys = typeof style === 'object' ? Object.keys(style) : [];
        this.appliedStyleKeys
            .filter(key => !nextKeys.includes(key))
            .forEach(key => renderer.removeStyle?.(el, key));
        nextKeys.forEach(key => {
            renderer.setStyle(el, key, String((style as Record<string, string>)[key] ?? ''));
        });
        this.appliedStyleKeys = nextKeys;
    }
}
