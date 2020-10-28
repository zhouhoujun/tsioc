/**
 * List ASCII char codes to be used with `String.charCodeAt`
 */
export const enum CharCode {
    UPPER_CASE = ~32,   // & with this will make the char uppercase
    SPACE = 32,         // " "
    DOUBLE_QUOTE = 34,  // "\""
    SINGLE_QUOTE = 39,  // "'"
    OPEN_PAREN = 40,    // "("
    CLOSE_PAREN = 41,   // ")"
    COLON = 58,         // ":"
    DASH = 45,          // "-"
    UNDERSCORE = 95,    // "_"
    SEMI_COLON = 59,    // ";"
    BACK_SLASH = 92,    // "\\"
    AT_SIGN = 64,       // "@"
    ZERO = 48,          // "0"
    NINE = 57,          // "9"
    A = 65,             // "A"
    U = 85,             // "U"
    R = 82,             // "R"
    L = 76,             // "L"
    Z = 90,             // "A"
    a = 97,             // "a"
    z = 122,            // "z"
}
