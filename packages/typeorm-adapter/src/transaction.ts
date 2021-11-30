import { TransactionalMetadata, TransactionManager, TransactionStatus } from '@tsdi/core';


export class TypeormTransactionManager extends TransactionManager {
    
    getTransaction(definition: TransactionalMetadata): TransactionStatus {
        throw new Error('Method not implemented.');
    }
    commit(status: TransactionStatus): void {
        throw new Error('Method not implemented.');
    }
    rollback(status: TransactionStatus): void {
        throw new Error('Method not implemented.');
    }
    
}
