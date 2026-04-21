"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Component = exports.COMPONENTS = void 0;
const ioc_1 = require("@tsdi/ioc");
const component_1 = require("../refs/component");
const atteribute_1 = require("./atteribute");
const directive_1 = require("./directive");
const directive_2 = require("../refs/directive");
const computed_1 = require("./computed");
exports.COMPONENTS = (0, ioc_1.token)('COMPONENTS');
exports.Component = (0, ioc_1.createDecorator)('Component', {
    actionType: ioc_1.ActionType.declaration | ioc_1.ActionType.component,
    appendProps: (metadata) => {
        metadata.static = false;
    },
    def: {
        class: (ctx) => {
            const typeRef = ctx.classRef;
            typeRef.type[ioc_1.noPointcut] = true;
            typeRef.assignAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation();
            def.dirType = directive_2.DirectiveType.Component;
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
            if (dir$.test(def.selector)) {
                const selectors = def.selector.split(',');
                const dirSelector = selectors.filter(r => dir$.test(r)).join(',');
                const compSelector = selectors.filter(r => !dir$.test(r)).join(',');
                if (dirSelector) {
                    def.exportProviders.push({ provide: directive_1.DIRECTIVES, useValue: { ...def, selector: dirSelector }, multi: true });
                }
                if (compSelector) {
                    def.exportProviders.push({ provide: exports.COMPONENTS, useValue: { ...def, selector: compSelector }, multi: true });
                }
            }
            else {
                def.exportProviders.push({ provide: exports.COMPONENTS, useValue: def, multi: true });
            }
            if (!def[directive_2.factoryKey]) {
                def[directive_2.factoryKey] = (ctx, options) => {
                    const factory = ctx.get(component_1.ComponentFactory);
                    return factory.create(typeRef.type, options);
                };
            }
        }
    },
    factory: (injector) => {
        return injector.get(component_1.ComponentFactory);
    }
});
const dir$ = /\[\w+\]/;
//# sourceMappingURL=component.js.map