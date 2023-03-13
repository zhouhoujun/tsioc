import { lang, OperationInvoker, isNumber, ReflectiveRef, Type, Injectable } from '@tsdi/ioc';
import { finalize, lastValueFrom, mergeMap, Observable } from 'rxjs';
import { ApplicationRunners } from '../runners';
import {
    ApplicationDisposeEvent, ApplicationEventMulticaster, ApplicationShutdownEvent,
    ApplicationStartedEvent, ApplicationStartingEvent
} from '../events';


@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners {
    private _runners: (OperationInvoker | ReflectiveRef)[];
    private _maps: Map<Type, (OperationInvoker | ReflectiveRef)[]>;
    private order = false;
    constructor(protected readonly multicaster: ApplicationEventMulticaster) {
        super()
        this._runners = [];
        this._maps = new Map();
    }

    attach(runner: OperationInvoker<any> | ReflectiveRef<any>, order?: number | undefined): void {
        const tgref = runner instanceof ReflectiveRef ? runner : runner.typeRef;
        if (!this._maps.has(tgref.type)) {
            this._maps.set(tgref.type, [runner]);
        } else {
            this._maps.get(tgref.type)?.push(runner);
        }

        if (isNumber(order)) {
            this.order = true;
            this._runners.splice(order, 0, runner)
        } else {
            this._runners.push(runner);
        }
    }


    detach(runner: OperationInvoker | ReflectiveRef): void {
        const idx = this._runners.findIndex(o => o === runner);
        if (idx >= 0) {
            this._runners.splice(idx, 1);
        }
    }


    has(runner: OperationInvoker | ReflectiveRef): boolean {
        const tgref = runner instanceof ReflectiveRef ? runner : runner.typeRef;
        return this._maps.has(tgref.type);
    }

    run(): Promise<void> {
        return lastValueFrom(this.beforeRun()
            .pipe(
                mergeMap(v => this.onDispose()),
                // mergeMap(v => {
                //     if (this._runners.length) {
                //         if (this.order) {
                //             await lang.step(Array.from(this._runners).map(svr => () => svr.invoke()))
                //         } else {
                //             await Promise.all(this._runners.map(svr => svr.invoke()))
                //         }
                //     }
                // }),
                mergeMap(v => this.afterRun())
            ));
    }

    stop(signls?: string): Promise<void> {
        return lastValueFrom(this.onShuwdown()
            .pipe(
                mergeMap(v => this.onDispose()),
                finalize(() => this.onDestroy())
            ))
    }

    onDestroy(): void {
        this._maps.clear();
        this._runners = null!;
    }

    protected beforeRun(): Observable<any> {
        return this.multicaster.emit(new ApplicationStartingEvent(this));
    }

    protected afterRun(): Observable<any> {
        return this.multicaster.emit(new ApplicationStartedEvent(this));
    }

    protected onShuwdown(signls?: string): Observable<any> {
        return this.multicaster.emit(new ApplicationShutdownEvent(this, signls));
    }

    protected onDispose(): Observable<any> {
        return this.multicaster.emit(new ApplicationDisposeEvent(this));
    }

}
