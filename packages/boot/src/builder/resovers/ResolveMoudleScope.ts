import { CompositeHandle } from '../../core';
import { DecoratorBuildHandle } from './DecoratorBuildHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BuildModuleHandle } from './BuildModuleHandle';
import { BuildContext } from './BuildContext';
import { BindingScope } from './BindingScope';
import { ModuleBuildDecoratorRegisterer } from './ModuleBuildDecoratorRegisterer';
import { Component } from '@tsdi/ioc';


export class ResolveMoudleScope extends CompositeHandle<BuildContext> {

    setup() {
        if (!this.container.has(ModuleBuildDecoratorRegisterer)) {
            this.container.register(ModuleBuildDecoratorRegisterer);
        }
        this.registerHandle(BindingScope, true);

        this.container.get(ModuleBuildDecoratorRegisterer)
            .register(Component, BindingScope);

        this.use(ResolveModuleHandle)
            .use(BuildModuleHandle)
            .use(DecoratorBuildHandle)
            .use(BindingScope);
    }
}
