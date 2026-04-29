import { token } from '@tsdi/ioc';

/**
 * Service registration strategy interface.
 * 服务注册策略接口
 */
export interface IRegistrationStrategy {
    /**
     * Register this service instance with discovery.
     * 向服务发现注册此服务实例
     */
    register(): Promise<any>;

    /**
     * Deregister this service instance from discovery.
     * 从服务发现注销此服务实例
     */
    deregister(): Promise<any>;
}

export const REGISTRATION_STRATEGY = token<IRegistrationStrategy>('REGISTRATION_STRATEGY');
