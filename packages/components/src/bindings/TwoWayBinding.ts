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
        Object.defineProperty(scope, scopeFiled, {
            get() {
                return value
            },
            set(val: any) {
                let isChanged = value !== val;
                let old = value;
                value = val;
                if (isChanged) {
                    eventMgr.get(scope).emit(BindEventType.fieldChanged, prop, val, old);
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
                let old = targetValue;
                targetValue = val;
                if (isChanged) {
                    eventMgr.get(target).emit(BindEventType.fieldChanged, prop, val, old);
                }
            }
        });

        eventMgr.get(target).on(BindEventType.fieldChanged, (field, val) => {
            scope[scopeFiled] = val;
        });

        eventMgr.get(scope).on(BindEventType.fieldChanged, (field, val) => {
            target[prop] = val;
        });


        return value;
    }
}
