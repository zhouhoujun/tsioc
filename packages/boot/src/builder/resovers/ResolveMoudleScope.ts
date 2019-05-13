import { CompositeHandle } from '../../core';
import { DecoratorBuildHandle } from './DecoratorBuildHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BuildContext } from './BuildContext';
import { BindingScope } from './BindingScope';
import { BuildDecoratorRegisterer } from './BuildDecoratorRegisterer';
import { ParseScope } from '../parses';
import { InitResolveModuleHandle } from './InitResolveModuleHandle';
import { InitBindingParamHandle } from './InitBindingParamHandle';
import { ModuleBeforeInitHandle } from './ModuleBeforeInitHandle';
import { ModuleAfterInitHandle } from './ModuleAfterInitHandle';
import { ResolveTemplateScope } from './ResolveTemplateScope';


export class ResolveMoudleScope extends CompositeHandle<BuildContext> {

    setup() {
        if (!this.container.has(BuildDecoratorRegisterer)) {
            this.container.register(BuildDecoratorRegisterer);
        }
        this.registerHandle(ParseScope, true)
            .registerHandle(BindingScope, true);

        this.use(InitResolveModuleHandle)
            .use(InitBindingParamHandle)
            .use(ResolveModuleHandle)
            .use(ModuleBeforeInitHandle)
            .use(DecoratorBuildHandle)
            .use(BindingScope)
            .use(ModuleAfterInitHandle)
            .use(ResolveTemplateScope);
    }
}
