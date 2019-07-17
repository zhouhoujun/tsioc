import { DataBinding } from './DataBinding';
import { BindEventType, EventManager } from './EventManager';

export class TwoWayBinding<T> extends DataBinding<T> {

    constructor(protected eventMgr: EventManager, source: any, propName: string) {
        super(source, propName)
    }

    bind(target: any, prop: string): T {
        let value = this.getSourceValue();
        if (!target) {
            return value;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.propName) ? this.propName.substring(0, this.propName.lastIndexOf('.')) : '');
        let eventMgr = this.eventMgr;
        let propName = this.propName;

        let scopeDescriptor = Object.getOwnPropertyDescriptor(scope, scopeFiled);
        Object.defineProperty(scope, scopeFiled, {
            get() {
                if (scopeDescriptor && scopeDescriptor.get) {
                    return scopeDescriptor.get();
                }
                return value;
            },
            set(val: any) {
                let isChanged = value !== val;
                let old = value;
                value = val;
                if (scopeDescriptor && scopeDescriptor.set) {
                    scopeDescriptor.set(val);
                }
                if (isChanged) {
                    eventMgr.get(scope).emit(BindEventType.fieldChanged, propName, prop, val, old);
                }
            }
        });

        let targetValue;
        let targetDescriptor = Object.getOwnPropertyDescriptor(scope, scopeFiled);
        Object.defineProperty(target, prop, {
            get() {
                if (targetDescriptor && targetDescriptor.get) {
                    return targetDescriptor.get();
                }
                return targetValue;
            },
            set(val: any) {
                let isChanged = targetValue !== val;
                let old = targetValue;
                targetValue = val;
                if (targetDescriptor && targetDescriptor.set) {
                    targetDescriptor.set(val);
                }
                if (isChanged) {
                    eventMgr.get(target).emit(BindEventType.fieldChanged, prop, propName, val, old);
                }
            }
        });

        target[prop] = value;
        eventMgr.get(target).on(BindEventType.fieldChanged, (targetField, field, val) => {
            if (targetField === prop && field === this.propName) {
                scope[scopeFiled] = val;
            }
        });
        eventMgr.get(scope).on(BindEventType.fieldChanged, (targetField, field, val) => {
            if (targetField === propName && field === prop) {
                target[prop] = val;
            }
        });
        return value;
    }
}
