// import {
//     Abstract, ArgumentExecption, Autorun, AutoWired, EMPTY, InvocationContext,
//     isFunction, isType, lang, ProviderType, StaticProvider, Token, Type, TypeOf
// } from '@tsdi/ioc';
// import { Log, Logger } from '@tsdi/logs';
// import { Endpoint, EndpointBackend, Endpoints } from '../Endpoint';
// import { Interceptor } from '../Interceptor';
// import { ExecptionBackend, ExecptionFilter, ExecptionHandlerBackend } from '../filters/execption.filter';
// import { Filter } from '../filters/filter';

// /**
//  * transport endpoint options.
//  */
// @Abstract()
// export abstract class TransportOpts<TInput, TOutput> {
//     /**
//      * providers for transport.
//      */
//     abstract providers?: ProviderType[];
//     /**
//      * interceptors or filter of endpoint.
//      */
//     abstract interceptors?: TypeOf<Interceptor<TInput, TOutput>>[];
//     /**
//      * the mutil token to register intereptors in the endpoint context.
//      */
//     abstract interceptorsToken?: Token<Interceptor<TInput, TOutput>[]>;
//     /**
//      * backend.
//      */
//     abstract backend?: StaticProvider<EndpointBackend>;
//     /**
//      * execption filters.
//      */
//     abstract filters?: TypeOf<ExecptionFilter>[];
//     /**
//      * the mutil token to register execption filters in the context.
//      */
//     abstract filtersToken?: Token<ExecptionFilter[]>;
//     /**
//      * execption filters backend.
//      */
//     abstract filtersBackend?: StaticProvider<ExecptionBackend>;
//     /**
//      * endpoint timeout.
//      */
//     abstract timeout?: number;

// }


// /**
//  * abstract transport endpoint.
//  */
// @Abstract()
// export abstract class TransportEndpoint<
//     TInput = any,
//     TOutput = any,
//     Opts extends TransportOpts<TInput, TOutput> = TransportOpts<TInput, TOutput>> {

//     /**
//      * logger of endpoint.
//      */
//     @Log()
//     readonly logger!: Logger;
//     /**
//      * context of the endpoint.
//      */
//     @AutoWired()
//     readonly context!: InvocationContext;

//     private _chain?: Endpoint<TInput, TOutput>;
//     private _iptToken!: Token<Interceptor<TInput, TOutput>[]>;
//     private _bToken!: Token<EndpointBackend<TInput, TOutput>>;
//     private _expFToken!: Token<ExecptionFilter[]>;
//     private _expFilter?: ExecptionBackend;
//     private _expBToken!: Token<ExecptionBackend>;
//     private _opts: Opts;

//     constructor(options?: Opts) {
//         this._opts = this.initOption(options);
//     }

//     /**
//      * auto run endpoint init after create new instance.
//      */
//     @Autorun()
//     protected onEndpointInit() {
//         const opts = this.getOptions();
//         this.validOptions(opts);
//         this.initContext(opts);
//     }

//     getOptions(): Opts {
//         return this._opts;
//     }

//     /**
//      * use interceptors.
//      * @param interceptor 
//      * @param order 
//      * @returns 
//      */
//     intercept(interceptor: TypeOf<Interceptor<TInput, TOutput>>, order?: number): this {
//         this.multiOrder(this._iptToken, interceptor, order);
//         this.resetEndpoint();
//         return this
//     }

//     /**
//      * use execption filter.
//      * @param filter 
//      */
//     useExecptionFilter(filter: TypeOf<Filter>, order?: number): this {
//         if (!this._expFToken) {
//             throw new ArgumentExecption(lang.getClassName(this) + ' options execptionsToken is missing.');
//         }
//         this.multiOrder(this._expFToken, filter, order);
//         this._expFilter = null!;
//         return this;
//     }

//     /**
//      * execption filter chain.
//      */
//     execptionfilter(): Endpoint {
//         if (!this._expFilter) {
//             this._expFilter = new Endpoints(this.getExecptionBackend(), this.context.injector.get(this._expFToken, EMPTY));
//         }
//         return this._expFilter;
//     }

//     /**
//      * transport endpoint chain.
//      */
//     get endpoint(): Endpoint<TInput, TOutput> {
//         if (!this._chain) {
//             this._chain = this.buildEndpoint();
//         }
//         return this._chain
//     }

//     protected buildEndpoint(): Endpoint<TInput, TOutput> {
//         return new Endpoints(this.getBackend(), this.context.injector.get(this._iptToken, EMPTY));
//     }

//     /**
//      * reset endpoint.
//      */
//     protected resetEndpoint() {
//         this._chain = null!;
//     }

//     /**
//      *  get backend endpoint. 
//      */
//     protected getBackend(): EndpointBackend<TInput, TOutput> {
//         return this.context.get(this._bToken);
//     }

//     /**
//      *  get backend endpoint. 
//      */
//     protected getExecptionBackend(): ExecptionBackend {
//         return this.context.get(this._expBToken);
//     }

//     /**
//      * initialize options.
//      * @param options 
//      */
//     protected abstract initOption(options?: Opts): Opts;

//     /**
//      * valid options.
//      * @param opts
//      * @returns 
//      */
//     protected validOptions(opts: Opts): void {
//         this._iptToken = opts.interceptorsToken!;
//         if (!this._iptToken) {
//             throw new ArgumentExecption(lang.getClassName(this) + ' options interceptorsToken is missing.');
//         }
//         if (!opts.backend) {
//             throw new ArgumentExecption(lang.getClassName(this) + ' options backend is missing.');
//         }
//         this._expFToken = opts.filtersToken!;
//         if (!this._expFToken) {
//             throw new ArgumentExecption(lang.getClassName(this) + ' options filtersToken is missing.');
//         }
//     }

//     /**
//      * initialize context with options.
//      * @param options 
//      */
//     protected initContext(options: Opts): void {
//         const injector = this.context.injector;

//         injector.inject({ provide: Logger, useFactory: () => this.logger });
//         if (options.providers && options.providers.length) {
//             injector.inject(options.providers);
//         }

//         if (options.interceptors && options.interceptors.length) {
//             this.multiReg(this._iptToken, options.interceptors);
//         }

//         this._bToken = this.regProvider(options.backend!);

//         if (options.filters && options.filters.length) {
//             this.multiReg(this._expFToken, options.filters);
//         }
//         if (!options.filtersBackend) {
//             options.filtersBackend = ExecptionHandlerBackend;
//         }
//         this._expBToken = this.regProvider(options.filtersBackend);

//     }

//     protected multiReg<T>(provide: Token, types: (Type<T> | T)[]): void {
//         const providers = types.map(m => {
//             if (isType(m)) {
//                 return { provide, useClass: m, multi: true }
//             } else {
//                 return { provide, useValue: m, multi: true }
//             }
//         });
//         this.context.injector.inject(providers);
//     }

//     protected multiOrder<T>(provide: Token, target: Type<T> | T, multiOrder?: number) {
//         if (isType(target)) {
//             this.context.injector.inject({ provide, useClass: target, multi: true, multiOrder })
//         } else {
//             this.context.injector.inject({ provide, useValue: target, multi: true, multiOrder })
//         }
//     }

//     protected regProvider(provider: StaticProvider): Token {
//         const prvoide = isType(provider) ? provider : provider.provide;
//         this.context.injector.inject(provider);
//         return prvoide;
//     }
// }
