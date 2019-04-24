import { Injectable } from '@tsdi/ioc';
import { Activity } from './Activity';
import { ActivityResult } from './ActivityResult';


@Injectable
export class ActivityStatus {
    map: WeakMap<Activity<any>, ActivityResult>;

    history: Activity<any>[];

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
        this.history.unshift(activity);
    }

    constructor() {
        this.map = new WeakMap();
        this.history = [];
    }



    getState<T extends ActivityResult>(activity?: Activity<any>): T {
        if (!activity) {
            activity = this.current;
        }
        if (activity && this.map.has(activity)) {
            return this.map.get(activity) as T;
        } else {
            return null;
        }
    }

    has(activity: Activity<any>) {
        return this.map.has(activity);
    }

    setState(state: ActivityResult, activity?: Activity<any>) {
        if (!activity) {
            activity = this.current;
        }
        if (activity) {
            this.map.set(activity, state);
        }
    }

}
