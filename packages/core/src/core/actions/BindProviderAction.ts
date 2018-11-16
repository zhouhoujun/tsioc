import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { getOwnTypeMetadata, hasOwnClassMetadata } from '../factories';
import { IContainer } from '../../IContainer';
import { Token } from '../../types';
import { ClassMetadata } from '../metadatas';
import { InjectReference } from '../../InjectReference';

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
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getClassDecorators(surm => surm.actions.includes(CoreActions.bindProvider) && hasOwnClassMetadata(surm.name, type));

        let provides = [];
        let raiseContainer = data.raiseContainer || container;
        matchs.forEach(surm => {
            let metadata = getOwnTypeMetadata<ClassMetadata>(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                // bind all provider.
                metadata.forEach(c => {
                    if (!c) {
                        return;
                    }
                    if (c.provide) {
                        let provideKey = raiseContainer.getTokenKey(c.provide, c.alias);
                        provides.push(provideKey);
                        raiseContainer.bindProvider(provideKey, c.type);
                    }
                    if (c.refTarget) {
                        let refKey = new InjectReference(c.type, c.refTarget).toString();
                        provides.push(refKey);
                        raiseContainer.bindProvider(refKey, c.type)
                    }
                });
            }
        });

        data.execResult = provides;
    }
}

