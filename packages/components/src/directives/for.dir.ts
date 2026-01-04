import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { NodeType } from '../renderer/Node';
import { DirectiveType } from '../refs/directive';

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
    selector: '[v-for],[*for]',
    nodeType: NodeType.Container,
    directiveType: DirectiveType.List,
    priority: 20
})
export class VForDirective {
    private _viewRefs: any[] = [];
    private _prevValue: any = null;
    private _itemNames: string[] = []; // 保存循环变量名
    private _collectionExpr = ''; // 保存集合表达式

    constructor(
        private viewContainer: ViewContainerRef,
        private templateRef: TemplateRef<any>,
    ) { }

    @Attribute()
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
        const inMatch = expr.match(/^\s*((?:\([^)]+\)|[^)])+)\s+(?:in|of)\s+([^]+)$/);
        if (inMatch) {
            const [, itemPart, collectionPart] = inMatch;
            this._collectionExpr = collectionPart.trim();

            // 解析循环变量名
            if (itemPart.trim().startsWith('(')) {
                // 处理格式如 (item, index) 的情况
                const innerMatch = itemPart.trim().match(/^\(\s*([^,]+)\s*(?:,\s*([^)]+))?\s*\)$/);
                if (innerMatch) {
                    this._itemNames = [innerMatch[1].trim(), innerMatch[2]?.trim() || ''].filter(Boolean);
                }
            } else {
                // 处理格式如 item 的情况
                this._itemNames = [itemPart.trim()];
            }
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
                // 创建上下文对象，确保item和index等变量正确设置
                const context: any = {
                    $implicit: collection[i],
                    index: i,
                    first: i === 0,
                    last: i === collection.length - 1,
                    even: i % 2 === 0,
                    odd: i % 2 === 1
                };

                // 设置用户定义的循环变量名
                if (this._itemNames.length > 0) {
                    context[this._itemNames[0]] = collection[i];
                }
                if (this._itemNames.length > 1) {
                    context[this._itemNames[1]] = i;
                }

                this.createView(context);
            }
        }
        // 处理对象
        else if (collection !== null && typeof collection === 'object') {
            let index = 0;
            const keys = Object.keys(collection);
            const len = keys.length;

            for (const key of keys) {
                // 创建上下文对象，确保key、value等变量正确设置
                const context: any = {
                    $implicit: collection[key],
                    key: key,
                    index: index,
                    first: index === 0,
                    last: index === len - 1,
                    even: index % 2 === 0,
                    odd: index % 2 === 1
                };

                // 设置用户定义的循环变量名
                if (this._itemNames.length > 0) {
                    context[this._itemNames[0]] = collection[key];
                }
                if (this._itemNames.length > 1) {
                    context[this._itemNames[1]] = key;
                }
                if (this._itemNames.length > 2) {
                    context[this._itemNames[2]] = index;
                }

                this.createView(context);
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