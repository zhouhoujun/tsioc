import { DataBinding } from './DataBinding';


/**
 * assign binding
 *
 * @export
 * @class AssignBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export class AssignBinding<T> extends DataBinding<T> {
    constructor(protected fieldName: string, prefix = 'binding:') {
        super(prefix);
    }
    resolve(scope: any): T {
        if (scope) {
            return scope[this.fieldName] as T;
        }
        return undefined;
    }
}
