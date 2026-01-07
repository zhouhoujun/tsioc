import { Abstract, ClassRef, AbstractType, InvocationFactory, InvocationOptions, AbstractInvocation, ProvdierOf } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { EmbeddedViewRef } from './view';
import { DirectiveDef, factoryKey } from './directive';
import { EnvironmentContext } from './environment';
import { ElementRef } from './element';
import { Renderer } from '../renderer/Renderer';

export interface ComponentDef<T = any> extends Omit<DirectiveDef<T>, typeof factoryKey> {
    template?: any;
    templateUrl?: string;
    ƿFac?: (ctx: EnvironmentContext, options: ComponentOptions) => ComponentRef<T>;
}

/**
 * ComponentRef.
 */
@Abstract()
export abstract class ComponentRef<T> extends AbstractInvocation<T, ComponentOptions, EnvironmentContext> {

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
    scheduler?: (fn: Function) => void;
    elementRef?: ElementRef;
}



/**
 * ComponentRef factory.
 */
@Abstract()
export abstract class ComponentFactory<TOpts extends ComponentOptions = ComponentOptions> implements InvocationFactory<TOpts> {
    /**
     * create ReflectiveRef of target type
     * @param type target type or target type def.
     * @param option target type invoke option {@link ComponentOptions}
     * @returns instance of {@link ComponentRef}
     */
    abstract create<T>(type: AbstractType<T> | ClassRef<T> | ComponentDef<T>, option?: TOpts): ComponentRef<T>;

}


