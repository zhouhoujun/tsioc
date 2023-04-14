import { Abstract } from '@tsdi/ioc';


/**
 * Class to be extended by all application events. Abstract as it
 * doesn't make sense for generic events to be published directly.
 * 
 * 应用程序事件抽象类， 直接发布通用事件没有意义
 */
@Abstract()
export abstract class ApplicationEvent {
    private _timestamp: number;
    constructor(private _source: Object) {
        this._timestamp = Date.now() / 1000
    }
    /**
     * event source target.
     */
    getSource(): Object {
        return this._source
    }
    /**
     * get the time in milliseconds when the event occurred.
     */
    getTimestamp(): number {
        return this._timestamp
    }
}


