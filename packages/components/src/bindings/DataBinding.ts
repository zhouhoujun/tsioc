import { IContainer } from '@tsdi/core';
import { IBinding } from './IPropertyBindingReflect';
import { AstResolver } from '../AstResolver';
import { lang } from '@tsdi/ioc';
import { observe } from './onChange';
import { BindEventType } from './Events';

const filedExp = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;
const filedMatch = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*/g;
export const pathCkExp = /\./;
const noabExp = /\?$/;



/**
 * data binding.
 *
 * @export
 * @abstract
 * @class DataBinding
 * @template T
 */
export abstract class DataBinding<T = any> {

    constructor(protected container: IContainer, public source: any, public binding: IBinding, public expression: string) {

    }

    getAstResolver() {
        return this.container.getInstance(AstResolver);
    }

    resolveExression(): T {
        return this.getAstResolver().resolve(this.expression, this.source);
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

    bindTagChange(field: string, target, source) {
        if (pathCkExp.test(field)) {
            let paths = field.split('.');
            let idx = field.lastIndexOf('.');
            let scope = field.substring(0, idx);
            let sub = this.getAstResolver().resolve(scope, source);
            let last = field.substring(idx + 1);
            observe.onPropertyChange(source, lang.first(paths), (value, oldVal) => {
                target[this.binding.name] = this.resolveExression();
                if (sub) {
                    observe.getEvents(sub).off(BindEventType.fieldChanged);
                }
                sub = this.getAstResolver().resolve(scope, source);
                observe.onPropertyChange(sub, last, (value, oldVal) => {
                    target[this.binding.name] = this.resolveExression();
                });
            });
            observe.onPropertyChange(sub, last, (value, oldVal) => {
                target[this.binding.name] = this.resolveExression();
            });
        } else {
            observe.onPropertyChange(source, field, (value, oldVal) => {
                target[this.binding.name] = this.resolveExression();
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

