import { Type } from '@tsdi/ioc';
import { ApplicationContext, EnvironmentOption } from '@tsdi/core';
/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
export declare class ComponentsModule {
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
export declare function bootstrapComponent<T>(rootComponent: Type<T>, options?: ComponentBootOptions): Promise<ApplicationContext<T>>;
