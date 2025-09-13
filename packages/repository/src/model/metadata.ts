import { ActionType, createDecorator, PropParamDecorator, AbstractType, ParameterMetadata } from '@tsdi/ioc';
import { RepositoryArgumentResolver } from './repository';

/**
 * repository metadata.
 */
export interface RepositoryMetadata extends ParameterMetadata {
    /**
     * model type.
     */
    model: AbstractType;
    /**
     * connection
     */
    connection?: string;
}

/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 */
export interface RepositoryDecorator {
    /**
     * Repository Decorator, to autowired repository for paramerter or filed.
     * @param modle the model type.
     * @param connection the multi connection name.
     */
    (model?: AbstractType, connection?: string): PropParamDecorator;
}

/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 * @Repository
 */
export const Repository: RepositoryDecorator = createDecorator<RepositoryMetadata>('Repository', {
    actionType: ActionType.inject,
    props: (model: AbstractType, connection?: string) => ({ model, connection, resolver: [RepositoryArgumentResolver] })
});

/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 * alias of @Repository
 * 
 * @alias 
 */
export const InjectRepository: RepositoryDecorator = Repository;
