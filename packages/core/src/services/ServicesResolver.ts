// import {
//     IocCoreService, IIocContainer, Token,
//     ClassType, ParamProviders, Singleton, Inject,
// } from '@ts-ioc/ioc';
// import { IServicesResolver } from '../IServicesResolver';
// import { IteratorService } from './IteratorService';
// import { ContainerToken } from '../IContainer';

// @Singleton
// export class ServicesResolver extends IocCoreService implements IServicesResolver {

//     @Inject(ContainerToken)
//     private container: IIocContainer

//     /**
//      * get all service extends type and reference target.
//      *
//      * @template T
//      * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
//      * @param {(Token<any> | Token<any>[])} [target] service refrence target.
//      * @param {(boolean|ParamProviders)} [both]
//      * @param {(boolean|ParamProviders)} [both] get services bubble up to parent container.
//      * @param {...ParamProviders[]} providers
//      * @returns {T}
//      * @memberof IContainer
//      */
//     getServices<T>(token: Token<T> | ((token: ClassType<T>) => boolean), target?: Token<any> | Token<any>[] | ParamProviders, both?: boolean | ParamProviders, ...providers: ParamProviders[]): T[] {
//         let services: T[] = [];
//         this.container.resolve(IteratorService).each((tk, fac, resolver, ...pds) => {
//             services.push(fac(...pds));
//         }, token, target, both, ...providers);
//         return services;
//     }
// }
