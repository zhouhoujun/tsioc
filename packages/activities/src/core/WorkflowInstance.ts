import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Service } from '@tsdi/boot';
import { Joinpoint } from '@tsdi/aop';
import { Token, Injectable } from '@tsdi/ioc';
import { ActivityConfigure } from './ActivityConfigure';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';
import { RunState } from './IWorkflowInstance';



/**
 * task runner.
 *
 * @export
 * @class TaskRunner
 * @implements {ITaskRunner}
 */
@Injectable
export class WorkflowInstance<T extends Activity> extends Service<T> {

    get activity(): Token<T> {
        return this.getTargetType();
    }

    private config: ActivityConfigure;
    get configure(): ActivityConfigure {
        return this.config;
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
        let mgr = this.context.getConfigureManager();
        this.config = await mgr.getConfig();
    }

    run(data?: any): Promise<ActivityContext<T>> {
        return this.start(data);
    }

    async start(data?: any): Promise<ActivityContext<T>> {
        this.getTarget().id && this.container.bindProvider(this.getTarget().id, this);
        this.state = RunState.complete;
        this.stateChanged.next(this.state);
        this._resultValue = ctx.result;
        this._result.next(ctx.result);
        return ctx;

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
