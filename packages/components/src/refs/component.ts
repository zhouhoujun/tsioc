import { Abstract, ClassRef, AbstractType, InvocationFactory, InvocationOptions, AbstractInvocation, ProvdierOf, Type, InvocationContext } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { ViewRef } from './view';
import { DirectiveDef, factoryKey } from './directive';

export interface ComponentDef<T = any> extends Omit<DirectiveDef<T>, typeof factoryKey> {
    template?: any;
    templateUrl?: string;
    ƿFac?: (ctx: InvocationContext, options: ComponentOptions) => ComponentRef<T>;
}

/**
 * ComponentRef.
 */
@Abstract()
export abstract class ComponentRef<T> extends AbstractInvocation<T, ComponentOptions> {

    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get hostView(): ViewRef;

    abstract query<T>(selector: string | Type<T>): T | null;
    abstract queryAll<T>(selector: string | Type<T>): T[];

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


