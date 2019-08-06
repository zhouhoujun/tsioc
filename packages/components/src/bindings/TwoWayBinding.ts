import { observe } from './onChange';
import { ParseBinding } from './ParseBinding';

export class TwoWayBinding<T> extends ParseBinding<T> {

    bind(target: any, obj?: any): T {
        let targetProp = this.targetProp;
        let value = this.getSourceValue();
        if (!target) {
            return;
        }

        if (obj) {
            obj[targetProp] = target;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.prop) ? this.prop.substring(0, this.prop.lastIndexOf('.')) : '');

        observe.onPropertyChange(scope, scopeFiled, (obj, prop, value, oldVal) => {
            if (obj === scope && prop === scopeFiled) {
                target[targetProp] = value;
            }
        });

        observe.onPropertyChange(target, targetProp, (obj, prop, value, oldVal) => {
            if (obj === target && prop === targetProp) {
                scope[scopeFiled] = value;
            }
        });

        target[targetProp] = value;

    }
}
