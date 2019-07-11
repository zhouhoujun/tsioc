import { DataBinding } from './DataBinding';
import { EventManager, BindEventType } from './EventManager';


/**
 * assign binding
 *
 * @export
 * @class OneWayBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export class OneWayBinding<T> extends DataBinding<T> {

    constructor(protected eventMgr: EventManager, source: any, propName: string) {
        super(source, propName)
    }

    bind(target: any, prop: string): T {
        let value = this.getSourceValue();
        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.propName) ? this.propName.substring(0, this.propName.lastIndexOf('.') - 1) : '');
        let eventMgr = this.eventMgr;
        Object.defineProperty(scope, scopeFiled, {
            get() {
                return value;
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
        target[prop] = value;
        eventMgr.get(scope).on(BindEventType.fieldChanged, (field, val) => {
            target[prop] = val;
        });
        return value;
    }
}

export const AssignBinding = OneWayBinding;

