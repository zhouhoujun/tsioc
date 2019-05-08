import { CompositeHandle } from '../../core';
import { DecoratorBuildHandle } from './DecoratorBuildHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BuildModuleHandle } from './BuildModuleHandle';
import { BuildContext } from './BuildContext';
import { BindingScope } from './BindingScope';
import { ModuleBuildDecoratorRegisterer } from './ModuleBuildDecoratorRegisterer';


export class ResolveMoudleScope extends CompositeHandle<BuildContext> {

    setup() {
        if (!this.container.has(ModuleBuildDecoratorRegisterer)) {
            this.container.register(ModuleBuildDecoratorRegisterer);
        }
        this.registerHandle(BindingScope, true);

        this.use(ResolveModuleHandle)
            .use(BuildModuleHandle)
            .use(DecoratorBuildHandle)
            .use(BindingScope);
    }
}
