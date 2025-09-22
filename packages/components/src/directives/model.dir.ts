import { Host } from '@tsdi/ioc';
import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { RElement } from '../renderer/Node';
import { ReactiveEffect } from '../ReactiveEffect';

/**
 * v-model directive component.
 *
 * @export
 * @class VModelDirective
 */
@Directive({
    selector: '[v-model]'
})
export class VModelDirective {
    private _value: any = null;
    private _propName: string | null = null;
    private _context: any = null;

    constructor(
        @Host() private elementRef: ElementRef,
        @Host() private effect: ReactiveEffect,
        
    ) { }

    set model(propExpr: string) {
        // 解析属性表达式
        this._propName = propExpr;
        // 获取上下文对象（实际应用中需要从注入器中获取）
        // this._context = ...;
        this.setupBinding();
    }

    private setupBinding() {
        const element = this.elementRef.nativeElement;

        // 设置初始值
        if (this._context && this._propName) {
            this._value = this._context[this._propName];
            this.updateElementValue(element, this._value);
        }

        // 设置响应式更新
        this.effect.run(() => {
            if (this._context && this._propName) {
                const newValue = this._context[this._propName];
                if (newValue !== this._value) {
                    this._value = newValue;
                    this.updateElementValue(element, this._value);
                }
            }
        });

        // 设置事件监听
        this.setupEventListeners(element);
    }

    private updateElementValue(element: any, value: any) {
        if (element.tagName === 'INPUT') {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = !!value;
            } else {
                element.value = value !== undefined ? value : '';
            }
        } else if (element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
            element.value = value !== undefined ? value : '';
        }
    }

    private setupEventListeners(element: RElement) {
        const updateModelValue = (value: any) => {
            if (this._context && this._propName) {
                this._context[this._propName] = value;
                this._value = value;
            }
        };

        if (element.tagName === 'INPUT') {
            if (element.type === 'checkbox') {
                element.addEventListener('change', (event: any) => {
                    updateModelValue(event.target.checked);
                });
            } else if (element.type === 'radio') {
                element.addEventListener('change', (event: any) => {
                    if (event.target.checked) {
                        updateModelValue(event.target.value);
                    }
                });
            } else {
                element.addEventListener('input', (event: any) => {
                    updateModelValue(event.target.value);
                });
            }
        } else if (element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
            element.addEventListener('input', (event: any) => {
                updateModelValue(event.target.value);
            });
        }
    }
}
