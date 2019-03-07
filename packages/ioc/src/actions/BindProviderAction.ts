import { lang } from '../utils';
import { ClassMetadata } from '../metadatas';
import { IocRegisterAction, IocActionContext } from './Action';
import { DecoratorRegisterer } from '../services';
import { getOwnTypeMetadata } from '../factories';

/**
 * bind provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
export class BindProviderAction extends IocRegisterAction {

    execute(ctx: IocActionContext, next: () => void) {
        let type = ctx.targetType;
        let tgReflect = ctx.targetReflect;
        let raiseContainer = ctx.raiseContainer;

        let decors = this.container.resolve(DecoratorRegisterer).getClassDecorators(type, lang.getClass(this));
        decors = decors.filter(d => tgReflect.decors.indexOf(d) < 0);

        if (decors.length < 1) {
            return next();
        }

        decors.forEach(d => {
            let metadata = getOwnTypeMetadata<ClassMetadata>(d, type);
           tgReflect.decors.push(d);
            if (Array.isArray(metadata) && metadata.length > 0) {
                // bind all provider.
                metadata.forEach(c => {
                    if (!c) {
                        return;
                    }
                    if (c.provide) {
                        let provide = raiseContainer.getToken(c.provide, c.alias);
                        tgReflect.provides.push(provide);
                        raiseContainer.bindProvider(provide, c.type);
                    }
                    if (c.refs && c.refs.target) {
                        raiseContainer.bindRefProvider(c.refs.target,
                            c.refs.provide ? c.refs.provide : c.type,
                            c.type,
                            c.refs.provide ? c.refs.alias : '',
                            tk => tgReflect.provides.push(tk));
                    }
                    // class private provider.
                    if (c.providers && c.providers.length) {
                        raiseContainer.bindProviders(
                            c.type,
                            refKey => tgReflect.provides.push(refKey),
                            ...c.providers);
                    }
                });
            }
        });
        next();
    }
}

