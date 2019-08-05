import { DataBinding } from './DataBinding';
import { observe } from './onChange';

export class TwoWayBinding<T> extends DataBinding<T> {

    bind(target: any): T {
        let property = this.targetProp;
        let value = this.getSourceValue();
        if (!target) {
            return;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.prop) ? this.prop.substring(0, this.prop.lastIndexOf('.')) : '');

        observe.onPropertyChange(scope, scopeFiled, (obj, prop, value, oldVal) => {
            if (obj === scope && prop === scopeFiled) {
                target[property] = value;
            }
        });

        observe.onPropertyChange(target, property, (obj, prop, value, oldVal) => {
            if (obj === target && prop === property) {
                scope[scopeFiled] = value;
            }
        });

        target[property] = value;

    }
}
