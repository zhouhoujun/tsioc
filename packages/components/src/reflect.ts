import { AnnotationReflect } from '@tsdi/boot';
import { ComponentMetadata, DirectiveMetadata } from './metadata';
import { ComponentDef, DirectiveDef } from './type';


/**
 * directive reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface DirectiveReflect extends AnnotationReflect {
    /**
     * directive defined.
     * Runtime link information for Directives.
     *
     * This is an internal data structure used by the render to link
     * directives into templates.
     *
     * NOTE: Always use `defineDirective` function to create this object,
     * never create the object directly since the shape of this object
     * can change between versions.
     */
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
    /**
     * component defined.
     * Runtime link information for Components.
     *
     * This is an internal data structure used by the render to link
     * components into templates.
     *
     * NOTE: Always use `defineComponent` function to create this object,
     * never create the object directly since the shape of this object
     * can change between versions.
     */
    def?: ComponentDef<any>;
    /**
     * component selector.
     */
    selector?: string;
    /**
     * component annoation metadata.
     */
    annotation?: ComponentMetadata;
    /**
     * none serializes.
     */
    nonSerialize?: string[];

}
