import { Singleton, Type, Inject, Static } from '@tsdi/ioc';
import { Repository, MongoRepository, Connection, getConnection } from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';



@Static()
export class TypeOrmHelper {

    constructor(@Inject(DEFAULT_CONNECTION, { nullable: true }) private conn: string) {

    }

    getConnection(connectName?: string): Connection {
        return getConnection(connectName || this.conn)
    }

    getRepository<T>(type: Type<T>, connectName?: string): Repository<T> {
        return this.getConnection(connectName).getRepository<T>(type)
    }

    getCustomRepository<T extends Repository<any>>(type: Type<T>, connectName?: string): T {
        return this.getConnection(connectName).getCustomRepository(type)
    }

    getMongoRepository<T>(type: Type<T>, connectName?: string): MongoRepository<T> {
        return this.getConnection(connectName).getMongoRepository<T>(type)
    }

}
