import { lang, isTypeObject } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IBinding } from './IBinding';
import { observe } from './onChange';
import { BindEventType } from './Events';
import { filedMatch, pathCkExp } from './exps';
import { ComponentProvider } from '../ComponentProvider';



/**
 * data binding.
 *
 * @export
 * @abstract
 * @class DataBinding
 * @template T
 */
export abstract class DataBinding<T = any> {

    constructor(protected injector: ICoreInjector, protected provider: ComponentProvider, public source: Object, public binding: IBinding, public expression: string) {

    }

    resolveExression(): T {
        return this.provider.getAstResolver().resolve(this.expression, this.injector, this.source);
    }

    getFileds() {
        return this.expression.match(filedMatch).map(v => v);
    }

    getScope() {
        return this.source;
    }

    getScopeField(): string {
        return pathCkExp.test(this.expression) ? this.expression.substring(this.expression.lastIndexOf('.') + 1) : this.expression;
    }

    abstract bind(target: any): void;

    bindTagChange(field: string, target: any) {
        if (!isTypeObject(target)) {
            return;
        }
        let astResolver = this.provider.getAstResolver();
        let fieldName = this.binding.name;
        if (pathCkExp.test(field)) {
            let paths = field.split('.');
            let idx = field.lastIndexOf('.');
            let scope = field.substring(0, idx);
            let sub = astResolver.resolve(scope, this.injector, this.source);
            let last = field.substring(idx + 1);
            observe.onPropertyChange(this.source, lang.first(paths), (value, oldVal) => {
                target[fieldName] = this.resolveExression();
                if (sub) {
                    observe.getEvents(sub).off(BindEventType.fieldChanged);
                }
                sub = astResolver.resolve(scope, this.injector, this.source);
                observe.onPropertyChange(sub, last, (value, oldVal) => {
                    target[fieldName] = this.resolveExression();
                });
            });
            observe.onPropertyChange(sub, last, (value, oldVal) => {
                target[fieldName] = this.resolveExression();
            });
        } else {
            observe.onPropertyChange(this.source, field, (value, oldVal) => {
                target[fieldName] = this.resolveExression();
            });
        }
    }
}

/**
 * element template.
 *
 * @export
 * @interface ElementTemplate
 */
export interface ElementTemplate {

}
/**
 * binding
 */
export type Binding<T, Temp extends ElementTemplate = ElementTemplate> = string | DataBinding<T> | T | Temp;

