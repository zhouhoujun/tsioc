import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType, getOwnTypeMetadata, hasOwnClassMetadata } from '../factories/index';
import { IContainer } from '../../IContainer';
import { Token, SymbolType } from '../../types';
import { TypeMetadata, ProviderMetadata, ClassMetadata } from '../metadatas/index';


export interface BindProviderActionData extends ActionData<Token<any>[]> {
}

export class BindProviderAction extends ActionComposite {

    constructor() {
        super(CoreActions.bindProvider)
    }

    protected working(container: IContainer, data: BindProviderActionData) {
        let target = data.target
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getClassDecorators(surm => surm.actions.includes(CoreActions.bindProvider) &&  hasOwnClassMetadata(surm.name, type));

        let provides = [];
        matchs.forEach(surm => {
            let metadata = getOwnTypeMetadata<ClassMetadata>(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                let jcfg = metadata.find(c => c && !!c.provide);
                if (jcfg) {
                    let provideKey = container.getTokenKey(jcfg.provide, jcfg.alias);
                    provides.push(provideKey);
                    container.bindProvider(provideKey, jcfg.type);
                }
            }
        });

        data.execResult = provides;
    }
}

