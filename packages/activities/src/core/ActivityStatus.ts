import { Injectable, lang } from '@tsdi/ioc';
import { BootContext } from '@tsdi/boot';
import { Activity } from './Activity';
import { ControlActivity } from './ControlActivity';

/**
 * run scopes.
 *
 * @export
 * @interface RunScopes
 */
export interface RunScopes {
    scope: Activity,
    subs: Activity[]
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

    constructor(private context: BootContext) {
        this.scopes = [];
    }


    private _current: Activity;
    /**
     * current actiivty.
     *
     * @type {Activity}
     * @memberof ActivityStateManager
     */
    get current(): Activity {
        return this._current;
    }

    set current(activity: Activity) {
        this._current = activity;
        if (activity.isScope) {
            // clean parent scope control state.
            let cursp = this.currentScope;
            if (cursp && cursp.subs && cursp.subs.length) {
                cursp.subs.forEach(c => {
                    if (c instanceof ControlActivity) {
                        c.cleanCtrlState(this.context);
                    }
                });
            }
            this.scopes.unshift({ scope: activity, subs: [] });
        } else if (this.currentScope) {
            this.currentScope.subs.unshift(activity);
        }
    }

    scopeEnd() {
        this.scopes.shift();
        // reset parent scope control state.
        let cursp = this.currentScope;
        if (cursp && cursp.subs && cursp.subs.length) {
            cursp.subs.forEach(c => {
                if (c instanceof ControlActivity) {
                    c.setCtrlState(this.context);
                }
            });
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
}
