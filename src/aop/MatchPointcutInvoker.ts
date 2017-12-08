// import { IContainer } from '../IContainer';
// import { IMethodAccessor } from '../IMethodAccessor';
// import { Singleton, Inject } from '../core';
// import { symbols } from '../utils';
// import { MatchPointcut } from './MatchPointcut';
// import { Type } from '../Type';


// @Singleton
// export class MatchPointcutInvoker {

//     constructor(
//         @Inject(symbols.IContainer) private container: IContainer,
//         @Inject(symbols.IMethodAccessor) private accessor: IMethodAccessor) {

//     }


//     involer(match: MatchPointcut, aspect: any, type: Type<any>, instance?: any) {
//         if (match.name === 'constructor') {
//             this.accessor.syncInvoke(type, match.advice.propertyKey, aspect, ...data.params);
//         }
//     }
// }
