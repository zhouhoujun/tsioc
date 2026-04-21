"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentsModule = void 0;
exports.bootstrapComponent = bootstrapComponent;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const component_1 = require("./refs/component");
const component_2 = require("./impl/component");
// import { ReactiveEffect } from './effect';
// import { DefaultReactiveEffect } from './impl/effect';
const for_dir_1 = require("./directives/for.dir");
const if_dir_1 = require("./directives/if.dir");
const directive_1 = require("./refs/directive");
const directive_2 = require("./impl/directive");
const class_1 = require("./directives/class");
const style_1 = require("./directives/style");
const switch_case_dir_1 = require("./directives/switch-case.dir");
const template_outlet_dir_1 = require("./directives/template-outlet.dir");
const show_dir_1 = require("./directives/show.dir");
const bind_dir_1 = require("./directives/bind.dir");
const resolvers_1 = require("./impl/resolvers");
/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
let ComponentsModule = class ComponentsModule {
};
exports.ComponentsModule = ComponentsModule;
exports.ComponentsModule = ComponentsModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            { provide: component_1.ComponentFactory, useClass: component_2.ComponentFactoryImpl, deps: [ioc_1.Runtime] },
            { provide: directive_1.DirectiveFactory, useClass: directive_2.DirectiveFactoryImpl, deps: [ioc_1.Runtime] },
            resolvers_1.componentResolvers
            // { provide: ReactiveEffect, useClass: DefaultReactiveEffect }
        ],
        exports: [
            for_dir_1.VForDirective,
            if_dir_1.VIfDirective,
            if_dir_1.VElseIfDirective,
            if_dir_1.VElseDirective,
            class_1.ClassDirective,
            style_1.StyleDirective,
            switch_case_dir_1.SwitchDirective,
            switch_case_dir_1.CaseDirective,
            template_outlet_dir_1.TemplateOutletDirective,
            show_dir_1.VShowDirective,
            bind_dir_1.VBindDirective,
            bind_dir_1.VOnDirective
        ]
    })
], ComponentsModule);
async function bootstrapComponent(rootComponent, options) {
    const deps = options?.deps || [];
    const rderType = options?.renderer || 'xml';
    if (rderType === 'html') {
        const { HtmlTemplateModule } = await Promise.resolve().then(() => require('@tsdi/components/html'));
        deps.unshift(HtmlTemplateModule);
    }
    else if (rderType === 'xml') {
        const { XmlTemplateModule } = await Promise.resolve().then(() => require('@tsdi/components/xml'));
        deps.unshift(XmlTemplateModule);
    }
    else if (rderType === 'json') {
        const { JsonTemplateModule } = await Promise.resolve().then(() => require('@tsdi/components/json'));
        deps.unshift(JsonTemplateModule);
    }
    if (!deps.includes(ComponentsModule)) {
        deps.unshift(ComponentsModule);
    }
    return await (0, core_1.bootstrapApplication)(rootComponent, {
        ...options,
        deps
    });
}
//# sourceMappingURL=components.js.map