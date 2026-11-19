import { applyPrecompiledType, getClassRef, getModuleType, AnnotationType, Injector, noPointcut } from '@tsdi/ioc';
import { ComponentDef, ComponentFactory, ComponentOptions } from '../refs/component';
import { DirectiveDef, DirectiveFactory, DirectiveOptions, DirectiveType, Factoriable, factoryKey } from '../refs/directive';
import { COMPONENTS } from './component';
import { CUSTOM_ELEMENTS, DIRECTIVES, normalizeDirectiveSelector } from './directive';

const dir$ = /\[\w+\]/;

/**
 * Apply a precompiled `@Component` definition.
 *
 * Runs at module load from AOT output. It avoids the decorator factory +
 * dispatch pipeline while producing the same `ComponentDef` shape the runtime
 * component factory reads.
 */
export function applyPrecompiledComponent(
    target: Function,
    metadata: Record<string, any>,
    records?: Array<[Function, any]>
): void {
    applyPrecompiledType(target, metadata, records, true);
    const type = target as AnnotationType;
    type[noPointcut] = true;
    const def = type.ƿAnn!() as ComponentDef & Factoriable;
    def.dirType = DirectiveType.Component;
    if (!def.selector) {
        def.selector = target.name;
    }
    if (def.imports) {
        def.imports = getModuleType(def.imports as any);
    }
    def.providers = def.providers || [];
    def.exportProviders = def.exportProviders || [];
    def.attributes = def.attributes || [];
    def.computeds = def.computeds || [];
    def.viewChilds = [];
    def.viewChildrens = [];
    def.contentChilds = [];
    def.contentChildrens = [];

    if (dir$.test(def.selector)) {
        const selectors = def.selector.split(',');
        const dirSelector = selectors.filter(r => dir$.test(r)).join(',');
        const compSelector = selectors.filter(r => !dir$.test(r)).join(',');
        if (dirSelector) {
            def.exportProviders.push({ provide: DIRECTIVES, useValue: { ...def, selector: dirSelector }, multi: true } as any);
        }
        if (compSelector) {
            def.exportProviders.push({ provide: COMPONENTS, useValue: { ...def, selector: compSelector }, multi: true } as any);
        }
    } else {
        def.exportProviders.push({ provide: COMPONENTS, useValue: def, multi: true } as any);
    }

    if (!def[factoryKey]) {
        def[factoryKey] = (ctx: Injector, options: ComponentOptions) => {
            const factory = ctx.get(ComponentFactory);
            return factory.create(target as any, { ...options, injector: ctx });
        };
    }

    // `@Component` is a declaration decorator: the runtime decorator dispatch
    // registers the invocation factory used when the component itself is the
    // bootstrap target (`Application.run(MyComponent)`). The materialized AOT
    // path skips that dispatch, so register the same factory here. Without it
    // the app falls back to the default invocation and fails with
    // "<Component> is invaild runnable, can not invocation without method param."
    getClassRef(target).setInvocationFactory((ctx: Injector) => ctx.get(ComponentFactory));
}

/**
 * Apply a precompiled `@Directive` definition. Mirrors the decorator's
 * selector normalization and DIRECTIVES/CUSTOM_ELEMENTS exports.
 */
export function applyPrecompiledDirective(
    target: Function,
    metadata: Record<string, any>,
    records?: Array<[Function, any]>
): void {
    applyPrecompiledType(target, metadata, records, true);
    const type = target as AnnotationType;
    type[noPointcut] = true;
    const def = type.ƿAnn!() as DirectiveDef & Factoriable;
    def.static = false;
    if (!def.dirType) {
        def.dirType = 0;
    }
    if (!def.selector) {
        def.selector = target.name;
    }
    if (def.imports) {
        def.imports = getModuleType(def.imports as any);
    }
    def.providers = def.providers || [];
    def.exportProviders = def.exportProviders || [];
    def.attributes = def.attributes || [];
    def.computeds = def.computeds || [];

    def.exportProviders.push({ provide: DIRECTIVES, useValue: def, multi: true } as any);

    const normalized = normalizeDirectiveSelector(def.selector || '');
    def.selector = normalized.selector;
    if (normalized.dirSelector && normalized.dirSelector !== def.selector) {
        def.exportProviders.push({
            provide: DIRECTIVES,
            useValue: { ...def, selector: normalized.dirSelector },
            multi: true
        } as any);
    }
    if (normalized.custSelector) {
        def.exportProviders.push({
            provide: CUSTOM_ELEMENTS,
            useValue: { ...def, selector: normalized.custSelector },
            multi: true
        } as any);
    }

    if (!def[factoryKey]) {
        def[factoryKey] = (ctx: Injector, options: DirectiveOptions) => {
            try {
                return getClassRef(target).createInvocation(ctx, options);
            } catch (e) {
                console.error('Failed to create directive:', def.selector, e);
                return null;
            }
        };
    }

    // Mirror the runtime `@Directive` declaration dispatch (see the component
    // path above): the AOT materialized path must still register the directive
    // invocation factory for bootstrap targets.
    getClassRef(target).setInvocationFactory((ctx: Injector) => ctx.get(DirectiveFactory));
}
