import { ClassRef, AbstractType, InvocationFactory, InvocationOptions, AbstractInvocation, ProvdierOf } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { EmbeddedViewRef } from './view';
import { DirectiveDef, factoryKey } from './directive';
import { NodeInjector } from './injector';
import { ElementRef } from './element';
import { Renderer } from '../renderer/Renderer';
import { noReact } from '../effect';
import { RNode } from '../renderer/Node';
import { TemplateFactory } from './template';
export interface ComponentDef<T = any> extends Omit<DirectiveDef<T>, typeof factoryKey> {
    template?: any;
    templateUrl?: string;
    ƿFac?: (ctx: NodeInjector, options: ComponentOptions) => ComponentRef<T>;
    ƿtempFac?: TemplateFactory<T>;
}
/**
 * ComponentRef.
 */
export declare abstract class ComponentRef<T> extends AbstractInvocation<T, ComponentOptions, NodeInjector> {
    [noReact]: boolean;
    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get elementRef(): ElementRef;
    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get hostView(): EmbeddedViewRef<T>;
    /**
     * render component.
     *
     * @abstract
     * @memberof ComponentRef
     */
    abstract render(): Promise<void>;
}
/**
 * Component options.
 */
export interface ComponentOptions extends TemplateCompilerOptions, InvocationOptions {
    compiler?: ProvdierOf<TemplateCompiler>;
    renderer?: ProvdierOf<Renderer>;
    host?: RNode;
    scheduler?: (fn: Function) => void;
    elementRef?: ElementRef;
}
/**
 * ComponentRef factory.
 */
export declare abstract class ComponentFactory<TOpts extends ComponentOptions = ComponentOptions> implements InvocationFactory<TOpts> {
    /**
     * create ReflectiveRef of target type
     * @param type target type or target type def.
     * @param option target type invoke option {@link ComponentOptions}
     * @returns instance of {@link ComponentRef}
     */
    abstract create<T>(type: AbstractType<T> | ClassRef<T> | ComponentDef<T>, option?: TOpts): ComponentRef<T>;
}
