import { Repository, MongoRepository, Connection } from 'typeorm';
import { Singleton, Type } from '@tsdi/ioc';
import { TypeormConnectionStatupService } from './TypeormConnectionStatupService';



@Singleton
export class TypeOrmHelper {

    constructor(private service: TypeormConnectionStatupService) {

    }

    getConnection(connectName?: string): Connection {
        return this.service.getConnection(connectName);
    }

    getRepository<T>(type: Type<T>, connectName?: string): Repository<T> {
        let conn = this.service.getConnection(connectName);
        return conn.getRepository<T>(type);
    }

    getCustomRepository<T extends Repository<any>>(type: Type<T>, connectName?: string): T {
        return this.getCustomRepository(type, connectName);
    }

    getMongoRepository<T>(type: Type<T>, connectName?: string): MongoRepository<T> {
        let conn = this.service.getConnection(connectName);
        return conn.getMongoRepository<T>(type);
    }

}
