import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { getOwnTypeMetadata } from '../factories';
import { IContainer } from '../../IContainer';
import { Token } from '../../types';
import { ClassMetadata } from '../metadatas';
import { InjectClassProvidesToken } from '../../InjectReference';

/**
 * bind provider action data.
 *
 * @export
 * @interface BindProviderActionData
 * @extends {ActionData<Token<any>[]>}
 */
export interface BindProviderActionData extends ActionData<Token<any>[]> {

}

/**
 * bind provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
export class BindProviderAction extends ActionComposite {

    constructor() {
        super(CoreActions.bindProvider)
    }

    protected working(container: IContainer, data: BindProviderActionData) {
        let type = data.targetType;
        let raiseContainer = data.raiseContainer;
        let lifeScope = container.getLifeScope();
        let matchs = lifeScope.getClassDecorators(type, surm => surm.actions.includes(CoreActions.bindProvider));
        let clpds = new InjectClassProvidesToken(type);
        // has binding.
        let classPds = raiseContainer.resolveValue(clpds) || { provides: [clpds.toString()], decors: [] };
        if (classPds.decors.length) {
            matchs = matchs.filter(d => classPds.decors.indexOf(d.name) < 0);
        }

        if (matchs.length < 1) {
            data.execResult = classPds.provides;
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
                        raiseContainer.bindTarget(
                            c.type,
                            c.providers,
                            refKey => classPds.provides.push(refKey));
                    }
                });
            }
        });
        raiseContainer.bindProvider(clpds, classPds);
        data.execResult = classPds.provides;
    }
}

