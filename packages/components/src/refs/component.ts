import { Abstract, Class, InvokeArguments, ReflectiveRef, Token } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';

@Abstract()
export abstract class ComponentRef<T> extends ReflectiveRef<T> {
    /**
     * render component.
     *
     * @abstract
     * @memberof ComponentRef
     */
    abstract get compiler(): TemplateCompiler;

    /**
     * This component instance.
     */
    abstract get instance(): T;
    /**
     * render component.
     *
     * @abstract
     * @memberof ComponentRef
     */
    abstract render(): Promise<void>;
}

export interface ComponentOptions extends TemplateCompilerOptions, InvokeArguments {

}



/**
 * ComponentRef factory.
 */
@Abstract()
export abstract class ComponenFactory {
    /**
     * create ReflectiveRef of target type
     * @param type target type or target type def.
     * @param option target type invoke option {@link InvokeArguments}
     * @returns instance of {@link ReflectiveRef}
     */
    abstract create<T>(type: Token<T> | Class<T>, option?: ComponentOptions): ComponentRef<T>;

}


