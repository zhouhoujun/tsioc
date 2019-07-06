import { BuilderService, HandleRegisterer, IModuleResolveOption } from '@tsdi/boot';
import { Singleton, ProviderTypes, Type } from '@tsdi/ioc';
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
        let ctx = TemplateContext.parse({ ...options, providers: [...(options.providers || []), ...providers] });
        ctx.decorator = ctx.decorator || Component.toString();
        if (!ctx.hasRaiseContainer()) {
            ctx.setRaiseContainer(this.container);
        }
        await this.container.get(HandleRegisterer)
            .get(TemplateParseScope)
            .execute(ctx);
        return ctx.value;
    }


    async resolveComponent<T>(target: Type<T>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<any> {
        let boot = this.resolve(target, options, ...providers);
    }
}
