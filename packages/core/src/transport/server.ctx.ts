import {
    Abstract, ClassType, composeResolver, DefaultInvocationContext, EMPTY,
    Injector, InvokeArguments, isArray, isDefined, isPrimitiveType,
    isString, MissingParameterError, Parameter, Token, Type
} from '@tsdi/ioc';
import { MODEL_RESOLVERS } from '../model/model.resolver';
import { PipeTransform } from '../pipes/pipe';
import { TransportContext } from './context';
import { TransportArgumentError } from './error';
import { TransportArgumentResolver, TransportParameter } from './resolver';
import { TransportServer } from './server';


/**
 * server transport context.
 */
@Abstract()
export abstract class ServerContext<TRequest = any, TResponse = any> extends DefaultInvocationContext implements TransportContext {
    /**
     * target server.
     */
    readonly target: TransportServer;
    /**
     * transport request.
     */
    readonly request: TRequest;
    /**
     * transport response.
     */
    readonly response: TResponse;
    constructor(injector: Injector, request: TRequest, response: TResponse, target: TransportServer, options?: InvokeArguments) {
        super(injector, {
            ...options,
            resolvers: [
                ...options?.resolvers ?? EMPTY,
                ...primitiveResolvers,
                ...injector.get(MODEL_RESOLVERS, EMPTY)
            ]
        });
        this.target = target;
        this.request = request;
        this.response = response;
    }

    protected isSelf(token: Token) {
        return token === TransportContext || token === ServerContext;
    }
    /**
     * Get request rul
     */
    abstract get url(): string;

    /**
     * Set request url
     */
    abstract set url(value: string);

    /**
     * Get request pathname .
     */
    abstract get pathname(): string;
    /**
     * restful params. 
     */
    restfulParams?: any;
    /**
     * request URL query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;
    /**
     * request body, playload.
     */
    get playload(): any {
        return (this.request as any).body
    }
    /**
     * The outgoing HTTP request method.
     */
    abstract get method(): string;
    /**
     * Check if the incoming request contains the "Content-Type"
     * header field and if it contains any of the given mime `type`s.
     * If there is no request body, `null` is returned.
     * If there is no content type, `false` is returned.
     * Otherwise, it returns the first `type` that matches.
     *
     * Examples:
     *
     *     // With Content-Type: text/html; charset=utf-8
     *     this.is('html'); // => 'html'
     *     this.is('text/html'); // => 'text/html'
     *     this.is('text/*', 'application/json'); // => 'text/html'
     *
     *     // When Content-Type is application/json
     *     this.is('json', 'urlencoded'); // => 'json'
     *     this.is('application/json'); // => 'application/json'
     *     this.is('html', 'application/*'); // => 'application/json'
     *
     *     this.is('html'); // => false
     */
    abstract is(type: string | string[]): string | null | false;
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    abstract get body(): any;
    /**
     * Set response body.
     *
     * @param {any} value
     * @api public
     */
    abstract set body(value: any);

    /**
     * response body length.
     */
    abstract get length(): number | undefined;

    /**
     * is update modle resquest.
     */
    abstract isUpdate(): boolean;

    /**
     * Get response status code.
     */
    abstract get status(): number;
    /**
     * Set response status code, defaults to OK.
     */
    abstract set status(status: number);
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract get statusMessage(): string;
    /**
     * Set Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract set statusMessage(msg: string);
    /**
     * Whether the status code is ok
     */
    abstract get ok(): boolean;
    /**
     * Whether the status code is ok
     */
    abstract set ok(ok: boolean);

    /**
     * has sent or not.
     */
    abstract get sent(): boolean;

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
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    abstract throwError(status: number, message?: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    abstract throwError(message: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param error error 
     * @returns instance of {@link TransportError}
     */
    abstract throwError(error: Error): Error;


    /**
     * Return request header.
     *
     * The `Referrer` header field is special-cased,
     * both `Referrer` and `Referer` are interchangeable.
     *
     * Examples:
     *
     *     this.get('Content-Type');
     *     // => "text/plain"
     *
     *     this.get('content-type');
     *     // => "text/plain"
     *
     *     this.get('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    abstract getHeader(field: string): string | string[] | number | undefined;


    /**
     * has response header field or not.
     * @param field 
     */
    abstract hasHeader(field: string): boolean;
    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    abstract setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {Record<string, string | number | string[]>} fields
     * @param {String} val
     * @api public
     */
    abstract setHeader(fields: Record<string, string | number | string[]>): void;
    /**
     * Remove response header `field`.
     *
     * @param {String} name
     * @api public
     */
    abstract removeHeader(field: string): void;

    override missingError(missings: Parameter<any>[], type: ClassType<any>, method: string): MissingParameterError {
        return new TransportMissingError(missings, type, method)
    }

    protected override clear(): void {
        super.clear();
        (this as any).target = null;
    }
}

export class TransportMissingError extends MissingParameterError {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(parameters, type, method)
    }
}



export function missingPipeError(parameter: Parameter, type?: ClassType, method?: string) {
    return new TransportArgumentError(`missing pipe to transform argument ${parameter.paramName} type, method ${method} of class ${type}`)
}

const primitiveResolvers: TransportArgumentResolver[] = [
    composeResolver<TransportArgumentResolver, TransportParameter>(
        (parameter, ctx) => (ctx instanceof ServerContext || ctx instanceof TransportContext) && isDefined(parameter.field ?? parameter.paramName),
        composeResolver<TransportArgumentResolver>(
            (parameter, ctx) => isPrimitiveType(parameter.type),
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'query' && isDefined(ctx.query[parameter.field ?? parameter.paramName!])
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.query[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && ctx.restfulParams && isDefined(ctx.restfulParams[parameter.field ?? parameter.paramName!])
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.restfulParams[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'body' && isDefined(ctx.playload[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.playload[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    return !parameter.scope && isDefined(ctx.query[field] ?? ctx.restfulParams?.[field] ?? ctx.playload[field])
                },
                resolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.query[field] ?? ctx.restfulParams?.[field] ?? ctx.playload[field], ...parameter.args || EMPTY)
                }
            }
        ),
        composeResolver<TransportArgumentResolver, TransportParameter>(
            (parameter) => isPrimitiveType(parameter.provider) && (parameter.mutil === true || parameter.type === Array),
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    return parameter.scope === 'query' && (isArray(ctx.query[field]) || isString(ctx.query[field]))
                },
                resolve(parameter, ctx) {
                    const value = ctx.playload[parameter.field ?? parameter.paramName!];
                    const values: any[] = isString(value) ? value.split(',') : value;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && ctx.restfulParams && isDefined(ctx.restfulParams[parameter.field ?? parameter.paramName!])
                },
                resolve(parameter, ctx) {
                    const value = (ctx.restfulParams[parameter.field ?? parameter.paramName!] as string).split(',');
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            },
            {
                canResolve(parameter, ctx) {
                    return isArray(ctx.playload[parameter.field ?? parameter.paramName!])
                },
                resolve(parameter, ctx) {
                    const value: any[] = ctx.playload[parameter.field ?? parameter.paramName!];
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            }
        ),
        {

            canResolve(parameter, ctx) {
                return isDefined(parameter.pipe) && parameter.scope === 'body'
                    && (parameter.field ? ctx.playload[parameter.field] : Object.keys(ctx.playload).length > 0)
            },
            resolve(parameter, ctx) {
                const value = parameter.field ? ctx.playload[parameter.field] : ctx.playload;
                const pipe = ctx.get<PipeTransform>(parameter.pipe!);
                if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                return pipe.transform(value, ...parameter.args || EMPTY)
            }
        },
        {
            canResolve(parameter, ctx) {
                return parameter.nullable === true
            },
            resolve(parameter, ctx) {
                return undefined as any
            }
        }
    )
]
