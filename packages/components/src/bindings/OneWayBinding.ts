import { DataBinding } from './DataBinding';
import { EventManager, BindEventType } from './EventManager';
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

    constructor(protected eventMgr: EventManager, source: any, propName: string) {
        super(source, propName)
    }

    bind(target: any, property: string): T {
        let value = this.getSourceValue();
        if (!target) {
            return value;
        }

        let scopeFiled = this.getScopeField();
        // let propName = this.propName;
        let scope = this.getValue(this.getScope(), /\./.test(this.propName) ? this.propName.substring(0, this.propName.lastIndexOf('.')) : '');
        let eventMgr = this.eventMgr;

        observe.onChange(scope, (obj, prop, value, oldVal) => {
            if (prop === scopeFiled) {
                eventMgr.get(obj).emit(BindEventType.fieldChanged, obj, prop, value, oldVal);
            }
        });

        target[property] = value;
        eventMgr.get(scope).on(BindEventType.fieldChanged, (obj, field, val) => {
            if (obj === scope && field === scopeFiled) {
                observe.getProxy(target)[property] = val;
            }
        });
        return value;
    }
}

export const AssignBinding = OneWayBinding;

