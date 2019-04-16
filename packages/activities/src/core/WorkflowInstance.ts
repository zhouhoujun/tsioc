import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Service, BuilderService } from '@tsdi/boot';
import { Joinpoint } from '@tsdi/aop';
import { Injectable } from '@tsdi/ioc';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';
import { ActivityOption } from './ActivityOption';
import { ExecuteActivity } from '../activities';
import { ActivityConfigure } from './ActivityConfigure';

/**
 *run state.
 *
 * @export
 * @enum {number}
 */
export enum RunState {
    /**
     * activity init.
     */
    init,
    /**
     * runing.
     */
    running,
    /**
     * activity parused.
     */
    pause,
    /**
     * activity stopped.
     */
    stop,
    /**
     * activity complete.
     */
    complete
}

/**
 * task runner.
 *
 * @export
 * @class TaskRunner
 * @implements {ITaskRunner}
 */
@Injectable
export class WorkflowInstance<T extends ActivityContext> extends Service<Activity<T>> {

    _activity: Activity<any>;
    getActivity(): Activity<any> {
        return this._activity;
    }

    protected _ctx: T;
    get context(): T {
        return this._ctx;
    }

    private _result = new BehaviorSubject<any>(null);
    get result(): Observable<any> {
        return this._result.pipe(filter(a => !a));
    }

    private _resultValue: any;
    get resultValue(): any {
        return this._resultValue;
    }


    state: RunState;
    stateChanged: BehaviorSubject<RunState>;


    async onInit(): Promise<void> {
        let mgr = this.context.getConfigureManager<ActivityConfigure<T>>();
        await mgr.getConfig();
        let target = this.getTarget();
        if (target instanceof Activity) {
            this._activity = target;
        } else {
            let option = this.context.annoation as ActivityConfigure<T>;
            this._activity = await this.container.get(BuilderService).create(<ActivityOption<T>>{ execute: option, module: ExecuteActivity })
        }
    }

    run(data?: any): Promise<T> {
        return this.start(data);
    }

    async start(data?: any): Promise<T> {
        if (this.context.id && !this.container.has(this.context.id)) {
            this.container.bindProvider(this.context.id, this);
        }

        await this.getActivity().execute(this.context, async () => {
            this.state = RunState.complete;
            this.stateChanged.next(this.state);
            this._resultValue = this.context.data;
            this._result.next(this.context.data);
        })

        return this.context;

    }

    _currState: Joinpoint;
    saveState(state: Joinpoint) {
        this._currState = state;
    }

    async stop(): Promise<any> {
        this.state = RunState.stop;
        this.stateChanged.next(this.state);
    }

    async pause(): Promise<any> {
        this.state = RunState.pause;
        this.stateChanged.next(this.state);
    }

}
