import { EntityRepository, Repository } from 'typeorm';
import { User } from '../models/models';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    async findByAccount(name: string) {
        return await this.findOne({ where: { account: name } });
    }
}
