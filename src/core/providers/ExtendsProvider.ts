// import { Provider } from './Provider';
// import { Token, ToInstance, Providers, Express2 } from '../types';
// import { IContainer } from '../IContainer';
// import { isFunction, isObject } from '../utils/index';

// /**
//  * Provider enable exntends target with provider in dynamic.
//  *
//  * @export
//  * @class ExtendsProvider
//  * @extends {Provider}
//  */
// export class ExtendsProvider extends Provider {


//     constructor(type: Token<any>, value?: any | ToInstance<any>, private extendsTarget?: Express2<any, ExtendsProvider, void>) {
//         super(type, value);
//     }

//     resolve<T>(container: IContainer, ...providers: Providers[]): T {
//         return super.resolve(container, ...providers);
//     }

//     extends(target: any) {
//         if (isObject(target) && isFunction(this.extendsTarget)) {
//             this.extendsTarget(target, this);
//         }
//     }
// }
