/**
 * data binding.
 *
 * @export
 * @abstract
 * @class DataBinding
 * @template T
 */
export abstract class DataBinding<T = any> {

    constructor(public source: any, public propName: string) {
    }


    getScope() {
        return this.source;
    }

    getSourceValue(): T {
        let source = this.getScope();
        if (source) {
            return source[this.propName] as T;
        }
        return undefined;
    }

    abstract bind(target: any, prop: string): T;
}

/**
 * binding
 */
export type Binding<T> = string | DataBinding<T> | T;

