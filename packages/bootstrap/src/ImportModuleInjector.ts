// import { SyncModuleInjector, Express, Type, IContainer } from '@ts-ioc/core';

// export class ImportModuleInjector extends SyncModuleInjector {

//     protected async setup(container: IContainer, type: Type<any>) {
//         let imp = await this.load(token, null, container);
//         if (!container.has(imp.moduleToken)) {
//             await this.importConfigExports(container, imp.container, imp.moduleConfig);
//             imp.container.parent = container;
//             if (imp.moduleToken) {
//                 container.bindProvider(imp.moduleToken, imp);
//             }
//         }
//     }
// }
