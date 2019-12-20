import { lang, isTypeObject, IInjector } from '@tsdi/ioc';
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

    constructor(protected injector: IInjector, public source: any, public binding: IBinding, public expression: string) {

    }

    getAstResolver() {
        return this.injector.getInstance(AstResolver);
    }

    resolveExression(resolver?: AstResolver): T {
        return (resolver || this.getAstResolver()).resolve(this.expression, this.source);
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
        let astResolver = this.getAstResolver();
        let fieldName = this.binding.name;
        if (pathCkExp.test(field)) {
            let paths = field.split('.');
            let idx = field.lastIndexOf('.');
            let scope = field.substring(0, idx);
            let sub = astResolver.resolve(scope, this.source);
            let last = field.substring(idx + 1);
            observe.onPropertyChange(this.source, lang.first(paths), (value, oldVal) => {
                target[fieldName] = this.resolveExression(astResolver);
                if (sub) {
                    observe.getEvents(sub).off(BindEventType.fieldChanged);
                }
                sub = astResolver.resolve(scope, this.source);
                observe.onPropertyChange(sub, last, (value, oldVal) => {
                    target[fieldName] = this.resolveExression(astResolver);
                });
            });
            observe.onPropertyChange(sub, last, (value, oldVal) => {
                target[fieldName] = this.resolveExression(astResolver);
            });
        } else {
            observe.onPropertyChange(this.source, field, (value, oldVal) => {
                target[fieldName] = this.resolveExression(astResolver);
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

