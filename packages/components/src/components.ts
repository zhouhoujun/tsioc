import { isType, Module, ResolveInterceptorFn, Runtime, Type } from '@tsdi/ioc';
import { ApplicationContext, bootstrapApplication, EnvironmentOption } from '@tsdi/core';
import { ComponentFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';
// import { ReactiveEffect } from './effect';
// import { DefaultReactiveEffect } from './impl/effect';
import { VForDirective } from './directives/for.dir';
import { VElseDirective, VElseIfDirective, VIfDirective } from './directives/if.dir';
import { DirectiveFactory } from './refs/directive';
import { DirectiveFactoryImpl } from './impl/directive';
import { ClassDirective } from './directives/class';
import { StyleDirective } from './directives/style';
import { CaseDirective, SwitchDirective } from './directives/switch-case.dir';
import { TemplateOutletDirective } from './directives/template-outlet.dir';
import { VShowDirective } from './directives/show.dir';
import { VBindDirective, VOnDirective } from './directives/bind.dir';
import { componentResolvers } from './impl/resolvers';




/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@Module({
    providers: [
        { provide: ComponentFactory, useClass: ComponentFactoryImpl, deps: [Runtime] },
        { provide: DirectiveFactory, useClass: DirectiveFactoryImpl, deps: [Runtime] },
        componentResolvers
        // { provide: ReactiveEffect, useClass: DefaultReactiveEffect }
    ],
    exports: [
        VForDirective,
        VIfDirective,
        VElseIfDirective,
        VElseDirective,
        ClassDirective,
        StyleDirective,
        SwitchDirective,
        CaseDirective,
        TemplateOutletDirective,
        VShowDirective,
        VBindDirective,
        VOnDirective
    ]
})
export class ComponentsModule {

}

export type RendererType = 'html' | 'xml' | 'json';

export interface ComponentBootOptions extends EnvironmentOption {
    /**
     * renderer type for workflow definition, default is 'xml'.
     */
    renderer?: RendererType;
    /**
     * workflow component properties.
     */
    props?: Record<string, any>;
}

export async function bootstrapComponent<T>(rootComponent: Type<T>, options?: ComponentBootOptions): Promise<ApplicationContext<T>>  {
    const deps = options?.deps || [];
    const rderType = options?.renderer || 'xml';
    if (rderType === 'html') {
        const { HtmlTemplateModule } = await import('@tsdi/components/html');
        deps.unshift(HtmlTemplateModule);
    } else if (rderType === 'xml') {
        const { XmlTemplateModule } = await import('@tsdi/components/xml');
        deps.unshift(XmlTemplateModule);
    } else if (rderType === 'json') {
        const { JsonTemplateModule } = await import('@tsdi/components/json');
        deps.unshift(JsonTemplateModule);
    }

    if (!deps.includes(ComponentsModule)) {
        deps.unshift(ComponentsModule);
    }

    return await bootstrapApplication(rootComponent, {
        ...options,
        deps
    });
}
