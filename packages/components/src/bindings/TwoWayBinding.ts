import { BindingExpression } from './BindingExpression';

export class TwoWayBinding<T> extends BindingExpression<T> {
    constructor(protected fieldName: string, prefix = 'binding=:') {
        super(prefix);
    }
    resolve(scope: any): T {
        if (scope) {
            return scope[this.fieldName] as T;
        }
        return null;
    }
}
