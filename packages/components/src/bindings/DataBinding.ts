/**
 * data binding.
 *
 * @export
 * @abstract
 * @class BindingExpression
 * @template T
 */
export abstract class DataBinding<T = any> {

    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    abstract resolve(scope: any): T;
}

/**
 * binding
 */
export type Binding<T> = string | DataBinding<T> | T;

