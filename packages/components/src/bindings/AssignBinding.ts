import { BindingExpression } from './BindingExpression';


/**
 * assign binding
 *
 * @export
 * @class AssignBinding
 * @extends {BindingExpression<T>}
 * @template T
 */
export class AssignBinding<T> extends BindingExpression<T> {
    constructor(protected fieldName: string, prefix = 'binding:') {
        super(prefix);
    }
    resolve(scope: any): T {
        if (scope) {
            return scope[this.fieldName] as T;
        }
        return null;
    }
}
