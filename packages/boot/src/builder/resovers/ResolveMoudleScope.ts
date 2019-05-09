import { CompositeHandle } from '../../core';
import { DecoratorBuildHandle } from './DecoratorBuildHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BuildModuleHandle } from './BuildModuleHandle';
import { BuildContext } from './BuildContext';
import { BindingScope } from './BindingScope';
import { BuildDecoratorRegisterer } from './BuildDecoratorRegisterer';
import { ParseScope } from '../parses';
import { InitResolveModuleHandle } from './InitResolveModuleHandle';
import { InitTemplateHandle } from './InitTemplateHandle';
import { InitBindingParamHandle } from './InitBindingParamHandle';


export class ResolveMoudleScope extends CompositeHandle<BuildContext> {

    setup() {
        if (!this.container.has(BuildDecoratorRegisterer)) {
            this.container.register(BuildDecoratorRegisterer);
        }
        this.registerHandle(ParseScope, true)
            .registerHandle(BindingScope, true);

        this.use(InitResolveModuleHandle)
            .use(InitTemplateHandle)
            .use(InitBindingParamHandle)
            .use(ResolveModuleHandle)
            .use(BuildModuleHandle)
            .use(DecoratorBuildHandle)
            .use(BindingScope);
    }
}
