import { ClassType, EMPTY, Inject, isPromise, lang, refl, Type } from '@tsdi/ioc';
import { RepositoryMetadata, Transactional, TransactionalMetadata, TransactionError, TransactionManager, TransactionStatus } from '@tsdi/core';
import { Joinpoint } from '@tsdi/aop';
import { ILogger, Logger } from '@tsdi/logs';
import { EntityManager, getConnection, getManager, MongoRepository, Repository, TreeRepository } from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';

const typeORMTypes = [Repository, MongoRepository, TreeRepository];
export class TypeormTransactionStatus extends TransactionStatus {

    private _jointPoint: Joinpoint | undefined;
    constructor(private definition: TransactionalMetadata) {
        super();
    }

    getPoint(): Joinpoint | undefined {
        return this._jointPoint;
    }

    hasPoint(): boolean {
        return !!this._jointPoint;
    }

    async flush(joinPoint: Joinpoint): Promise<void> {
        this._jointPoint = joinPoint;
        const isolation = this.definition.isolation?.replace('_', ' ') as IsolationLevel;
        const connection = this.definition.connection;
        const propagation = this.definition.propagation;
        const targetRef = refl.get(joinPoint.targetType);
        const runInTransaction = async (entityManager: EntityManager) => {
            joinPoint.setValue(EntityManager, entityManager);
            // await entityManager.queryRunner?.startTransaction(isolation);
            if (joinPoint.params?.length) {
                targetRef.class.paramDecors.filter(dec => {
                    if (dec.propertyKey === joinPoint.method) {
                        if (dec.decor === Transactional.toString()) {
                            joinPoint.args?.splice(dec.parameterIndex || 0, 1, this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.type, entityManager));
                        } else if (((dec.metadata.provider as Type) || dec.metadata.type) === EntityManager) {
                            joinPoint.args?.splice(dec.parameterIndex || 0, 1, entityManager);
                        } else if (typeORMTypes.some(i => lang.isExtendsClass((dec.metadata.provider as Type) || dec.metadata.type, i))) {
                            joinPoint.args?.splice(dec.parameterIndex || 0, 1, this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.type, entityManager));
                        }
                    }
                });
            }
            targetRef.class.propDecors.forEach(dec => {
                if (dec.decor === Transactional.toString()) {
                    joinPoint.target[dec.propertyKey] = this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.type, entityManager);
                } else if (((dec.metadata.provider as Type) || dec.metadata.type) === EntityManager) {
                    joinPoint.target[dec.propertyKey] = entityManager;
                } else if (typeORMTypes.some(i => lang.isExtendsClass((dec.metadata.provider as Type) || dec.metadata.type, i))) {
                    joinPoint.target[dec.propertyKey] = this.getRepository((dec.metadata as RepositoryMetadata).model, dec.metadata.type, entityManager)
                }
            })

            return await joinPoint.originMethod?.(...joinPoint.args ?? EMPTY);
        }

        const withNewTransaction = (jpt: Joinpoint) => {
            if (isolation) {
                jpt.returning = getConnection(connection).transaction(isolation, runInTransaction);
            } else {
                jpt.returning = getConnection(connection).transaction(runInTransaction);
            }
        }
        const withOrigin = (jpt: Joinpoint, afterReturning?: (val: any) => any) => {
            jpt.returning = jpt.originMethod?.(...jpt.args ?? EMPTY);
            if (afterReturning && isPromise(jpt.returning)) {
                jpt.returning = jpt.returning.then(afterReturning);
            }
        };

        joinPoint.originProxy = (jpt) => {
            const currTransaction = jpt.getValue(EntityManager);
            switch (propagation) {
                case 'MANDATORY':
                    if (!currTransaction) {
                        throw new TransactionError(`No existing transaction found for transaction marked with propagation 'MANDATORY'`)
                    }
                    return withOrigin(jpt);

                case 'NESTED':
                    return withNewTransaction(jpt);

                case 'NEVER':
                    if (currTransaction) {
                        throw new TransactionError(
                            "Found an existing transaction, transaction marked with propagation 'NEVER'"
                        )
                    }
                    withOrigin(jpt);

                case 'NOT_SUPPORTED':
                    jpt.setValue(EntityManager, null);
                    withOrigin(jpt, (value) => {
                        jpt.setValue(EntityManager, currTransaction);
                        return value;
                    });

                    break;
                case 'REQUIRED':
                    if (currTransaction) {
                        return withOrigin(jpt);
                    }
                    return withNewTransaction(jpt);
                case 'REQUIRES_NEW':
                    return withNewTransaction(jpt);
                case 'SUPPORTS':
                    return withOrigin(jpt);
            }


        }
    }

    protected getRepository<T>(model: Type<T> | undefined, rep: ClassType | undefined, entityManager: EntityManager) {
        if (!model) {
            return entityManager.getCustomRepository(rep!);
        }
        switch (rep) {
            case Repository:
                return entityManager.getRepository(model);
            case MongoRepository:
                return entityManager.getMongoRepository(model);
            case TreeRepository:
                return entityManager.getTreeRepository(model);
            default:
                return entityManager.getCustomRepository(rep!);
        }
    }

}

export class TypeormTransactionManager extends TransactionManager {

    constructor(
        @Inject(DEFAULT_CONNECTION, { nullable: true }) private conn: string,
        @Logger() private logger: ILogger) {
        super();
    }

    async getTransaction(definition: TransactionalMetadata): Promise<TypeormTransactionStatus> {
        return new TypeormTransactionStatus({ connection: this.conn, ...definition });
    }

    async commit(status: TypeormTransactionStatus): Promise<void> {
        // await status.getPoint()?.getValue(EntityManager).queryRunner?.commitTransaction();
        status.getPoint()?.setValue(EntityManager, null);
        this.logger.log('commit transaction');

    }
    async rollback(status: TypeormTransactionStatus): Promise<void> {
        // await status.getPoint()?.getValue(EntityManager).queryRunner?.rollbackTransaction();
        status.getPoint()?.setValue(EntityManager, null);
        this.logger.log('rollback transaction');
    }

}
