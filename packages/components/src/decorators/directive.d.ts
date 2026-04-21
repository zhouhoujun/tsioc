import { DirectiveDef } from '../refs/directive';
export declare const CUSTOM_ELEMENTS: import("@tsdi/ioc").InjectToken<DirectiveDef<any>[]>;
export declare const DIRECTIVES: import("@tsdi/ioc").InjectToken<DirectiveDef<any>[]>;
/**
 * Directive decorator interface
 *
 * @export
 * @interface Directive
 */
export interface Directive {
    /**
     * define directive decorator with metadata.
     * @param {Partial<DirectiveDef>} metadata Directive metadata.
     */
    (metadata: Partial<DirectiveDef>): ClassDecorator;
}
/**
 * Directive decorator, define for class.
 *
 * @export
 * @param {DirectiveMetadata} metadata Directive metadata.
 */
export declare const Directive: Directive;
