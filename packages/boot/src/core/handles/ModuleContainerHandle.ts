// import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
// import { Next } from './Handle';
// import { Singleton, hasOwnClassMetadata } from '@ts-ioc/ioc';
// import { ContainerPoolToken } from '../ContainerPool';
// import { RegScope } from '../modules';

// /**
//  * set module type register container.
//  *
//  * @export
//  * @class ModuleContainerHandle
//  * @extends {AnnoationHandle}
//  */
// @Singleton
// export class ModuleContainerHandle extends AnnoationHandle {

//     async execute(ctx: AnnoationContext, next: Next): Promise<void> {
//         if (!ctx.moduleContainer) {
//             let pools = ctx.resolve(ContainerPoolToken);
//             let mdScope = ctx.annoation.regScope || RegScope.child;
//             ctx.regScope = mdScope;
//             switch (mdScope) {
//                 case RegScope.root:
//                 case RegScope.all:
//                     ctx.moduleContainer = pools.getRoot();
//                     break;
//                 case RegScope.booModule:
//                     ctx.moduleContainer = ctx.getRaiseContainer();
//                     break;
//                 case RegScope.child:
//                     ctx.moduleContainer = pools.create(ctx.getRaiseContainer());
//                     break;
//             }
//             ctx.setContext(() => ctx.moduleContainer)
//         }

//         if (ctx.moduleContainer) {
//             await next();
//         }
//     }
// }
