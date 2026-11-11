import { generateDto } from './dto';
import { generateOpenApi } from './openapi';
import { generateProto } from './proto';
import { ContractValidationError, GenerateContractOptions, GeneratedContract, MicroserviceContract } from './types';
import { validateContract } from './validate';

export * from './types';
export * from './validate';
export * from './dto';
export * from './openapi';
export * from './proto';

/**
 * Validate a contract and generate DTO + OpenAPI + proto sources.
 *
 * @throws ContractValidationError when the manifest references unknown models
 *         or contains duplicate routes/operations.
 */
export function generateContract(
    contract: MicroserviceContract,
    options: GenerateContractOptions = {}
): GeneratedContract {
    const errors = validateContract(contract);
    if (errors.length) {
        throw new ContractValidationError(errors);
    }
    return {
        dto: generateDto(contract, options),
        openapi: generateOpenApi(contract),
        proto: generateProto(contract, options.protoPackage)
    };
}
