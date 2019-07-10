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

    bind(target: any, prop: string): T {
        let val = this.getSourceValue();
        if (target && prop) {
            target[prop] = val;
        }
        return val;
    }
}
