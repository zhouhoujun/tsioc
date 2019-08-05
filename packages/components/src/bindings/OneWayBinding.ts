import { DataBinding } from './DataBinding';
import { observe } from './onChange';


/**
 * assign binding
 *
 * @export
 * @class OneWayBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export class OneWayBinding<T> extends DataBinding<T> {

    bind(target: any): T {
        let targetProp = this.targetProp;
        let value = this.getSourceValue();
        if (!target) {
            return;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.prop) ? this.prop.substring(0, this.prop.lastIndexOf('.')) : '');

        observe.onPropertyChange(scope, scopeFiled, (obj, prop, value, oldVal) => {
            if (obj === scope && prop === scopeFiled) {
                target[targetProp] = value;
            }
        });
        target[targetProp] = value;
    }
}

export const AssignBinding = OneWayBinding;

