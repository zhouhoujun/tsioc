import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType } from '../factories';
import { IContainer } from '../../IContainer';
import { Token, SymbolType } from '../../types';
import { TypeMetadata, ProviderMetadata } from '../metadatas';

export interface BindProviderActionData extends ActionData<ProviderMetadata> {
}

export class BindProviderAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(CoreActions.bindProvider.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: BindProviderActionData) {
        let metadata = data.metadata;
        if (Array.isArray(metadata) && metadata.length > 0) {
            let jcfg = metadata.find(c => c &&  !!c.provide);
            if (jcfg) {
                let provideKey = container.getTokenKey(jcfg.provide, jcfg.alias);
                container.bindProvider(provideKey, jcfg.type);
            }
        }
    }
}

