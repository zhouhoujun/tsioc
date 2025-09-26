import { Abstract, ClassRef, AbstractType, InvocationFactory, InvocationOptions, AbstractInvocation, TypeDef, ModuleType } from '@tsdi/ioc';
import { AttributeMetadata } from '../decorators/atteribute';
import { SchemaMetadata } from '../template/schema';
import { ElementRef } from './element';
import { NodeType } from '../renderer/Node';
import { EnvironmentContext } from './environment';


export const factoryKey = 'ƿfac';


export interface DirectiveDef<T = any> extends TypeDef<T> {
    imports?: ModuleType[],
    selector: string;
    styles?: string[];
    styleUrls?: string[];
    providers?: any[];
    nodeType?: NodeType;
    // states?: StateMetadata[];
    attributes?: AttributeMetadata[];
    schemas?: SchemaMetadata[];
}

export interface Factoriable<T = any> {
    ƿfac?: (ctx: EnvironmentContext, options: DirectiveOptions) => T;
}


/**
 * DirectiveRef.
 */
@Abstract()
export abstract class DirectiveRef<T> extends AbstractInvocation<T, DirectiveOptions, EnvironmentContext> {

    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get elementRef(): ElementRef;

    /**
     * render component.
     *
     * @abstract
     * @memberof ComponentRef
     */
    render?(): Promise<void>;
}

/**
 * Component options.
 */
export interface DirectiveOptions extends InvocationOptions {
    elementRef?: ElementRef;
}



/**
 * ComponentRef factory.
 */
@Abstract()
export abstract class DirectiveFactory<TOpts extends DirectiveOptions = DirectiveOptions> implements InvocationFactory<TOpts> {
    /**
     * create ReflectiveRef of target type
     * @param type target type or target type def.
     * @param option target type invoke option {@link DirectiveOptions}
     * @returns instance of {@link DirectiveRef}
     */
    abstract create<T>(type: AbstractType<T> | ClassRef<T> | DirectiveDef<T>, option?: TOpts): DirectiveRef<T>;

}


