/**
 * binding expression.
 *
 * @export
 * @abstract
 * @class BindingExpression
 * @template T
 */
export abstract class BindingExpression<T> {

    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    abstract resolve(scope: any): T;
}

/**
 * binding
 */
export type Binding<T> = string | BindingExpression<T> | T;

