import { Inject, IContainer, ContainerToken, Token, Injectable } from '@ts-ioc/core';
import { ActivityConfigure } from './ActivityConfigure';
import { IActivity } from './IActivity';
import { IActivityRunner, ActivityRunnerToken, RunState } from './IActivityRunner';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Joinpoint } from '@ts-ioc/aop';
import { ActivityContext } from './ActivityContext';

/**
 * task runner.
 *
 * @export
 * @class TaskRunner
 * @implements {ITaskRunner}
 */
@Injectable(ActivityRunnerToken)
export class ActivityRunner<T> implements IActivityRunner<T> {

    get activity(): Token<IActivity> {
        return this.token;
    }
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

    @Inject(ContainerToken)
    container: IContainer;

    constructor(
        public token: Token<IActivity>,
        public config: ActivityConfigure,
        public instance: IActivity) {
        this.stateChanged = new BehaviorSubject(RunState.init);
    }

    async start(data?: any): Promise<T> {
        let ctx = data instanceof ActivityContext ? data : this.instance.getCtxFactory().create(data === this.instance.id ? undefined : data);
        return await this.instance.run(ctx)
            .then(ctx => {
                this.state = RunState.complete;
                this.stateChanged.next(this.state);
                this._resultValue = ctx.result;
                this._result.next(ctx.result);
                return ctx.result;
            });
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
