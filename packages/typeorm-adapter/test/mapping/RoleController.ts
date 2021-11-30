import { RouteMapping, DBRepository, Transactional } from '@tsdi/core';
import { ILogger, Logger } from '@tsdi/logs';
import { Repository } from 'typeorm';
import { Role } from '../models/models';

@RouteMapping('/roles')
export class RoleController {

    constructor(
        @DBRepository(Role) public roleRepo: Repository<Role>,
        @Logger() private logger: ILogger) {

    }

    @Transactional()
    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async save(role: Role) {
        this.logger.log(role);
        const value = await this.roleRepo.save(role);
        this.logger.info(value);
        return value;
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
