import { Singleton, Type, Inject, Injector } from '@tsdi/ioc';
import { Repository, MongoRepository, Connection } from 'typeorm';
import { TypeormServer } from './TypeormServer';



@Singleton()
export class TypeOrmHelper {

    private service!: TypeormServer;

    @Inject()
    private injector!: Injector;

    getConnection(connectName?: string): Connection {
        if (!this.service) {
            this.service = this.injector.get(TypeormServer);
        }
        return this.service.getConnection(connectName);
    }

    getRepository<T>(type: Type<T>, connectName?: string): Repository<T> {
        return this.getConnection(connectName).getRepository<T>(type);
    }

    getCustomRepository<T extends Repository<any>>(type: Type<T>, connectName?: string): T {
        return this.getConnection(connectName).getCustomRepository(type);
    }

    getMongoRepository<T>(type: Type<T>, connectName?: string): MongoRepository<T> {
        return this.getConnection(connectName).getMongoRepository<T>(type);
    }

}
