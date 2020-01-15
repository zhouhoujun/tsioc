import { lang, isTypeObject } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IBinding } from './IBinding';
import { AstResolver } from '../AstResolver';
import { observe } from './onChange';
import { BindEventType } from './Events';
import { filedMatch, pathCkExp } from './exps';



/**
 * data binding.
 *
 * @export
 * @abstract
 * @class DataBinding
 * @template T
 */
export abstract class DataBinding<T = any> {

    constructor(protected injector: ICoreInjector, public source: any, public binding: IBinding, public expression: string) {

    }

    private _ast: AstResolver;
    getAst() {
        if (!this._ast) {
            this._ast = this.injector.getService({ token: AstResolver, target: this.source, default: AstResolver });
        }
        return this._ast;
    }

    resolveExression(): T {
        return this.getAst().resolve(this.expression, this.source);
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
        let astResolver = this.getAst();
        let fieldName = this.binding.name;
        if (pathCkExp.test(field)) {
            let paths = field.split('.');
            let idx = field.lastIndexOf('.');
            let scope = field.substring(0, idx);
            let sub = astResolver.resolve(scope, this.source);
            let last = field.substring(idx + 1);
            observe.onPropertyChange(this.source, lang.first(paths), (value, oldVal) => {
                target[fieldName] = this.resolveExression();
                if (sub) {
                    observe.getEvents(sub).off(BindEventType.fieldChanged);
                }
                sub = astResolver.resolve(scope, this.source);
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

