// import { ResolveServicesScope, ServicesContext } from '../actions/serv';
// import { Injector, ProviderType, ServicesOption, ServicesProvider } from '../injector';
// import { TARGET } from '../metadata/tk';
// import { Token } from '../tokens';
// import { EMPTY, isArray, isFunction, isPlainObject } from '../utils/chk';
// import { cleanObj, getClass } from '../utils/lang';
// import { resolveToken } from './resolves';

// /**
//  * service provider.
//  */
// export class Services implements ServicesProvider {

//     static ρNPT = true;
//     private servicesScope!: ResolveServicesScope;

//     constructor(private readonly injector: Injector) { }
//     /**
//     * get all service extends type.
//     *
//     * @template T
//     * @param {Injector} injector
//     * @param {Token<T>} token servive token or express match token.
//     * @param {ProviderType[]} providers
//     * @returns {T[]} all service instance type of token type.
//     */
//     getServices<T>(injector: Injector, token: Token<T>, providers: ProviderType[]): T[];
//     /**
//      * get all service extends type.
//      *
//      * @template T
//      * @param {Injector} injector
//      * @param {ServicesOption<T>} option servive token or express match token.
//      * @returns {T[]} all service instance type of token type.
//      */
//     getServices<T>(injector: Injector, option: ServicesOption<T>): T[];
//     getServices<T>(injector: Injector, target: Token<T> | ServicesOption<T>, args?: ProviderType[]): T[] {
//         let providers: ProviderType[];
//         if (isPlainObject(target)) {
//             providers = (target as ServicesOption<T>).providers || [];
//             if ((target as ServicesOption<T>).target) {
//                 providers.push({ provide: TARGET, useValue: (target as ServicesOption<T>).target });
//             }
//         } else {
//             providers = args || EMPTY;
//         }
//         let context = {
//             injector,
//             ...isPlainObject(target) ? target : { token: target },
//         } as ServicesContext;

//         this.initTargetRef(context);
//         if (!this.servicesScope) {
//             this.servicesScope = this.injector.platform().getAction(ResolveServicesScope);
//         }

//         const services: T[] = [];
//         this.servicesScope.execute(context);
//         const pdr = providers.length ? Injector.create(providers, injector, 'provider') : injector;
//         context.services.forEach(rd => {
//             services.push(resolveToken(rd, pdr));
//         });
//         providers.length && pdr.destroy();
//         context.services.clear();
//         // clean obj.
//         cleanObj(context);
//         return services;
//     }

//     private initTargetRef(ctx: ServicesContext) {
//         let targets = (isArray(ctx.target) ? ctx.target : [ctx.target]).filter(t => t).map(tr => isFunction(tr) ? tr : getClass(tr));
//         if (targets.length) {
//             ctx.targetRefs = targets;
//         }
//     }
// }
