import { lang, OperationInvoker, isNumber, ReflectiveRef, Type, Injectable } from '@tsdi/ioc';
import { lastValueFrom } from 'rxjs';
import { ApplicationRunners } from '../runners';
import {
    ApplicationDisposeEvent, ApplicationEventMulticaster, ApplicationShutdownEvent,
    ApplicationStartEvent, ApplicationStartingEvent
} from '../events';


@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners {
    private _runners: OperationInvoker[];
    private _maps: Map<Type, OperationInvoker[]>;
    private order = false;
    constructor(protected readonly multicaster: ApplicationEventMulticaster) {
        super()
        this._runners = [];
        this._maps = new Map();
    }

    attach(runner: OperationInvoker<any> | ReflectiveRef<any>, order?: number | undefined): void {
        if (runner instanceof ReflectiveRef) {
            if (!this._maps.has(runner.type)) {
                const runnables = runner.class.runnables.filter(r => !r.auto);
                const invokers: OperationInvoker[] = [];
                this._maps.set(runner.type, invokers);
                runnables.forEach(r => {
                    const invoker = runner.createInvoker(r.method);
                    invokers.push(invoker);
                    this.attachOperation(invoker, r.order);
                });
            }
        } else if (!this.has(runner)) {
            this.attachOperation(runner, order);
        }
    }

    attachOperation(runner: OperationInvoker, order?: number): void {
        if (isNumber(order)) {
            this.order = true;
            this._runners.splice(order, 0, runner)
        } else {
            this._runners.push(runner);
        }
    }


    detach(runner: OperationInvoker | ReflectiveRef): void {
        if (runner instanceof ReflectiveRef) {
            const operations = this._maps.get(runner.type);
            operations?.forEach(r => {
                const idx = this._runners.indexOf(r);
                if (idx >= 0) {
                    this._runners.splice(idx, 1);
                }
            });
            this._maps.delete(runner.type);
        } else {
            const idx = this._runners.findIndex(o => o.descriptor === runner.descriptor);
            if (idx >= 0) {
                this._runners.splice(idx, 1);
            }
        }
    }


    has(runner: OperationInvoker | ReflectiveRef): boolean {
        if (runner instanceof ReflectiveRef) return this._maps.has(runner.type);
        return this._runners.some(o => o.descriptor === runner.descriptor);
    }

    async run(): Promise<void> {
        await this.beforeRun();
        if (this._runners.length) {
            if (this.order) {
                await lang.step(Array.from(this._runners).map(svr => () => svr.invoke()))
            } else {
                await Promise.all(this._runners.map(svr => svr.invoke()))
            }
        }
        await this.afterRun();
    }

    async stop(signls?: string): Promise<void> {
        await this.onShuwdown(signls);
        await this.onDispose();
        this.onDestroy();
    }

    onDestroy(): void {
        this._maps.clear();
        this._runners = null!;
    }

    protected beforeRun(): Promise<void> {
        return lastValueFrom(this.multicaster.emit(new ApplicationStartingEvent(this)));
    }

    protected afterRun(): Promise<void> {
        return lastValueFrom(this.multicaster.emit(new ApplicationStartEvent(this)));
    }

    protected onShuwdown(signls?: string) {
        return lastValueFrom(this.multicaster.emit(new ApplicationShutdownEvent(this, signls)));
    }

    protected onDispose() {
        return lastValueFrom(this.multicaster.emit(new ApplicationDisposeEvent(this)));
    }

}
