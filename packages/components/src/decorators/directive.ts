import { createDecorator, ActionType, AnnotationType, getModuleType, noPointcut, tokenId, InvocationContext } from '@tsdi/ioc';
import { Attribute, AttributeMetadata } from './atteribute';
import { DirectiveDef, DirectiveOptions, Factoriable, factoryKey } from '../refs/directive';


export const DIRECTIVES = tokenId<DirectiveDef[]>('DIRECTIVES');


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
export const Directive: Directive = createDecorator<Partial<DirectiveDef>>('Directive', {
    actionType: ActionType.decoration,
    def: {
        class: (ctx) => {
            const typeRef = ctx.classRef;
            (typeRef.type as AnnotationType)[noPointcut] = true;
            typeRef.assignAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation<DirectiveDef>() as DirectiveDef;
            if (!def.selector) def.selector = typeRef.className;
            def.selector = def.selector.split(',').map(r => {
                r = r.trim();
                if (!r.startsWith('[')) {
                    r = '[' + r;
                }
                if (!r.endsWith(']')) {
                    r = r + ']';
                }
                return r;
            }).join(',');
            const metadata = ctx.define.metadata;
            if (metadata.providers) {
                def.providers?.push(...metadata.providers);
            }
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
            // def.states = typeRef.getDefines(State).map(d => d as StateMetadata);
            def.attributes = typeRef.getDefines(Attribute).map(d => d as AttributeMetadata);
        }
    },
    design: {
        afterAnnoation: (ctx) => {
            const typeRef = ctx.classRef;
            const injector = ctx.injector;
            const def = typeRef.getAnnotation<DirectiveDef>() as DirectiveDef & Factoriable;
            if (!def[factoryKey]) {
                def[factoryKey] = (ctx: InvocationContext, options: DirectiveOptions) => {
                    return typeRef.createInvocation(injector, { ...options, parent: ctx })
                }
            }
            injector.inject({ provide: DIRECTIVES, useValue: def, multi: true });
        }
    }
});
