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
 * 当前帧在真实数据驱动的渲染中由 Date.now() 派生，不创建定时器，也不为
 * 动画额外触发渲染。
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
        const offset = Math.floor(Date.now() / Math.max(1, this._interval));
        return this._loop ? offset % len : Math.min(offset, len - 1);
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
    }

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
