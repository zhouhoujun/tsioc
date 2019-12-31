import { Injectable, lang } from '@tsdi/ioc';
import { IActivity } from './IActivity';


/**
 * run scopes.
 *
 * @export
 * @interface RunScopes
 */
export class RunScopes {
    subs: IActivity[];
    private _state: Map<any, any>;
    protected get state(): Map<any, any> {
        if (!this._state) {
            this._state = new Map();
        }
        return this._state;
    }

    constructor(public scope: IActivity) {
        this.subs = [];
    }

    get<T>(key: any): T {
        if (!this._state) {
            return null;
        }
        return this._state.get(key);
    }
    has(key: any) {
        if (!this._state) {
            return false;
        }
        return this._state.has(key);
    }
    set(key: any, value: any) {
        return this.state.set(key, value);
    }
}

/**
 * activity status.
 *
 * @export
 * @class ActivityStatus
 */
@Injectable
export class ActivityStatus {

    scopes: RunScopes[];

    constructor() {
        this.scopes = [];
    }


    private _current: IActivity;
    /**
     * current actiivty.
     *
     * @type {Activity}
     * @memberof ActivityStateManager
     */
    get current(): IActivity {
        return this._current;
    }

    set current(activity: IActivity) {
        this._current = activity;
        if (activity.isScope) {
            // clean parent scope control state.
            this.scopes.unshift(new RunScopes(activity));
        } else if (this.currentScope) {
            this.currentScope.subs.unshift(activity);
        }
    }

    scopeEnd() {
        this.scopes.shift();
    }

    get currentScope(): RunScopes {
        return lang.first(this.scopes);
    }

    get parentScope(): RunScopes {
        if (this.scopes.length > 1) {
            return this.scopes[1];
        }
        return null;
    }
}
