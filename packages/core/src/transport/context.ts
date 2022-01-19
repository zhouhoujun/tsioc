import { Abstract, Injector, InvocationContext, InvocationOption, isNumber, isPlainObject, isPromise, isString } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';
import { Pattern } from './pattern';
import { Protocol } from './types';

/**
 * transport option.
 */
export interface TransportOption<T = any> extends InvocationOption {
    protocol?: Protocol;
    pattern: Pattern;
    data: T;
    event?: boolean;
}

/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TRepsonse = any> extends InvocationContext<TRequest> {
    /**
     * transport request.
     */
    abstract get request(): TRequest;
    /**
     * transport response.
     */
    abstract get response(): TRepsonse;
    /**
     * transport protocol.
     */
    abstract get protocol(): Protocol;
    /**
     * transport pattern.
     */
    abstract get pattern(): string;
    /**
     * is event or not.
     */
    abstract get isEvent(): boolean;

    abstract get query(): any;
    abstract set query(params: any);

    abstract get restful(): Record<string, string | number>;
    abstract set restful(value: Record<string, string | number>);

    abstract get status(): number | string;
    abstract set status(value: number | string);
    
    abstract get message(): string;
    abstract set message(msg: string);

    /**
     * Get response body.
     */
    abstract get body(): any;
    /**
     * Set response body.
     */
    abstract set body(body: any);

    constructor(injector: Injector, options: TransportOption<TRequest>) {
        super(injector, options);
        this.injector.setValue(TransportContext, this);
    }

}

/**
 * transport context factory.
 */
@Abstract()
export abstract class TransportContextFactory {
    /**
     * create context, instance of {@link TransportContext}.
     * @param parent parent injector or parent invocation context.
     * @param options transport options. typeof {@link TransportOption}.
     */
    abstract create<TRequest, TRepsonse>(parent: Injector | InvocationContext, options: TransportOption<TRequest>): TransportContext<TRequest, TRepsonse>;
}

/**
 * middleware context.
 */
export const CONTEXT = TransportContext;


/**
 * stringify pattern.
 * @param pattern 
 * @returns 
 */
export function stringify(pattern: Pattern): string {
    if (isString(pattern) || isNumber(pattern)) {
        return `${pattern}`;
    }

    if (!isPlainObject(pattern)) return pattern;

    const sortedKeys = Object.keys(pattern).sort((a, b) =>
        ('' + a).localeCompare(b),
    );

    const sortedPatternParams = sortedKeys.map(key => {
        let partialRoute = `"${key}":`;
        partialRoute += isString(pattern[key])
            ? `"${stringify(pattern[key])}"`
            : stringify(pattern[key]);
        return partialRoute;
    });

    const route = sortedPatternParams.join(',');
    return `{${route}}`;
}

/**
 * to promise.
 * @param target 
 * @returns 
 */
export function promisify<T>(target: T | Observable<T> | Promise<T>): Promise<T> {
    if (isObservable(target)) {
        return lastValueFrom(target);
    } else if (isPromise(target)) {
        return target;
    }
    return Promise.resolve(target);
}
