import { Host } from '@tsdi/ioc';
import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { ElementRef } from '../refs/element';

/**
 * VFor directive metadata.
 *
 * @export
 * @interface VForDirectiveMetadata
 */
export interface VForDirectiveMetadata {
    /**
     * v-for expression.
     *
     * @type {*}
     * @memberof VForDirectiveMetadata
     */
    for?: any;
    /**
     * v-for of.
     *
     * @type {*}
     * @memberof VForDirectiveMetadata
     */
    of?: any;
}

/**
 * v-for directive component.
 *
 * @export
 * @class VForDirective
 */
@Directive({
    selector: '[v-for],[*for]'
})
export class VForDirective {
    private _viewRefs: any[] = [];
    private _prevValue: any = null;

    constructor(
        @Host() private viewContainer: ViewContainerRef,
        @Host() private templateRef: TemplateRef<any>,
        @Host() private elementRef: ElementRef
    ) { }

    set for(expr: string) {
        if (expr) {
            this.processForExpression(expr);
        }
    }

    set of(collection: any) {
        this.updateView(collection);
    }

    private processForExpression(expr: string) {
        // 解析v-for表达式，支持"item in items"和"(item, index) in items"格式
        const inMatch = expr.match(/^(\([^)]+\)|[^)]+)\s+(?:in|of)\s+([^]+)$/);
        if (inMatch) {
            // 保存表达式解析结果供后续使用
            // 实际应用中需要更复杂的解析逻辑
        }
    }

    private updateView(collection: any) {
        if (collection === this._prevValue) {
            return;
        }

        this._prevValue = collection;
        this.clear();

        if (!collection || typeof collection !== 'object') {
            return;
        }

        // 处理数组
        if (Array.isArray(collection)) {
            for (let i = 0; i < collection.length; i++) {
                this.createView({
                    $implicit: collection[i],
                    index: i,
                    first: i === 0,
                    last: i === collection.length - 1,
                    even: i % 2 === 0,
                    odd: i % 2 === 1
                });
            }
        }
        // 处理对象
        else if (collection !== null && typeof collection === 'object') {
            let index = 0;
            const keys = Object.keys(collection);
            const len = keys.length;
            
            for (const key of keys) {
                this.createView({
                    $implicit: collection[key],
                    key: key,
                    index: index,
                    first: index === 0,
                    last: index === len - 1,
                    even: index % 2 === 0,
                    odd: index % 2 === 1
                });
                index++;
            }
        }
    }

    private createView(context: any) {
        const viewRef = this.viewContainer.createEmbeddedView(this.templateRef, context);
        this._viewRefs.push(viewRef);
    }

    private clear() {
        this.viewContainer.clear();
        this._viewRefs.forEach(view => view.destroy());
        this._viewRefs = [];
    }

    ngOnDestroy() {
        this.clear();
    }
}
