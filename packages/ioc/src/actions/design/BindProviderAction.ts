import { DesignActionContext } from './DesignActionContext';
import { IocDesignAction } from './IocDesignAction';
import { CTX_CURR_DECOR } from '../../context-tokens';
import { InjectableMetadata } from '../../metadatas/InjectableMetadata';

/**
 * bind provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
export class BindProviderAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let tgReflect = ctx.targetReflect;
        let injector = ctx.injector;
        let currDecor = ctx.get(CTX_CURR_DECOR);
        if (!tgReflect.decorator) {
            tgReflect.decorator = currDecor;
        }
        let targetType = ctx.targetType;
        let metadatas = ctx.reflects.getMetadata<InjectableMetadata>(currDecor, targetType);
        metadatas.forEach(anno => {
            // bind all provider.
            if (!anno) {
                return;
            }
            if (!tgReflect.singleton) {
                if (anno.singleton) {
                    tgReflect.singleton = anno.singleton;
                }
                if (anno.expires) {
                    tgReflect.expires = anno.expires;
                }
            }
            if (anno.provide) {
                let provide = injector.getToken(anno.provide, anno.alias);
                tgReflect.provides.push(provide);
                injector.bindProvider(provide, anno.type);
            }
            if (anno.refs && anno.refs.target) {
                let tk = injector.bindRefProvider(anno.refs.target,
                    anno.refs.provide ? anno.refs.provide : anno.type,
                    anno.type,
                    anno.refs.provide ? anno.refs.alias : '');
                tgReflect.provides.push(tk);
            }
            // class private provider.
            if (anno.providers && anno.providers.length) {
                let refKey = injector.bindTagProvider(
                    anno.type,
                    ...anno.providers);
                tgReflect.provides.push(refKey);
            }
        });

        next();
    }
}

