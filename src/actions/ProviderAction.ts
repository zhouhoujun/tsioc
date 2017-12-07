import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType } from '../decorators';
import { IContainer } from '../IContainer';
import { Token, SymbolType } from '../types';
import { TypeMetadata, ProviderMetadata } from '../metadatas';

export interface ProviderActionData extends ActionData<ProviderMetadata> {
}

export class ProviderAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.bindProvider.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: ProviderActionData) {
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

