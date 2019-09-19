import { Events, BindEventType } from './Events';
import { lang, isFunction, Type, ClassType, ObjectMap } from '@tsdi/ioc';

/**
 * observe property change.
 */
export namespace observe {

    const events = new WeakMap<any, Events>();
    const defines = new WeakMap();

    /**
     * get events of target object.
     *
     * @export
     * @param {*} target
     * @returns {Events}
     */
    export function getEvents(target: any): Events {
        return events.get(target);
    }

    /**
     * target has envents or not.
     *
     * @export
     * @param {*} target
     * @returns {boolean}
     */
    export function hasEvents(target: any): boolean {
        return events.has(target);
    }



    /**
     * on property change.
     *
     * @export
     * @param {*} target subscribe change handle of target.
     * @param {(string | ((tag: T) => any))} property subscribe change handle of target property.
     * @param {(target: any, prop: string, vaule?: any, old?: any) => void} onChange change handle.
     * @returns
     */
    export function onPropertyChange<T extends Object = any>(target: T, property: string | ((tag: T) => any), onChange: (target: T, prop: string, vaule?: any, old?: any) => void) {
        let evt: Events;
        if (!events.has(target)) {
            evt = new Events();
            events.set(target, evt)
        } else {
            evt = events.get(target);
        }

        let propName: string;
        if (isFunction(property)) {
            let objMap: any = {};
            Object.keys(target).forEach(k => {
                objMap[k] = k;
            })
            propName = property(objMap);
        } else {
            propName = property;
        }


        if (!defines.has(target) || !defines.get(target)[propName]) {
            let descriptors = Object.getOwnPropertyDescriptors(lang.getClass(target).prototype);
            let descriptor = descriptors[propName];
            let value = Reflect.get(target, propName);
            Reflect.defineProperty(target, propName, {
                get() {
                    if (descriptor && descriptor.get) {
                        return descriptor.get.call(target);
                    } else {
                        return value;
                    }
                },
                set(val: any) {
                    let isChanged = value !== val;
                    let old = value;
                    value = val;
                    if (descriptor && descriptor.set) {
                        descriptor.set.call(target, val);
                    }
                    if (isChanged) {
                        evt.emit(BindEventType.fieldChanged, target, propName, val, old);
                    }
                }
            });

            let pps = defines.get(target) || {};
            pps[propName] = true;
            defines.set(target, pps)
        }

        evt.on(BindEventType.fieldChanged, onChange);

    }

    /**
     * on property changed.
     *
     * @export
     * @template T
     * @param {T} target
     * @param {(string | ((tag: T) => any))} property
     * @param {(vaule?: any, old?: any, target?: T, prop?: string) => void} callback
     */
    export function onChanged<T extends Object = any>(target: T, property: string | ((tag: T) => any), callback: (vaule?: any, old?: any, target?: T, prop?: string) => void) {
        onPropertyChange(target, property, (target, prop, vaule, old) => {
            callback(vaule, old, target, prop);
        });
    }
}
