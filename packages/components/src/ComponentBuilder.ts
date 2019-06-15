import { BuilderService, BuildHandleRegisterer } from '@tsdi/boot';
import { Singleton, ProviderTypes, ContainerFactoryToken } from '@tsdi/ioc';
import { TemplateContext, ITemplateOption, TemplateParseScope } from './parses';
import { Component } from './decorators';

/**
 * component builder.
 *
 * @export
 * @class ComponentBuilder
 * @extends {BuilderService}
 */
@Singleton()
export class ComponentBuilder extends BuilderService {

    async resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<any> {
        if (!options.raiseContainer) {
            options.raiseContainer = this.container.get(ContainerFactoryToken);
        }
        let ctx = TemplateContext.parse({ ...options, providers: [...(options.providers || []), ...providers] });
        ctx.decorator = ctx.decorator || Component.toString();
        await this.container
            .get(BuildHandleRegisterer)
            .get(TemplateParseScope)
            .execute(ctx);
        return ctx.value;
    }

}
