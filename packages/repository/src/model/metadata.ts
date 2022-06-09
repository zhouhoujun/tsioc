import { ActionTypes, createDecorator, ParamPropMetadata, PropParamDecorator, Type } from '@tsdi/ioc';
import { RepositoryArgumentResolver } from './repository';

/**
 * repository metadata.
 */
export interface RepositoryMetadata extends ParamPropMetadata {
    model: Type;
    connection?: string;
}

/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 */
 export interface RepositoryDecorator {
    /**
     * Repository Decorator, to autowired repository for paramerter or filed.
     * @param modle the model type.
     * @param connection the mutil connection name.
     */
    (model?: Type, connection?: string): PropParamDecorator;
}

/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 * @Repository
 */
export const Repository: RepositoryDecorator = createDecorator<RepositoryMetadata>('Repository', {
    actionType: [ActionTypes.paramInject, ActionTypes.propInject],
    props: (model: Type, connection?: string) => ({ model, connection, resolver: RepositoryArgumentResolver })
});

/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 * alias of @Repository
 * 
 * @alias 
 */
 export const DBRepository: RepositoryDecorator = Repository;
