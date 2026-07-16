import { createDecorator, ActionType, AnnotationType, getModuleType, noPointcut, token, Injector } from '@tsdi/ioc';
import { Attribute, AttributeMetadata } from './atteribute';
import { DirectiveDef, DirectiveFactory, DirectiveOptions, Factoriable, factoryKey } from '../refs/directive';
import { Computed, ComputedMetadata } from './computed';
// Custom element DI token for grouping custom tag-name directives
export const CUSTOM_ELEMENTS = token<DirectiveDef[]>('CUSTOM_ELEMENTS');


export const DIRECTIVES = token<DirectiveDef[]>('DIRECTIVES');


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
    actionType: ActionType.declaration | ActionType.directive,
    appendProps: (metadata) => {
        metadata.static = false;
        metadata.dirType = metadata.dirType || 0;
    },
    def: {
        class: (ctx) => {
            const typeRef = ctx.classRef;
            (typeRef.type as AnnotationType)[noPointcut] = true;
            typeRef.assignAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation<DirectiveDef>() as DirectiveDef & Factoriable;
            if (!def.selector) def.selector = typeRef.className;
            const metadata = ctx.define.metadata;
            if (metadata.providers) {
                def.providers.push(...metadata.providers);
            }
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
            // def.states = typeRef.getDefines(State).map(d => d as StateMetadata);
            def.attributes = typeRef.getDefines(Attribute).map(d => d.metadata as AttributeMetadata);
            def.computeds = typeRef.getDefines(Computed).map(d => d.metadata as ComputedMetadata);

            // Export to DIRECTIVES by default
            def.exportProviders.push({ provide: DIRECTIVES, useValue: def, multi: true });

            const rawSelector = def.selector || '';
            const parts = rawSelector.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const attrParts: string[] = [];
            const custParts: string[] = [];
            const normalizedParts: string[] = [];
            const htmlElements = ['button', 'input', 'div', 'span', 'a', 'form', 'ul', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'img', 'video', 'audio', 'select', 'option', 'textarea', 'label', 'link', 'meta', 'script', 'style'];
            for (const part of parts) {
                if (part.startsWith('*')) {
                    const bracketed = `[${part}]`;
                    attrParts.push(bracketed);
                    normalizedParts.push(bracketed);
                } else if (part.startsWith('[') && part.endsWith(']')) {
                    attrParts.push(part);
                    normalizedParts.push(part);
                } else if (part.includes('=')) {
                    const bracketed = `[${part}]`;
                    attrParts.push(bracketed);
                    normalizedParts.push(bracketed);
                } else if (part.includes('-')) {
                    custParts.push(part);
                    normalizedParts.push(part);
                } else if (htmlElements.includes(part)) {
                    custParts.push(part);
                    normalizedParts.push(part);
                } else {
                    const bracketed = `[${part}]`;
                    attrParts.push(bracketed);
                    normalizedParts.push(bracketed);
                }
            }
            def.selector = normalizedParts.join(',');
            const dirSelector = attrParts.join(',');
            const custSelector = custParts.join(',');
            if (dirSelector) {
                def.exportProviders.push({ provide: DIRECTIVES, useValue: { ...def, selector: dirSelector }, multi: true });
            }
            if (custSelector) {
                def.exportProviders.push({ provide: CUSTOM_ELEMENTS, useValue: { ...def, selector: custSelector }, multi: true });
            }

            if (!def[factoryKey]) {
                def[factoryKey] = (ctx: Injector, options: DirectiveOptions) => {
                    try {
                        return typeRef.createInvocation(ctx, options)
                    } catch (e) {
                        console.error('Failed to create directive:', def.selector, e);
                        return null;
                    }
                }
            }

        }
    },
    factory: (injector) => {
        return injector.get(DirectiveFactory)
    }
});
