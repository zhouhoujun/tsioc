import { lang, isTypeObject, isFunction } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IBinding } from './IBinding';
import { observe } from './onChange';
import { BindEventType } from './Events';
import { filedMatch, pathCkExp, pipeExp } from './exps';
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

    constructor(protected injector: ICoreInjector, protected provider: ComponentProvider, public source: any, public binding: IBinding, public expression: string) {

    }

    private map: Map<string, any>;
    private fields = [];
    getScope(): Map<string, any> {
        if (!this.map) {
            this.map = this.provider.getAstResolver().parseScope(this.expression, this.source);
            this.map.forEach((v, k) => {
                if (!isFunction(v)) {
                    this.fields.push(k);
                }
            });
            return this.map;
        } else {
            this.fields.forEach(k => {
                this.map.set(k, this.source[k]);
            });
            return this.map;
        }
    }

    protected parser: (scope: Map<string, any>, envOptions?: any) => any
    resolveExression(): T {
        if (!this.parser) {
            this.parser = this.provider.getAstResolver().parse(this.expression, this.injector);
        }
        return this.parser(this.getScope());
    }

    private fieldExps: string[];
    getFileds() {
        if (!this.fieldExps) {
            let idx = this.expression.search(pipeExp);
            let exp = idx > 0 ? this.expression.substring(0, idx) : this.expression;
            this.fieldExps = exp.match(filedMatch).map(v => v);
        }
        return this.fieldExps;
    }

    /**
     * bind target.
     *
     * @abstract
     * @param {*} target
     * @param {*} [initVal]
     * @memberof ParseBinding
     */
    abstract bind(target: any, initVal?: any): void;

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
            let sub = astResolver.resolve(scope, this.injector, this.getScope());
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

