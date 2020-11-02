import { AnnotationReflect } from '@tsdi/boot';
import { ComponentMetadata, DirectiveMetadata } from './metadata';
import { ComponentDef, DirectiveDef } from './vdom/definition';


/**
 * directive reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface DirectiveReflect extends AnnotationReflect {

    def?: DirectiveDef<any>;

    /**
     * directive selector.
     */
    selector?: string;

    /**
     * annoation metadata.
     */
    annotation?: DirectiveMetadata;
}



/**
 * component reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface ComponentReflect extends AnnotationReflect {

    def?: ComponentDef<any>;
    /**
     * component selector.
     */
    selector?: string;
    /**
     * component annoation metadata.
     */
    annotation?: ComponentMetadata;

    directives?: any[];
    pipes?: any[];

    inputs?: any[];
    outputs?: any[];

    /**
     * none serializes.
     */
    nonSerialize?: string[];

}
