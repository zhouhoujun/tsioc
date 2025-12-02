import { token } from '@tsdi/ioc';

export const AOP_EXTEND_TARGET_TOKEN = token<(target: any) => void>('AOP_EXTEND_TARGET_TOKEN')

