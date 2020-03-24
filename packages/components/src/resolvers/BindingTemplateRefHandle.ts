import { lang, chain } from '@tsdi/ioc';
import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { CTX_COMPONENT_REF, REFCHILD_SELECTOR } from '../ComponentRef';
import { RefChild } from '../decorators/RefChild';
import { IComponentContext } from '../ComponentContext';

const RefChildStr = RefChild.toString();
/**
 * binding temlpate handle.
 *
 * @export
 * @class BindingTemplateHandle
 * @extends {ResolveHandle}
 */
export const BindingTemplateRefHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let refl = ctx.getTargetReflect();
    let cmpdr = ctx.componentProvider;
    let refkey = ctx.getTemplate()?.[cmpdr.getRefSelectKey()];
    if (refkey) {
        ctx.setValue(REFCHILD_SELECTOR, refkey);
    }
    let propRefChildBindings = refl?.getBindings(RefChildStr);
    if (propRefChildBindings) {
        // todo ref child view
        let cref = ctx.getValue(CTX_COMPONENT_REF);
        propRefChildBindings.forEach(b => {
            let result = cmpdr.select(cref, b.bindingName || b.name);
            if (!result) {
                return;
            }
            if (cmpdr.isComponentRef(result)) {
                if (cmpdr.isComponentRefType(b.type)) {
                    ctx.value[b.name] = result;
                } else {
                    ctx.value[b.name] = result.instance;
                }
            } else if (cmpdr.isElementRef(result)) {
                if (cmpdr.isElementRefType(b.type)) {
                    ctx.value[b.name] = result;
                } else {
                    ctx.value[b.name] = result.nativeElement;
                }
            } else {
                if (cmpdr.isElementRefType(b.type)) {
                    ctx.value[b.name] = cmpdr.getElementRef(result, ctx.injector) ?? cmpdr.createElementRef(ctx, result);
                } else if (cmpdr.isComponentRefType(b.type)) {
                    ctx.value[b.name] = cmpdr.getComponentRef(result, ctx.injector) ?? cmpdr.createComponentRef(lang.getClass(result), result, ctx);
                } else {
                    ctx.value[b.name] = result;
                }
            }
        });

    }

    let actInjector = ctx.reflects.getActionInjector();
    let startupRegr = actInjector.getInstance(StartupDecoratorRegisterer);

    let bindRegs = startupRegr.getRegisterer(StartupScopes.Binding);
    if (bindRegs.has(ctx.decorator)) {
        await chain(bindRegs.getFuncs(this.actInjector, ctx.decorator), ctx);
    }

    if (next) {
        await next();
    }
};
