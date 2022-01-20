import { Abstract, Injector, InvocationContext, InvokeArguments, isNumber, isPlainObject, isPromise, isString } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';
import { ReadPacket, WritePacket } from './packet';
import { Pattern } from './pattern';
import { Protocol } from './types';

/**
 * transport option.
 */
export interface TransportOption<T = any> extends InvokeArguments {
    protocol?: Protocol;
    pattern: Pattern;
    body: T;
    event?: boolean;
}

/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> extends InvocationContext<any> {
    /**
     * transport request.
     */
    abstract get request(): TRequest;
    /**
     * transport response.
     */
    abstract get response(): TResponse;
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

    /**
     * get query params
     */
    abstract get query(): any;

    /**
     * get resetful value. 
     */
    abstract get restful(): Record<string, string | number>;
    /**
     * set resetful value. 
     */
    abstract set restful(value: Record<string, string | number>);

    /**
     * Get response status code.
     */
    abstract get status(): number | string;
    /**
     * Set response status code.
     */
    abstract set status(value: number | string);

    /**
      * get response error
      */
    abstract get error(): any;
    /**
     * set response error
     */
    abstract set error(err: any);

    /**
     * responsed or not.
     */
    abstract get sent(): boolean;

    /**
     * is response status ok or not.
     */
    abstract get ok(): boolean;

    /**
     * Get response status message.
     */
    abstract get message(): string;
    /**
     * Set response status message.
     */
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
    abstract create<TRequest extends ReadPacket, TResponse extends WritePacket>(parent: Injector | InvocationContext, options: TransportOption<TRequest>): TransportContext<TRequest, TResponse>;
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
