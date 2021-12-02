import { TransactionalMetadata, TransactionManager, TransactionStatus } from '@tsdi/core';
import { Inject } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { EntityManager, getConnection } from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';


export class TypeormTransactionStatus extends TransactionStatus {
    constructor(public runInTransaction: (entityManager: EntityManager) => Promise<any>) {
        super()
    }
    hasPoint(): boolean {
        throw new Error('Method not implemented.');
    }
    flush(): void {
        throw new Error('Method not implemented.');
    }

}

export class TypeormTransactionManager extends TransactionManager {

    constructor(
        @Inject(DEFAULT_CONNECTION, { nullable: true }) private conn: string,
        @Logger() private logger: ILogger) {
        super();
    }

    async getTransaction(definition: TransactionalMetadata): Promise<TransactionStatus> {
        const status = new TypeormTransactionStatus(async entityManager => {

        });
        await getConnection(definition.connection || this.conn).transaction(status.runInTransaction);
        return status;

    }
    commit(status: TransactionStatus): void {
        this.logger.log();
    }
    rollback(status: TransactionStatus): void {
        this.logger
    }

}
