import { DataBinding } from './DataBinding';
import { observe } from './onChange';

export class TwoWayBinding<T> extends DataBinding<T> {

    constructor(source: any, propName: string) {
        super(source, propName)
    }

    bind(target: any, property: string): T {
        let value = this.getSourceValue();
        if (!target) {
            return value;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.propName) ? this.propName.substring(0, this.propName.lastIndexOf('.')) : '');

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


        return value;
    }
}
