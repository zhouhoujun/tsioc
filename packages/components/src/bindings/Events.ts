import { ObjectMap } from '@tsdi/ioc';

/**
 * bind event type.
 *
 * @export
 * @enum {number}
 */
export enum BindEventType {
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

    on(event: string, handle: (...args: any[]) => void) {
        this.maps[event] = this.maps[event] || [];
        if (this.maps[event].indexOf(handle) < 0) {
            this.maps[event].push(handle);
        }
    }

    off(event: string, ...handles: Function[]) {
        if (handles.length) {
            if (this.maps[event]) {
                this.maps[event] = this.maps[event].filter(h => handles.indexOf(h) < 0);
            }
        } else {
            delete this.maps[event];
        }
    }

    emit(event: string, ...args: any[]) {
        let hanldes = this.maps[event] || [];
        hanldes.forEach(h => {
            h(...args);
        });
    }

}
