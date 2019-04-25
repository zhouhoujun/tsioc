import { Injectable, lang } from '@tsdi/ioc';
import { Activity } from './Activity';
import { CompoiseActivity } from './CompoiseActivity';

export interface RunScopes {
    scope: Activity<any>,
    subs: Activity<any>[]
}

@Injectable
export class ActivityStatus {

    tracks: Activity<any>[];
    scopes: RunScopes[];

    constructor() {
        this.tracks = [];
        this.scopes = [];
    }


    private _current: Activity<any>;
    /**
     * current actiivty.
     *
     * @type {Activity<any>}
     * @memberof ActivityStateManager
     */
    get current(): Activity<any> {
        return this._current;
    }

    set current(activity: Activity<any>) {
        this._current = activity;
        this.tracks.unshift(activity);
        if (activity.isScope) {
            this.scopes.unshift({ scope: activity, subs: [] });
        } else if (this.currentScope) {
            this.currentScope.subs.unshift(activity);
        }
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


    getScopes(): CompoiseActivity<any>[] {
        return this.tracks.filter(a => a instanceof CompoiseActivity) as CompoiseActivity<any>[];
    }

}
