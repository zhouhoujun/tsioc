import { ClassType, ctorName, Inject, lang, refl, Type } from '@tsdi/ioc';
import { InjectRepository, RepositoryMetadata, TransactionalMetadata, TransactionExecption, TransactionManager, TransactionStatus } from '@tsdi/repository';
import { Joinpoint } from '@tsdi/aop';
import { Log, Logger } from '@tsdi/logs';
import { EntityManager, getManager, MongoRepository, Repository, TreeRepository } from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';

export class TypeormTransactionStatus extends TransactionStatus {

    private _jointPoint: Joinpoint | undefined;
    constructor(private definition: TransactionalMetadata, private logger: Logger) {
        super();
    }

    getPoint(): Joinpoint | undefined {
        return this._jointPoint
    }

    hasPoint(): boolean {
        return !!this._jointPoint
    }

    async flush(joinPoint: Joinpoint): Promise<void> {
        this._jointPoint = joinPoint;
        const isolation = this.definition.isolation?.replace('_', ' ');
        const connection = this.definition.connection;
        const propagation = this.definition.propagation;
        const targetRef = refl.get(joinPoint.targetType);

        const runInTransaction = (entityManager: EntityManager) => {

            this.logger.debug('begin transaction of', joinPoint?.fullName, 'active:', entityManager.queryRunner?.isTransactionActive, 'isolation:', isolation, 'propagation:', propagation);
            joinPoint.setValue(EntityManager, entityManager);

            joinPoint.params?.length && targetRef.paramDecors.filter(dec => {
                if (dec.propertyKey === joinPoint.methodName) {
                    if (dec.decor === InjectRepository.toString()) {
                        joinPoint.args?.splice(dec.parameterIndex || 0, 1, this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.type, entityManager))
                    } else if ((dec.metadata.provider as Type || dec.metadata.type) === EntityManager) {
                        joinPoint.args?.splice(dec.parameterIndex || 0, 1, entityManager)
                    } else if (isRepository(dec.metadata.provider as Type || dec.metadata.type)) {
                        joinPoint.args?.splice(dec.parameterIndex || 0, 1, this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.provider as Type || dec.metadata.type, entityManager))
                    }
                }
            });

            const context = {} as any;
            targetRef.propDecors.forEach(dec => {
                if (dec.decor === InjectRepository.toString()) {
                    context[dec.propertyKey] = this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.type, entityManager)
                } else if ((dec.metadata.provider as Type || dec.metadata.type) === EntityManager) {
                    context[dec.propertyKey] = entityManager
                } else if (isRepository(dec.metadata.provider as Type || dec.metadata.type)) {
                    context[dec.propertyKey] = this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.provider as Type || dec.metadata.type, entityManager)
                }
            });

            ctorName !== joinPoint.methodName && targetRef.getParameters(ctorName)?.forEach(metadata => {
                const paramName = metadata.name;
                if (paramName) {
                    const filed = joinPoint.target[paramName];
                    if (filed instanceof EntityManager) {
                        context[paramName] = entityManager
                    } else if (filed instanceof Repository) {
                        context[paramName] = this.getRepository((metadata as RepositoryMetadata).model, metadata.provider as Type || metadata.type, entityManager)
                    }
                }
            });

            let target = joinPoint.target;
            if (Object.keys(context).length) {
                target = { ...target, ...context }
            }

            return joinPoint.originMethod?.apply(target, joinPoint.args)
        };

        const withNewTransaction = () => {
            if (isolation) {
                return getManager(connection).transaction(isolation as any, runInTransaction)
            } else {
                return getManager(connection).transaction(runInTransaction)
            }
        };

        const withOrigin = () => joinPoint.originMethod?.apply(joinPoint.target, joinPoint.args);

        joinPoint.originProxy = () => {
            const currTransaction = joinPoint.get(EntityManager);
            switch (propagation) {
                case 'MANDATORY':
                    if (!currTransaction) {
                        throw new TransactionExecption(`No existing transaction found for transaction marked with propagation 'MANDATORY'`)
                    }
                    return runInTransaction(currTransaction)

                case 'NESTED':
                    return withNewTransaction()

                case 'NEVER':
                    if (currTransaction) {
                        throw new TransactionExecption("Found an existing transaction, transaction marked with propagation 'NEVER'")
                    }
                    return withOrigin()

                case 'NOT_SUPPORTED':
                    // if (currTransaction) {
                    //     joinPoint.setValue(EntityManager, null);
                    //     return withOrigin((value) => {
                    //         joinPoint.setValue(EntityManager, currTransaction);
                    //         return value;
                    //     });
                    // }
                    return withOrigin()

                case 'REQUIRED':
                    if (currTransaction) {
                        return runInTransaction(currTransaction)
                    }
                    return withNewTransaction()

                case 'REQUIRES_NEW':
                    return withNewTransaction()

                case 'SUPPORTS':
                    if (currTransaction) {
                        return runInTransaction(currTransaction)
                    }
                    return withOrigin()
            }
        }
    }

    protected getRepository<T>(model: Type<T> | undefined, rep: ClassType | undefined, entityManager: EntityManager) {
        if (!model) {
            return entityManager.getCustomRepository(rep!)
        }
        switch (rep) {
            case Repository:
                return entityManager.getRepository(model)
            case MongoRepository:
                return entityManager.getMongoRepository(model)
            case TreeRepository:
                return entityManager.getTreeRepository(model)
            default:
                return entityManager.getCustomRepository(rep!)
        }
    }

}

export class TypeormTransactionManager extends TransactionManager {

    constructor(
        @Inject(DEFAULT_CONNECTION, { nullable: true }) private conn: string,
        @Log() private logger: Logger) {
        super()
    }

    async getTransaction(definition: TransactionalMetadata): Promise<TypeormTransactionStatus> {
        return new TypeormTransactionStatus({ connection: this.conn, ...definition }, this.logger)
    }

    async commit(status: TypeormTransactionStatus): Promise<void> {
        const joinPoint = status.getPoint();
        joinPoint?.setValue(EntityManager, null);
        this.logger.debug('commit transaction of', joinPoint?.fullName, 'with args:', joinPoint?.args)
    }

    async rollback(status: TypeormTransactionStatus): Promise<void> {
        const joinPoint = status.getPoint();
        joinPoint?.setValue(EntityManager, null);
        this.logger.debug('rollback transaction of', joinPoint?.fullName, 'with args', joinPoint?.args, 'case by', joinPoint?.throwing)
    }

}

function isRepository(type?: ClassType) {
    return type && (type === Repository || type === TreeRepository || type === MongoRepository || lang.isExtendsClass(type, Repository))
}