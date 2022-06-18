import { RouteMapping, RequestParam, Controller, Post, Put, Get, Delete, InternalServerError } from '@tsdi/core';
import { Log, Logger } from '@tsdi/logs';
import { DBRepository, Transactional } from '@tsdi/repository';
import { Repository } from 'typeorm';
import { Role } from '../models/models';

@Controller('/roles')
export class RoleController {

    constructor(@DBRepository(Role) private repo: Repository<Role>, @Log() private logger: Logger) {

    }

    @Transactional()
    @Post('/')
    @Put('/')
    async save(role: Role, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        const value = await this.repo.save(role);
        if (check) throw new InternalServerError('check');
        this.logger.info(value);
        return value;
    }

    @Transactional()
    @Post('/save2')
    @Put('/save2')
    async save2(role: Role, @DBRepository(Role) roleRepo: Repository<Role>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save2 isTransactionActive:', roleRepo.queryRunner?.isTransactionActive);
        const value = await roleRepo.save(role);
        if (check) throw new InternalServerError('check');
        this.logger.info(value);
        return value;
    }


    @Get('/:name')
    async getRole(name: string) {
        this.logger.log('name:', name);
        console.log('getRole isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        return await this.repo.findOne({ where: { name } });
    }


    @Transactional()
    @Delete('/:id')
    async del(id: string) {
        this.logger.log('id:', id);
        console.log('del isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        await this.repo.delete(id);
        return true;
    }


}
