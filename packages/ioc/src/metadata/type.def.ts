import { InvokeOptions } from '../context';
import { ModuleWithProviders, Provider } from '../providers';
import { ResolveInterceptorLike } from '../resolver';
import { Token, TokenOf } from '../tokens';
import { AbstractType, Annotation, AnnotationType, Type } from '../types';
import { DecoratorFn, DecorDefine, RunableDefine } from './define';
import { AnnotationMetadata, ParameterMetadata, PropertyMetadata } from './meta';



/**
 * type def metadata.
 */
export interface TypeDef<T = any> extends Annotation<T>, AnnotationMetadata {

    /**
     * the type provide tokens
     */
    provides: Token[];
    /**
     * the providers for the type.
     */
    providers: Provider[];
    /**
     * resolvers for the type
     */
    resolvers: TokenOf<ResolveInterceptorLike>[];
    /**
     * runnable defines.
     */
    runnables: RunableDefine[];
    /**
     * exports.
     */
    exportProviders: Provider[];

    propMetadatas: Map<string | symbol, PropertyMetadata[]>;
    methodMetadatas: Map<string | symbol, {
        invokeEnv?: InvokeOptions;
        params?: ParameterMetadata[];
        returnType?: AbstractType;
    }>;

    decDefs: Map<DecoratorFn, DecorDefine[]>;
    classDefs: DecorDefine[];
    propDefs: DecorDefine[];
    methodDefs: DecorDefine[];
    paramDefs: Map<string | symbol, DecorDefine[]>;
}


export const proxyTag = Symbol('__proxy');

/**
 * module def metadata.
 * 
 * 模块元数据
 */
export interface ModuleDef<T = any> extends TypeDef<T> {
    /**
     * is module or not.
     */
    module?: boolean;
    baseURL?: string,
    debug?: boolean,
    /**
     * imports types.
     */
    imports?: (Type | ModuleWithProviders)[];
    /**
     * exports.
     */
    exports?: Type[];
    /**
     *  components, directives, pipes ... of current module.
     */
    declarations?: Type[];
    /**
     * the module bootstraps.
     */
    bootstrap?: AbstractType[] | null;
    /**
    * module extends providers.
    */
    providers: Provider[];
}


const TYEP_DEF = Symbol('TYEP_DEF');
/**
 * get type def.
 * @param type class type.
 */
export function getDef<T extends TypeDef>(type: AbstractType): Partial<T> {
    let tagAnn = Reflect.getMetadata(TYEP_DEF, type) as Partial<T>;
    if (tagAnn?.type !== type) {
        tagAnn = (type as AnnotationType).ƿAnn?.() as Partial<T>;
        if (tagAnn?.type !== type) {
            tagAnn = {
                name: type.name,
                type
            } as Partial<T>;
            Reflect.defineMetadata(TYEP_DEF, tagAnn, type);
        }
    }
    return tagAnn as T
}
