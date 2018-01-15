// import { IContainer } from '../IContainer';
// import { Token, ToInstance, Providers } from '../types';
// import { InvokeProvider } from './InvokeProvider';

// /**
//  * param provider.
//  *
//  * @export
//  * @interface ParamProvider
//  */
// export class ParamProvider extends InvokeProvider {
//     /**
//      * param index, param name.
//      *
//      * @type {number}
//      * @memberof ParamProvider
//      */
//     index?: number | string;

//     constructor(index?: number | string, value?: any | ToInstance<any>, type?: Token<any>, method?: string) {
//         super(type, method, value);
//         this.index = index;
//     }

//     resolve<T>(container: IContainer, ...providers: Providers[]): T {
//         return super.resolve(container, ...providers);
//     }
// }

