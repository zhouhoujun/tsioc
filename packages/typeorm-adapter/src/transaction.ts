import { EMPTY, Inject } from '@tsdi/ioc';
import { TransactionalMetadata, TransactionManager, TransactionStatus } from '@tsdi/core';
import { Joinpoint } from '@tsdi/aop';
import { ILogger, Logger } from '@tsdi/logs';
import { EntityManager, getConnection } from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';


export class TypeormTransactionStatus extends TransactionStatus {

    private _jointPoint: Joinpoint | undefined;
    constructor(private definition: TransactionalMetadata) {
        super();
    }


    hasPoint(): boolean {
        return !!this._jointPoint;
    }

    async flush(joinPoint: Joinpoint): Promise<void> {
        this._jointPoint = joinPoint;
        const isolation = this.definition.isolation?.replace('_', ' ') as IsolationLevel;
        const connection = this.definition.connection;
        joinPoint.originProxy = (jpt) => {
            const runInTransaction = (entityManager: EntityManager) => {
                jpt.returning = jpt.originMethod?.(...jpt.args ?? EMPTY);
                return jpt.returning;
            }
            if (isolation) {
                getConnection(connection).transaction(isolation, runInTransaction);
            } else {
                getConnection(connection).transaction(runInTransaction);
            }
        }
    }

}

export class TypeormTransactionManager extends TransactionManager {

    constructor(
        @Inject(DEFAULT_CONNECTION, { nullable: true }) private conn: string,
        @Logger() private logger: ILogger) {
        super();
    }

    async getTransaction(definition: TransactionalMetadata): Promise<TransactionStatus> {
        return new TypeormTransactionStatus({ connection: this.conn, ...definition });
    }

    async commit(status: TransactionStatus): Promise<void> {
        this.logger.log('commit transaction');
    }
    async rollback(status: TransactionStatus): Promise<void> {
        this.logger.log('rollback transaction');
    }

}
