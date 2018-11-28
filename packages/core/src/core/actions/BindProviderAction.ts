import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { getOwnTypeMetadata } from '../factories';
import { IContainer } from '../../IContainer';
import { Token } from '../../types';
import { ClassMetadata } from '../metadatas';
import { InjectReference, InjectClassProvidesToken } from '../../InjectReference';
import { ProviderMap } from '../providers';
import { ProviderParserToken } from '../IProviderParser';

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
        let classProvides = raiseContainer.resolveValue(clpds) || { provides: [], decors: [clpds.toString()] };
        if (classProvides.decors.length) {
            matchs = matchs.filter(d => classProvides.decors.indexOf(d.name) < 0);
        }

        if (matchs.length < 1) {
            data.execResult = classProvides.provides;
            return;
        }

        matchs.forEach(surm => {
            let metadata = getOwnTypeMetadata<ClassMetadata>(surm.name, type);
            classProvides.decors.push(surm.name);
            if (Array.isArray(metadata) && metadata.length > 0) {
                // bind all provider.
                metadata.forEach(c => {
                    if (!c) {
                        return;
                    }
                    if (c.provide) {
                        let provideKey = raiseContainer.getTokenKey(c.provide, c.alias);
                        classProvides.provides.push(provideKey);
                        raiseContainer.bindProvider(provideKey, c.type);
                    }
                    if (c.refs) {
                        let refKey = new InjectReference(c.refs.provide ? raiseContainer.getTokenKey(c.refs.provide, c.refs.alias) : c.type, c.refs.target).toString();
                        classProvides.provides.push(refKey);
                        raiseContainer.bindProvider(refKey, c.type);
                    }
                    // class private provider.
                    if (c.providers && c.providers.length) {
                        let refKey = new InjectReference(ProviderMap, c.type).toString();
                        let maps = raiseContainer.get(ProviderParserToken).parse(c.providers);
                        if (raiseContainer.has(refKey)) {
                            raiseContainer.bindProvider(refKey, raiseContainer.get<ProviderMap>(refKey).copy(maps));
                        } else {
                            raiseContainer.bindProvider(refKey, maps);
                        }
                    }
                });
            }
        });
        raiseContainer.bindProvider(clpds, classProvides);
        data.execResult = classProvides.provides;
    }
}

