import { Abstract } from '@tsdi/ioc';


/**
 * Class to be extended by all application events. Abstract as it
 * doesn't make sense for generic events to be published directly.
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


