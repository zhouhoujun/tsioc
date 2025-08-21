import { Abstract, Class, AbstractType, InvocationFactory, InvocationOptions, Invocation } from '@tsdi/ioc';
import { TemplateCompilerOptions } from '../template/compiler';
import { ViewRef } from './view';
import { Renderer } from '../renderer/Renderer';

/**
 * ComponentRef.
 */
@Abstract()
export abstract class ComponentRef<T> extends Invocation<T> {

    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get hostView(): ViewRef;

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
    renderer?: Renderer;
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
    abstract create<T>(type: AbstractType<T> | Class<T>, option?: TOpts): ComponentRef<T>;

}


