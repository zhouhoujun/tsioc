import { DataBinding } from './DataBinding';
import { isFunction } from '@tsdi/ioc';

export class TwoWayBinding<T> extends DataBinding<T> {
    constructor(source: any, propName: string) {
        super(source, propName);
    }

    bind(target: any, prop: string): T {
        let value = this.getSourceValue();
        if (!target) {
            return value;
        }
        let scope = this.getScope();
        let scopeFiled = this.propName;
        Object.defineProperty(scope, scopeFiled, {
            get() {
                return value
            },
            set(val: any) {
                let isChanged = value !== val;
                value = val;
                if (isChanged) {
                    target[prop] = val;
                    if (isFunction(scope.onFiledChanges)) {
                        scope.onFiledChanges({ filed: prop, val: val });
                    }
                }
            }
        });

        let targetValue = value;
        Object.defineProperty(target, prop, {
            get() {
                return targetValue;
            },
            set(val: any) {
                let isChanged = targetValue !== val;
                targetValue = val;
                if (isChanged) {
                    scope[scopeFiled] = val;
                    if (isFunction(target.onFiledChanges)) {
                        target.onFiledChanges({ filed: prop, val: val });
                    }
                }
            }
        });


        return value;
    }
}
