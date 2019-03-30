// import { Next } from './Handle';
// import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
// import { Singleton } from '@tsdi/ioc';

// /**
//  * register module handle.
//  *
//  * @export
//  * @class RegisterModuleHandle
//  * @extends {AnnoationHandle}
//  */
// @Singleton
// export class RegisterModuleHandle extends AnnoationHandle {
//     async execute(ctx: AnnoationContext, next: Next): Promise<void> {
//         ctx.getRaiseContainer().register(ctx.type);
//         await next();
//     }
// }
