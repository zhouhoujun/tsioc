import { IocAction, IocActionContext } from './Action';
import { IIocContainer } from '../IIocContainer';
import { DecoratorRegisterer } from '../services';
import { lang } from '../utils';

/**
 * bind provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
export class BindProviderAction extends IocAction {

    constructor() {
        super()
    }

    execute(container: IIocContainer, ctx: IocActionContext) {
        super.execute(container, ctx);
        let type = ctx.targetType;
        let raiseContainer = ctx.raiseContainer;
        
        let matchs = container.resolve(DecoratorRegisterer).getClassDecorators(type, lang.getClass(this));
    
        // has binding.
        if (!ctx.targetReflect.decors) {
            return;
        }

        matchs = matchs.filter(d => ctx.targetReflect.decors.indexOf(d) < 0);

        if (matchs.length < 1) {
            ctx.execResult = classPds.provides;
            return;
        }

        matchs.forEach(surm => {
            let metadata = getOwnTypeMetadata<ClassMetadata>(surm.name, type);
            classPds.decors.push(surm.name);
            if (Array.isArray(metadata) && metadata.length > 0) {
                // bind all provider.
                metadata.forEach(c => {
                    if (!c) {
                        return;
                    }
                    if (c.provide) {
                        let provide = raiseContainer.getToken(c.provide, c.alias);
                        classPds.provides.push(provide);
                        raiseContainer.bindProvider(provide, c.type);
                    }
                    if (c.refs && c.refs.target) {
                        raiseContainer.bindRefProvider(c.refs.target,
                            c.refs.provide ? c.refs.provide : c.type,
                            c.type,
                            c.refs.provide ? c.refs.alias : '',
                            tk => classPds.provides.push(tk));
                    }
                    // class private provider.
                    if (c.providers && c.providers.length) {
                        raiseContainer.bindProviders(
                            c.type,
                            refKey => classPds.provides.push(refKey),
                            ...c.providers);
                    }
                });
            }
        });
        raiseContainer.bindProvider(clpds, classPds);
        ctx.execResult = classPds.provides;
    }
}

