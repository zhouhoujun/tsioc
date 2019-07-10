import { DataBinding } from './DataBinding';

export class TwoWayBinding<T> extends DataBinding<T> {
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
