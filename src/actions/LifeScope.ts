import { IContainer } from '../IContainer';
import { ActionData } from './ActionData';
import { Metadate, ProviderMetadata } from '../metadatas';

/**
 * life scope of decorator.
 *
 * @export
 * @interface LifeScope
 */
export interface LifeScope {

    bindParameterType(container: IContainer, data: ActionData<Metadate>);

    bindPropertyType(container: IContainer, data: ActionData<Metadate>);

    bindInstance(container: IContainer, data: ActionData<Metadate>);

    bindMethod(container: IContainer, data: ActionData<Metadate>);

    bindInstance(container: IContainer, data: ActionData<Metadate>);

    bindProvider(container: IContainer, data: ActionData<Metadate>);

    bindParameterProviders(container: IContainer, data: ActionData<Metadate>);

}
