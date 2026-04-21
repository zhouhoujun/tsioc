"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Directive = exports.DIRECTIVES = exports.CUSTOM_ELEMENTS = void 0;
const ioc_1 = require("@tsdi/ioc");
const atteribute_1 = require("./atteribute");
const directive_1 = require("../refs/directive");
const computed_1 = require("./computed");
// Custom element DI token for grouping custom tag-name directives
exports.CUSTOM_ELEMENTS = (0, ioc_1.token)('CUSTOM_ELEMENTS');
exports.DIRECTIVES = (0, ioc_1.token)('DIRECTIVES');
/**
 * Directive decorator, define for class.
 *
 * @export
 * @param {DirectiveMetadata} metadata Directive metadata.
 */
exports.Directive = (0, ioc_1.createDecorator)('Directive', {
    actionType: ioc_1.ActionType.declaration | ioc_1.ActionType.directive,
    appendProps: (metadata) => {
        metadata.static = false;
        metadata.dirType = metadata.dirType || 0;
    },
    def: {
        class: (ctx) => {
            const typeRef = ctx.classRef;
            typeRef.type[ioc_1.noPointcut] = true;
            typeRef.assignAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation();
            if (!def.selector)
                def.selector = typeRef.className;
            const metadata = ctx.define.metadata;
            if (metadata.providers) {
                def.providers.push(...metadata.providers);
            }
            if (metadata.imports)
                def.imports = (0, ioc_1.getModuleType)(metadata.imports);
            // def.states = typeRef.getDefines(State).map(d => d as StateMetadata);
            def.attributes = typeRef.getDefines(atteribute_1.Attribute).map(d => d.metadata);
            def.computeds = typeRef.getDefines(computed_1.Computed).map(d => d.metadata);
            // Export to DIRECTIVES by default
            def.exportProviders.push({ provide: exports.DIRECTIVES, useValue: def, multi: true });
            const rawSelector = def.selector || '';
            const parts = rawSelector.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const attrParts = [];
            const custParts = [];
            const normalizedParts = [];
            const htmlElements = ['button', 'input', 'div', 'span', 'a', 'form', 'ul', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'img', 'video', 'audio', 'select', 'option', 'textarea', 'label', 'link', 'meta', 'script', 'style'];
            for (const part of parts) {
                if (part.startsWith('*')) {
                    const bracketed = `[${part}]`;
                    attrParts.push(bracketed);
                    normalizedParts.push(bracketed);
                }
                else if (part.startsWith('[') && part.endsWith(']')) {
                    attrParts.push(part);
                    normalizedParts.push(part);
                }
                else if (part.includes('=')) {
                    const bracketed = `[${part}]`;
                    attrParts.push(bracketed);
                    normalizedParts.push(bracketed);
                }
                else if (part.includes('-')) {
                    custParts.push(part);
                    normalizedParts.push(part);
                }
                else if (htmlElements.includes(part.toLowerCase())) {
                    custParts.push(part);
                    normalizedParts.push(part);
                }
                else {
                    const bracketed = `[${part}]`;
                    attrParts.push(bracketed);
                    normalizedParts.push(bracketed);
                }
            }
            def.selector = normalizedParts.join(',');
            const dirSelector = attrParts.join(',');
            const custSelector = custParts.join(',');
            if (dirSelector) {
                def.exportProviders.push({ provide: exports.DIRECTIVES, useValue: { ...def, selector: dirSelector }, multi: true });
            }
            if (custSelector) {
                def.exportProviders.push({ provide: exports.CUSTOM_ELEMENTS, useValue: { ...def, selector: custSelector }, multi: true });
            }
            if (!def[directive_1.factoryKey]) {
                def[directive_1.factoryKey] = (ctx, options) => {
                    try {
                        return typeRef.createInvocation(ctx, options);
                    }
                    catch (e) {
                        console.error('Failed to create directive:', def.selector, e);
                        return null;
                    }
                };
            }
        }
    },
    factory: (injector) => {
        return injector.get(directive_1.DirectiveFactory);
    }
});
//# sourceMappingURL=directive.js.map