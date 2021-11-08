// import { Abstract, DefaultInjector, Injector, Modules, ProviderType, ProvidedInMetadata, Registered, Type } from '@tsdi/ioc';
// import { ModuleReflect } from './metadata/ref';

// /**
//  * module exports provider.
//  */
//  export interface IModuleExports extends Injector {
//     /**
//      * export moduleRefs.
//      */
//     exports: ModuleInjector[]
//     /**
//      * export type.
//      * @param type 
//      */
//     export(type: Type, noRef?: boolean, hasReged?: boolean): void;
// }

// /**
//  * module injector.
//  */
// @Abstract()
// export abstract class ModuleInjector<T = any> extends DefaultInjector {

//     /**
//      * is root injector or not.
//      */
//     abstract get isRoot(): boolean;
//     /**
//      * module type.
//      */
//     abstract get type(): Type<T>;
//     /**
//      * module instance.
//      */
//     abstract get instance(): T;
//     /**
//      * reg in
//      */
//     abstract get regIn(): string;
//     /**
//      * module imports.
//      */
//     abstract get imports(): ModuleInjector[];
//     /**
//      * module exports.
//      */
//     abstract get exports(): IModuleExports;
//     /**
//     * get target reflect.
//     */
//     abstract get reflect(): ModuleReflect<T>;
// }


// /**
//  * module registered state.
//  */
// export interface ModuleRegistered extends Registered {
//     moduleRef?: ModuleInjector;
// }

// /**
//  * module option.
//  */
// export interface ModuleOption<T = any> extends ProvidedInMetadata {
//     /**
//      * boot base url.
//      *
//      * @type {string}
//      */
//     baseURL?: string;
//     /**
//      * boot run env args.
//      *
//      * @type {string[]}
//      */
//     args?: string[];
//     /**
//      * injector.
//      */
//     injector?: Injector;

//     /**
//      *  providers.
//      */
//     providers?: ProviderType[];

//     /**
//      * dependence types.
//      */
//     deps?: Modules[];

//     root?: boolean;
// }

// @Abstract()
// export abstract class ModuleFactory<T = any> {
//     abstract get moduleType(): Type<T>;
//     abstract create(parent: Injector, option?: ModuleOption): ModuleInjector<T>;
// }

// @Abstract()
// export abstract class ModuleFactoryResolver {
//     abstract resolve<T>(type: Type<T>): ModuleFactory<T>;
// }
