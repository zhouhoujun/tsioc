import { IContainer } from '@tsdi/core';
import { IBinding } from './IPropertyBindingReflect';
import { AstResolver } from '../AstResolver';

const filedExp = /\s\w*/
export const wTestExp = /\./;
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

    getExressionValue() {
        return this.getAstResolver().resolve(this.expression, this.source);
    }

    getExprssionFileds() {
        return Object.keys(this.source).filter(k => this.expression.indexOf(k) >= 0)
    }

    getScope() {
        return this.source;
    }

    getScopeField(): string {
        return wTestExp.test(this.expression) ? this.expression.substring(this.expression.lastIndexOf('.') + 1) : this.expression;
    }

    abstract bind(target: any): void;
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

