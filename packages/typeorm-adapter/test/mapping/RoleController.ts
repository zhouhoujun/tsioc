import { RouteMapping, DBRepository } from '@tsdi/core';
import { ILogger, Logger } from '@tsdi/logs';
import { Repository } from 'typeorm';
import { Role, User } from '../models/models';

@RouteMapping('/roles')
export class RoleController {

    constructor(
        @DBRepository(Role) public roleRepo: Repository<Role>,
        @Logger() private logger: ILogger) {

    }

    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async save(role: Role) {
        this.logger.log(role);
        return await this.roleRepo.save(role);
    }


    @RouteMapping('/:name', 'get')
    async getRole(name: string) {
        this.logger.log('name:', name);
        return await this.roleRepo.findOne({ where: { name } });
    }


    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        this.logger.log('id:', id);
        await this.roleRepo.delete(id);
        return true;
    }


}
