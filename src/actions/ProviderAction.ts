import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType } from '../decorators';
import { IContainer } from '../IContainer';
import { Token, SymbolType } from '../types';
import { ProviderMetadata } from '../metadatas';


export interface ProviderActionData extends ActionData<ProviderMetadata> {
    container?: IContainer;
    bindProvier?(token: Token<any>);
    provider?: SymbolType<any>;
}

export class ProviderAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.provider.toString(), decorName, decorType)
    }

    protected working(data: ProviderActionData) {
        let metadata = data.metadata;
        if (data.container && Array.isArray(metadata) && metadata.length > 0) {
            let jcfg = metadata.find(c => c && !!(c.provide || c.alias));
            if (jcfg) {
                let container = data.container;
                let provideKey = container.getTokenKey(jcfg.provide, jcfg.alias);
                container.bindProvider(provideKey, data.provider);
            }
        }
    }
}

