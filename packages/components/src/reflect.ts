// import { refl, Type, TypeDef } from '@tsdi/ioc';
// import { ComponentMetadata, DirectiveMetadata } from './metadata/meta';
// import { ComponentDef, DirectiveDef } from './type';



// /**
//  * annotation type.
//  */
//  export type AnnotationTypes = 'component' | 'directive';

//  /**
//   * AnnotationDef
//   */
//  export interface AnnotationDef<T = any> extends TypeDef<T> {
//      /**
//       * class type.
//       */
//      readonly type: Type<T>;
//      /**
//       * the type of annoation.
//       */
//      annoType?: AnnotationTypes;
//      /**
//       * annoation decorator.
//       */
//      annoDecor?: string;
//  }

 
// /**
//  * directive reflect data.
//  *
//  * @export
//  * @interface IBindingTypeReflect
//  * @extends {ITypeReflect}
//  */
// export interface DirectiveDef<T = any> extends AnnotationDef<T> {
//     /**
//      * directive defined.
//      * Runtime link information for Directives.
//      *
//      * This is an internal data structure used by the render to link
//      * directives into templates.
//      *
//      * NOTE: Always use `defineDirective` function to create this object,
//      * never create the object directly since the shape of this object
//      * can change between versions.
//      */
//     def?: DirectiveDef<T>;
//     /**
//      * annoation metadata.
//      */
//     annotation?: DirectiveMetadata;
// }

// export function getDirectiveDef<T>(type: Type): DirectiveDef<T> {
//     return refl.get<DirectiveDef>(type) ?? null!;
// }

// /**
//  * component reflect data.
//  *
//  * @export
//  * @interface IBindingTypeReflect
//  * @extends {ITypeReflect}
//  */
// export interface ComponentReflect<T = any> extends AnnotationDef<T> {
//     /**
//      * component defined.
//      * Runtime link information for Components.
//      *
//      * This is an internal data structure used by the render to link
//      * components into templates.
//      *
//      * NOTE: Always use `defineComponent` function to create this object,
//      * never create the object directly since the shape of this object
//      * can change between versions.
//      */
//     def?: ComponentDef<T>;
//     /**
//      * component annoation metadata.
//      */
//     annotation?: ComponentMetadata;
//     /**
//      * none serializes.
//      */
//     nonSerialize?: string[];
// }

// export function getComponentDef<T>(type: Type): ComponentDef<T> {
//     return refl.get<ComponentReflect<T>>(type)?.def ?? null!;
// }
