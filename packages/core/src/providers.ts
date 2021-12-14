import { ProviderType, Resolver, lang, isNumber, Type, ObservableParser } from '@tsdi/ioc';
import { ApplicationContext, ApplicationFactory } from './context';
import { ModuleFactoryResolver } from './module.factory';
import { DefaultModuleFactoryResolver } from './module/module';
import { DefaultApplicationFactory } from './context.impl';
import { Server, ServerSet } from './server';
import { Client, ClientSet } from './client';
import { StartupService, ServiceSet } from './service';
import { ScanSet } from './scan.set';
import { Runnable, RunnableSet } from './runnable';
import { EmptyError, Observable, from } from 'rxjs';



abstract class AbstractScanSet<T = any> implements ScanSet<T> {
    static ρNPT = true;

    private _rs: Resolver<T>[] = [];
    protected order = false;
    constructor() {
        this._rs = [];
    }

    get count(): number {
        return this._rs.length;
    }


    getAll(): Resolver<T>[] {
        return this._rs;
    }

    has(type: Type): boolean {
        return this._rs.some(i => i.type === type);
    }
    add(resolver: Resolver<T>, order?: number): void {
        if (this.has(resolver.type)) return;
        if (isNumber(order)) {
            this.order = true;
            this._rs.splice(order, 0, resolver);
        } else {
            this._rs.push(resolver);
        }
    }
    remove(resolver: Resolver<T> | Type<T>): void {
        lang.remove(this._rs, resolver);
    }
    clear(): void {
        this._rs = [];
    }

    async startup(ctx: ApplicationContext): Promise<void> {
        if (this._rs.length) {
            if (this.order) {
                await lang.step(Array.from(this._rs).map(svr => () => this.run(svr, ctx)));
            } else {
                await Promise.all(this._rs.map(svr => this.run(svr, ctx)));
            }
        }
    }

    protected abstract run(resolver: Resolver<T>, ctx: ApplicationContext): any;

    destroy(): void {
        this.clear();
    }

}


class ServiceSetImpl extends AbstractScanSet implements ServiceSet {
    protected run(resolver: Resolver<StartupService>, ctx: ApplicationContext) {
        return resolver.resolve()?.configureService(ctx);
    }
}

class ClientSetImpl extends AbstractScanSet implements ClientSet {
    protected run(resolver: Resolver<Client>, ctx: ApplicationContext) {
        return resolver.resolve()?.connect();
    }

}

class ServerSetImpl extends AbstractScanSet implements ServerSet {
    protected run(resolver: Resolver<Server>, ctx: ApplicationContext) {
        return resolver.resolve()?.startup();
    }
}

class RunnableSetImpl extends AbstractScanSet implements RunnableSet {
    protected run(resolver: Resolver<Runnable>, ctx: ApplicationContext) {
        return resolver.resolve()?.run();
    }
}

export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: ServerSet, useClass: ServerSetImpl, singleton: true },
    { provide: ClientSet, useClass: ClientSetImpl, singleton: true },
    { provide: ServiceSet, useClass: ServiceSetImpl, singleton: true },
    { provide: RunnableSet, useClass: RunnableSetImpl, singleton: true },
    { provide: ModuleFactoryResolver, useValue: new DefaultModuleFactoryResolver() },
    { provide: ApplicationFactory, useValue: new DefaultApplicationFactory() },
    {
        provide: ObservableParser,
        useValue: {
            fromPromise<T>(promise: Promise<T>): Observable<T> {
                return from(promise);
            },
            toPromise<T>(obser: Observable<T>): Promise<T> {
                return lastValueFrom(obser);
            }
        } as ObservableParser
    }
]


export interface LastValueFromConfig<T> {
    defaultValue: T;
}

/**
 * Converts an observable to a promise by subscribing to the observable,
 * waiting for it to complete, and resolving the returned promise with the
 * last value from the observed stream.
 *
 * If the observable stream completes before any values were emitted, the
 * returned promise will reject with {@link EmptyError} or will resolve
 * with the default value if a default was specified.
 *
 * If the observable stream emits an error, the returned promise will reject
 * with that error.
 *
 * **WARNING**: Only use this with observables you *know* will complete. If the source
 * observable does not complete, you will end up with a promise that is hung up, and
 * potentially all of the state of an async function hanging out in memory. To avoid
 * this situation, look into adding something like {@link timeout}, {@link take},
 * {@link takeWhile}, or {@link takeUntil} amongst others.
 *
 * ### Example
 *
 * Wait for the last value from a stream and emit it from a promise in
 * an async function.
 *
 * ```ts
 * import { interval, lastValueFrom } from 'rxjs';
 * import { take } from 'rxjs/operators';
 *
 * async function execute() {
 *   const source$ = interval(2000).pipe(take(10));
 *   const finalNumber = await lastValueFrom(source$);
 *   console.log(`The final number is ${finalNumber}`);
 * }
 *
 * execute();
 *
 * // Expected output:
 * // "The final number is 9"
 * ```
 *
 * @see {@link firstValueFrom}
 *
 * @param source the observable to convert to a promise
 * @param config a configuration object to define the `defaultValue` to use if the source completes without emitting a value
 */
export function lastValueFrom<T, D>(source: Observable<T>, config?: LastValueFromConfig<D>): Promise<T | D> {
    const hasConfig = typeof config === 'object';
    return new Promise<T | D>((resolve, reject) => {
        let _hasValue = false;
        let _value: T;
        source.subscribe({
            next: (value) => {
                _value = value;
                _hasValue = true;
            },
            error: reject,
            complete: () => {
                if (_hasValue) {
                    resolve(_value);
                } else if (hasConfig) {
                    resolve(config!.defaultValue);
                } else {
                    reject(new EmptyError());
                }
            },
        });
    });
}
