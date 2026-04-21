import { PropParamDecorator, AbstractType, ParameterMetadata } from '@tsdi/ioc';
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
export declare const Repository: RepositoryDecorator;
/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 * alias of @Repository
 *
 * @alias
 */
export declare const InjectRepository: RepositoryDecorator;
