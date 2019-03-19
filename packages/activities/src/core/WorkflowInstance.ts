import { Token, Injectable } from '@ts-ioc/ioc';
import { ActivityConfigure } from './ActivityConfigure';
import { IActivity } from './IActivity';
import { IWorkflowInstance, WorkflowInstanceToken, RunState } from './IWorkflowInstance';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Joinpoint } from '@ts-ioc/aop';
import { IActivityContextResult } from './IActivityContext';
import { Service } from '@ts-ioc/boot';

/**
 * task runner.
 *
 * @export
 * @class TaskRunner
 * @implements {ITaskRunner}
 */
@Injectable(WorkflowInstanceToken)
export class WorkflowInstance<T extends IActivity> extends Service<T> implements IWorkflowInstance<T> {

    get activity(): Token<T> {
        return this.getTargetType();
    }
    get configure(): ActivityConfigure {
        return this.options.config;
    }

    private _result = new BehaviorSubject<any>(null);
    get result(): Observable<any> {
        return this._result.pipe(filter(a => !a));
    }

    private _resultValue: any;
    get resultValue(): any {
        return this._resultValue;
    }

    private _ctx: any;
    get context(): IActivityContextResult<T> {
        return this._ctx;
    }


    state: RunState;
    stateChanged: BehaviorSubject<RunState>;

    constructor() {
        super();
        this.stateChanged = new BehaviorSubject(RunState.init);
    }

    run(data?: any): Promise<IActivityContextResult<T>> {
        return this.start(data);
    }

    async start(data?: any): Promise<IActivityContextResult<T>> {
        this.getTarget().id && this.container.bindProvider(this.getTarget().id, this);
        let ctx = await this.getTarget().run(data)
        this._ctx = ctx;
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
