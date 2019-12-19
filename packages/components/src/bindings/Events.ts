import { ObjectMap } from '@tsdi/ioc';

/**
 * bind event type.
 *
 * @export
 * @enum {number}
 */
export enum BindEventType {
    /**
     * filed changed.
     */
    fieldChanged = 'fieldChanged'
}

/**
 * events.
 *
 * @export
 * @class Events
 */
export class Events {
    private maps: ObjectMap<Function[]>;
    constructor() {
        this.maps = {};
    }

    /**
     * subscribe event.
     *
     * @param {string} event the evnet subscribe.
     * @param {(...args: any[]) => void} handle
     * @memberof Events
     */
    on(event: string, handle: (...args: any[]) => void) {
        this.maps[event] = this.maps[event] || [];
        if (this.maps[event].indexOf(handle) < 0) {
            this.maps[event].push(handle);
        }
    }

    /**
     * unsubscribe event.
     *
     * @param {string} event the event to unsubscribe.
     * @param {...Function[]} handles
     * @memberof Events
     */
    off(event: string, ...handles: Function[]) {
        if (handles.length) {
            if (this.maps[event]) {
                this.maps[event] = this.maps[event].filter(h => handles.indexOf(h) < 0);
            }
        } else {
            delete this.maps[event];
        }
    }

    /**
     * emit event.
     *
     * @param {string} event event type.
     * @param {...any[]} args
     * @memberof Events
     */
    emit(event: string, ...args: any[]) {
        let hanldes = this.maps[event] || [];
        hanldes.forEach(h => {
            h(...args);
        });
    }

}
