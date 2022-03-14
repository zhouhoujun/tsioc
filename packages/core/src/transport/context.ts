import { Abstract, DefaultInvocationContext, Injector, InvocationContext, InvokeArguments, isPromise } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';
import { Protocol, TransportRequest, TransportResponse } from './packet';
import { TransportStatus } from './handler';
import { TransportError } from './error';
import { ServerOption } from './server';


/**
 * transport option.
 */
export interface TransportOption<T extends ServerOption = ServerOption> extends InvokeArguments {
    request: TransportRequest;
    reponse: TransportResponse;
    /**
     * server option arguments data extends {@link ServerOption}.
     */
    arguments: T;
}


/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<T extends ServerOption = ServerOption> extends DefaultInvocationContext<T> {

    constructor(injector: Injector, options: TransportOption<T>) {
        super(injector, options);
        this.injector.setValue(TransportContext, this);
    }

    /**
     * transport request.
     */
    abstract get request(): TransportRequest;
    /**
     * transport response.
     */
    abstract get response(): TransportResponse;
    /**
     * transport protocol.
     */
    abstract get protocol(): Protocol;
    /**
     * transport pattern.
     */
    abstract get pattern(): string;
    /**
     * is update modle resquest.
     */
    abstract isUpdate(): boolean;
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
    abstract get status(): TransportStatus;
    /**
     * Set response status code.
     */
    abstract set status(value: TransportStatus);

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
     * get response status ok or not.
     */
    abstract get ok(): boolean;
    /**
     * set response status ok or not.
     */
    abstract set ok(value: boolean);

    /**
     * Get response status message.
     */
    abstract get message(): string;
    /**
     * Set response status message.
     */
    abstract set message(msg: string);

    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    abstract redirect(url: string, alt?: string): void;

    /**
     * Get response body.
     */
    abstract get body(): any;
    /**
     * Set response body.
     */
    abstract set body(body: any);
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    abstract throwError(status: TransportStatus, ...messages: string[]): TransportError;

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
    abstract create<T extends ServerOption>(parent: Injector | InvocationContext, options: TransportOption<T>): TransportContext<T>;
}

/**
 * middleware context.
 */
export const CONTEXT = TransportContext;


// /**
//  * stringify pattern.
//  * @param pattern 
//  * @returns 
//  */
// export function stringify(pattern: Pattern): string {
//     if(isString(pattern)) return pattern;
//     if (isNumber(pattern)) {
//         return `${pattern}`;
//     }

//     if (!isPlainObject(pattern)) return pattern;

//     const sortedKeys = Object.keys(pattern).sort((a, b) =>
//         ('' + a).localeCompare(b),
//     );

//     const sortedPatternParams = sortedKeys.map(key => {
//         let partialRoute = `"${key}":`;
//         partialRoute += isString(pattern[key])
//             ? `"${stringify(pattern[key])}"`
//             : stringify(pattern[key]);
//         return partialRoute;
//     });

//     const route = sortedPatternParams.join(',');
//     return `{${route}}`;
// }

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
