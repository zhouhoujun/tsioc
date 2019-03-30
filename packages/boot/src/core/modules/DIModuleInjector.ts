import { Type, Singleton, ITypeReflect } from '@tsdi/ioc';
import { ModuleInjectLifeScope } from '../services';
import { ModuleResovler } from './ModuleResovler';
import { IContainer, ModuleInjector } from '@tsdi/core';
import { AnnoationContext } from '../handles';

/**
 * di module reflect info.
 *
 * @export
 * @interface IDIModuleReflect
 * @extends {ITypeReflect}
 */
export interface IDIModuleReflect extends ITypeReflect {
    /**
     * module resolver of DIModule
     *
     * @type {ModuleResovler<any>}
     * @memberof IDIModuleReflect
     */
    moduleResolver?: ModuleResovler<any>;
}

/**
 * DIModule injector.
 *
 * @export
 * @class DIModuleInjector
 * @extends {ModuleInjector}
 */
@Singleton
export class DIModuleInjector extends ModuleInjector {

    getDecorator(): string {
        return '@DIModule';
    }

    protected async setup(container: IContainer, type: Type<any>) {
        await this.execInjects(container, type);
    }

    protected syncSetup(container: IContainer, type: Type<any>) {
        // this.execInjects(container, type);
        throw new Error('DIModule can not sync setup');
    }

    protected async execInjects(container: IContainer, type: Type<any>): Promise<void> {
        let ctx = AnnoationContext.parse(type);
        ctx.setRaiseContainer(container);
        await container.get(ModuleInjectLifeScope).execute(ctx);
    }
}
