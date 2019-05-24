import { BuildHandle, ComponentRegisterAction } from '../../core';
import { BuildContext } from './BuildContext';
import { DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';

export abstract class ResolveHandle extends BuildHandle<BuildContext> {

    isComponent(ctx: BuildContext): boolean {
        return this.container.get(DesignDecoratorRegisterer).has(ctx.decorator, DecoratorScopes.Class, ComponentRegisterAction)
    }
}
