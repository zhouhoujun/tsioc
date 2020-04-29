import { Repository, MongoRepository, Connection } from 'typeorm';
import { Singleton, Type, Inject, INJECTOR } from '@tsdi/ioc';
import { TypeormConnectionStatupService } from './TypeormConnectionStatupService';
import { ICoreInjector } from '@tsdi/core';



@Singleton()
export class TypeOrmHelper {

    private service: TypeormConnectionStatupService;

    @Inject(INJECTOR)
    private injector: ICoreInjector;

    constructor() {
    }

    getConnection(connectName?: string): Connection {
        if (!this.service) {
            this.service = this.injector.get(TypeormConnectionStatupService);
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
