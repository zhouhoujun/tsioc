import { Execption } from '@tsdi/ioc';

export class RuntimeExecption extends Execption {
    constructor(readonly code: number, message: string) {
        super(message, code)
    }
}

export const enum RuntimeErrorCode {
    // Change Detection Errors
    EXPRESSION_CHANGED_AFTER_CHECKED = -100,
    RECURSIVE_APPLICATION_REF_TICK = 101,

    // Dependency Injection Errors
    CYCLIC_DI_DEPENDENCY = -200,
    PROVIDER_NOT_FOUND = -201,
    INVALID_FACTORY_DEPENDENCY = 202,
    MISSING_INJECTION_CONTEXT = 203,
    INVALID_INJECTION_TOKEN = 204,
    INJECTOR_ALREADY_DESTROYED = 205,

    // Template Errors
    MULTIPLE_COMPONENTS_MATCH = -300,
    EXPORT_NOT_FOUND = -301,
    PIPE_NOT_FOUND = -302,
    UNKNOWN_BINDING = 303,
    UNKNOWN_ELEMENT = 304,
    TEMPLATE_STRUCTURE_ERROR = 305,
    INVALID_EVENT_BINDING = 306,

    // Bootstrap Errors
    MULTIPLE_PLATFORMS = 400,
    PLATFORM_NOT_FOUND = 401,
    ERROR_HANDLER_NOT_FOUND = 402,
    BOOTSTRAP_COMPONENTS_NOT_FOUND = 403,
    ALREADY_DESTROYED_PLATFORM = 404,
    ASYNC_INITIALIZERS_STILL_RUNNING = 405,

    // Styling Errors

    // Declarations Errors

    // i18n Errors
    INVALID_I18N_STRUCTURE = 700,

    // JIT Compilation Errors
    // Other
    INVALID_DIFFER_INPUT = 900,
    NO_SUPPORTING_DIFFER_FACTORY = 901,
    VIEW_ALREADY_ATTACHED = 902,
    INVALID_INHERITANCE = 903,
    UNSAFE_VALUE_IN_RESOURCE_URL = 904,
    UNSAFE_VALUE_IN_SCRIPT = 905
}
