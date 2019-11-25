import { DesignActionContext } from './DesignActionContext';
import { IocDesignAction } from './IocDesignAction';
import { ClassMetadata } from '../../metadatas';
import { CTX_CURR_DECOR } from '../../context-tokens';

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
        let raiseContainer = ctx.getRaiseContainer();
        let currDecoractor = ctx.get(CTX_CURR_DECOR);
        if (!tgReflect.decorator) {
            tgReflect.decorator = currDecoractor;
        }
        let metadatas = ctx.reflects.getMetadata<ClassMetadata>(currDecoractor, ctx.targetType);
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
                let provide = raiseContainer.getToken(anno.provide, anno.alias);
                tgReflect.provides.push(provide);
                raiseContainer.bindProvider(provide, anno.type);
            }
            if (anno.refs && anno.refs.target) {
                raiseContainer.bindRefProvider(anno.refs.target,
                    anno.refs.provide ? anno.refs.provide : anno.type,
                    anno.type,
                    anno.refs.provide ? anno.refs.alias : '',
                    tk => tgReflect.provides.push(tk));
            }
            // class private provider.
            if (anno.providers && anno.providers.length) {
                raiseContainer.bindProviders(
                    anno.type,
                    refKey => tgReflect.provides.push(refKey),
                    ...anno.providers);
            }
        });

        next();
    }
}

