// import { ResolveHandle } from './ResolveHandle';
// import { BuildContext } from './BuildContext';
// import { isArray } from '@tsdi/ioc';

// export class InitTemplateHandle extends ResolveHandle {
//     async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
//         if (!ctx.template) {
//             ctx.template = ctx.annoation.template;
//         } else if (ctx.annoation.template) {
//             if (!isArray(ctx.template) && isArray(ctx.annoation.template)) {
//                 ctx.template = ctx.annoation.template;
//             } else if (!isArray(ctx.template)) {
//                 ctx.template = Object.assign({}, ctx.annoation.template, ctx.template);
//             }
//         }
//         await next();
//     }
// }
