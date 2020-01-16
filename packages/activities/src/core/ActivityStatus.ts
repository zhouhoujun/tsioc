import { IActivityRef } from './IActivityRef';
import { Injectable, lang, InjectToken } from '@tsdi/ioc';

const STATUS_SUB_TRACK = new InjectToken<IActivityRef[]>('STATUS_SUB_TRACK');
/**
 * activity status.
 *
 * @export
 * @class ActivityStatus
 */
@Injectable
export class ActivityStatus {

    scopes: IActivityRef[];

    constructor() {
        this.scopes = [];
    }


    private _current: IActivityRef;
    /**
     * current actiivty.
     *
     * @type {Activity}
     * @memberof ActivityStateManager
     */
    get current(): IActivityRef {
        return this._current;
    }

    set current(activity: IActivityRef) {
        this._current = activity;
        if (activity.isScope) {
            activity.context.set(STATUS_SUB_TRACK, []);
            // clean parent scope control state.
            this.scopes.unshift(activity);
        } else if (this.currentScope) {
            let subs = this.currentScope.context.get(STATUS_SUB_TRACK);
            subs.unshift(activity);
        }
    }

    scopeEnd() {
        this.scopes.shift();
    }

    get currentScope(): IActivityRef {
        return lang.first(this.scopes);
    }

    get parentScope(): IActivityRef {
        if (this.scopes.length > 1) {
            return this.scopes[1];
        }
        return null;
    }
}
