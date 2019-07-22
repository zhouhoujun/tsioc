import { DataBinding } from './DataBinding';
import { BindEventType, EventManager } from './EventManager';
import { observe } from './onChange';

export class TwoWayBinding<T> extends DataBinding<T> {

    constructor(protected eventMgr: EventManager, source: any, propName: string) {
        super(source, propName)
    }

    bind(target: any, property: string): T {
        let value = this.getSourceValue();
        if (!target) {
            return value;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.propName) ? this.propName.substring(0, this.propName.lastIndexOf('.')) : '');
        let eventMgr = this.eventMgr;
        // let propName = this.propName;

        observe.onChange(scope, (obj, prop, value, oldVal) => {
            console.log('TwoWay scope changed:', prop, value, oldVal);
            if (prop === scopeFiled) {
                eventMgr.get(obj).emit(BindEventType.fieldChanged, obj, prop, value, oldVal);
            }
        });

        observe.onChange(target, (obj, prop, value, oldVal) => {
            console.log('TwoWay target changed:', prop, value, oldVal);
            if (prop === property) {
                eventMgr.get(obj).emit(BindEventType.fieldChanged, obj, prop, value, oldVal);
            }
        });

        target[property] = value;

        eventMgr.get(target).on(BindEventType.fieldChanged, (obj, field, val) => {
            if (obj === target && field === property) {
                observe.getProxy(scope)[scopeFiled] = val;
            }
        });
        eventMgr.get(scope).on(BindEventType.fieldChanged, (obj, field, val) => {
            if (obj === scope && field === scopeFiled) {
                observe.getProxy(target)[property] = val;
            }
        });
        return value;
    }
}
