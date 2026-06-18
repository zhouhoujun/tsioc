import { RequestParam, Controller, Post, Put, Get, Delete } from '@tsdi/service';
import { Log, Logger } from '@tsdi/logger';
import { InternalServerException } from '@tsdi/common';
import { InjectRepository, Transactional } from '@tsdi/repository';
import { Repository } from 'typeorm';
import { Role } from '../models/models';

@Controller('/roles')
export class RoleController {

    constructor(@InjectRepository(Role) private repo: Repository<Role>, @Log() private logger: Logger) {

    }

    @Transactional()
    @Post('/')
    @Put('/')
    async save(role: Role, @RequestParam('check', { nullable: true, pipe: 'boolean' }) check?: boolean) {
        this.logger.log(role);
        const value = await this.repo.save(role);
        if (check) throw new InternalServerException('check');
        this.logger.info(value);
        return value;
    }

    @Transactional()
    @Post('/save2')
    @Put('/save2')
    async save2(role: Role, @InjectRepository(Role) roleRepo: Repository<Role>, @RequestParam('check', { nullable: true, pipe: 'boolean' }) check?: boolean) {
        this.logger.log(role);
        const value = await roleRepo.save(role);
        if (check) throw new InternalServerException('check');
        this.logger.info(value);
        return value;
    }

    @Get('/')
    async getRole(@RequestParam('name', { nullable: true }) name: string) {
        this.logger.log('name:', name);
        return await this.repo.findOne({ where: { name } });
    }

    @Transactional()
    @Delete('/')
    async del(@RequestParam('id', { nullable: true }) id: string) {
        this.logger.log('id:', id);
        await this.repo.delete(id);
        return true;
    }

}
