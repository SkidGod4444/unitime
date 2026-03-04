/**
 * Error Codes Library
 * Provides standardized error codes for better debugging and error tracking
 */

import { Context } from "hono";

// ============================================================================
// ERROR CODE TYPES
// ============================================================================

export interface ErrorCode {
  code: string;
  message: string;
  status_code: number;
  category: ErrorCategory;
}

export type ErrorCategory =
  | "AUTH"
  | "VALIDATION"
  | "DATABASE"
  | "NETWORK"
  | "PERMISSION"
  | "RESOURCE"
  | "BUSINESS_LOGIC"
  | "SYSTEM"
  | "EXTERNAL_SERVICE";

// ============================================================================
// AUTHENTICATION & AUTHORIZATION ERRORS (AUTH_*)
// ============================================================================

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: "AUTH_001",
    message: "Invalid email or password",
    status_code: 401,
    category: "AUTH" as ErrorCategory,
  },
  TOKEN_EXPIRED: {
    code: "AUTH_002",
    message: "Authentication token has expired",
    status_code: 401,
    category: "AUTH" as ErrorCategory,
  },
  TOKEN_INVALID: {
    code: "AUTH_003",
    message: "Invalid or malformed authentication token",
    status_code: 401,
    category: "AUTH" as ErrorCategory,
  },
  TOKEN_MISSING: {
    code: "AUTH_004",
    message: "Authentication token is required but missing",
    status_code: 401,
    category: "AUTH" as ErrorCategory,
  },
  UNAUTHORIZED: {
    code: "AUTH_005",
    message: "You are not authorized to perform this action",
    status_code: 403,
    category: "AUTH" as ErrorCategory,
  },
  SESSION_EXPIRED: {
    code: "AUTH_006",
    message: "Your session has expired. Please login again",
    status_code: 401,
    category: "AUTH" as ErrorCategory,
  },
  ACCOUNT_LOCKED: {
    code: "AUTH_007",
    message: "Account has been locked due to multiple failed login attempts",
    status_code: 403,
    category: "AUTH" as ErrorCategory,
  },
  ACCOUNT_DISABLED: {
    code: "AUTH_008",
    message: "This account has been disabled",
    status_code: 403,
    category: "AUTH" as ErrorCategory,
  },
  EMAIL_NOT_VERIFIED: {
    code: "AUTH_009",
    message: "Email address has not been verified",
    status_code: 403,
    category: "AUTH" as ErrorCategory,
  },
  INVALID_REFRESH_TOKEN: {
    code: "AUTH_010",
    message: "Invalid or expired refresh token",
    status_code: 401,
    category: "AUTH" as ErrorCategory,
  },
} as const;

// ============================================================================
// VALIDATION ERRORS (VAL_*)
// ============================================================================

export const VALIDATION_ERRORS = {
  INVALID_INPUT: {
    code: "VAL_001",
    message: "Invalid input data provided",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  MISSING_REQUIRED_FIELD: {
    code: "VAL_002",
    message: "Required field is missing",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  INVALID_EMAIL: {
    code: "VAL_003",
    message: "Invalid email format",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  INVALID_PASSWORD: {
    code: "VAL_004",
    message: "Password does not meet requirements",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  INVALID_DATE: {
    code: "VAL_005",
    message: "Invalid date format or value",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  INVALID_UUID: {
    code: "VAL_006",
    message: "Invalid UUID format",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  INVALID_FILE_TYPE: {
    code: "VAL_007",
    message: "Unsupported file type",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  FILE_TOO_LARGE: {
    code: "VAL_008",
    message: "File size exceeds maximum allowed size",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  INVALID_PHONE_NUMBER: {
    code: "VAL_009",
    message: "Invalid phone number format",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
  INVALID_URL: {
    code: "VAL_010",
    message: "Invalid URL format",
    status_code: 400,
    category: "VALIDATION" as ErrorCategory,
  },
} as const;

// ============================================================================
// DATABASE ERRORS (DB_*)
// ============================================================================

export const DATABASE_ERRORS = {
  CONNECTION_FAILED: {
    code: "DB_001",
    message: "Failed to connect to database",
    status_code: 500,
    category: "DATABASE" as ErrorCategory,
  },
  QUERY_FAILED: {
    code: "DB_002",
    message: "Database query execution failed",
    status_code: 500,
    category: "DATABASE" as ErrorCategory,
  },
  DUPLICATE_ENTRY: {
    code: "DB_003",
    message: "Duplicate entry detected",
    status_code: 409,
    category: "DATABASE" as ErrorCategory,
  },
  RECORD_NOT_FOUND: {
    code: "DB_004",
    message: "Requested record not found",
    status_code: 404,
    category: "DATABASE" as ErrorCategory,
  },
  FOREIGN_KEY_CONSTRAINT: {
    code: "DB_005",
    message: "Foreign key constraint violation",
    status_code: 400,
    category: "DATABASE" as ErrorCategory,
  },
  TRANSACTION_FAILED: {
    code: "DB_006",
    message: "Database transaction failed",
    status_code: 500,
    category: "DATABASE" as ErrorCategory,
  },
  DEADLOCK: {
    code: "DB_007",
    message: "Database deadlock detected",
    status_code: 500,
    category: "DATABASE" as ErrorCategory,
  },
  TIMEOUT: {
    code: "DB_008",
    message: "Database query timeout",
    status_code: 504,
    category: "DATABASE" as ErrorCategory,
  },
} as const;

// ============================================================================
// RESOURCE ERRORS (RES_*)
// ============================================================================

export const RESOURCE_ERRORS = {
  NOT_FOUND: {
    code: "RES_001",
    message: "Requested resource not found",
    status_code: 404,
    category: "RESOURCE" as ErrorCategory,
  },
  ALREADY_EXISTS: {
    code: "RES_002",
    message: "Resource already exists",
    status_code: 409,
    category: "RESOURCE" as ErrorCategory,
  },
  CONFLICT: {
    code: "RES_003",
    message: "Resource conflict detected",
    status_code: 409,
    category: "RESOURCE" as ErrorCategory,
  },
  GONE: {
    code: "RES_004",
    message: "Resource is no longer available",
    status_code: 410,
    category: "RESOURCE" as ErrorCategory,
  },
  LOCKED: {
    code: "RES_005",
    message: "Resource is currently locked",
    status_code: 423,
    category: "RESOURCE" as ErrorCategory,
  },
} as const;

// ============================================================================
// PERMISSION ERRORS (PERM_*)
// ============================================================================

export const PERMISSION_ERRORS = {
  INSUFFICIENT_PERMISSIONS: {
    code: "PERM_001",
    message: "You don't have sufficient permissions for this action",
    status_code: 403,
    category: "PERMISSION" as ErrorCategory,
  },
  ROLE_REQUIRED: {
    code: "PERM_002",
    message: "Required role not assigned to user",
    status_code: 403,
    category: "PERMISSION" as ErrorCategory,
  },
  ACCESS_DENIED: {
    code: "PERM_003",
    message: "Access to this resource is denied",
    status_code: 403,
    category: "PERMISSION" as ErrorCategory,
  },
  ORGANIZATION_ACCESS_DENIED: {
    code: "PERM_004",
    message: "You don't have access to this organization",
    status_code: 403,
    category: "PERMISSION" as ErrorCategory,
  },
} as const;

// ============================================================================
// BUSINESS LOGIC ERRORS (BIZ_*)
// ============================================================================

export const BUSINESS_ERRORS = {
  INVALID_OPERATION: {
    code: "BIZ_001",
    message: "This operation is not allowed in the current state",
    status_code: 400,
    category: "BUSINESS_LOGIC" as ErrorCategory,
  },
  QUOTA_EXCEEDED: {
    code: "BIZ_002",
    message: "Quota or limit exceeded",
    status_code: 429,
    category: "BUSINESS_LOGIC" as ErrorCategory,
  },
  RATE_LIMIT_EXCEEDED: {
    code: "BIZ_003",
    message: "Too many requests. Please try again later",
    status_code: 429,
    category: "BUSINESS_LOGIC" as ErrorCategory,
  },
  INSUFFICIENT_BALANCE: {
    code: "BIZ_004",
    message: "Insufficient balance for this operation",
    status_code: 400,
    category: "BUSINESS_LOGIC" as ErrorCategory,
  },
  INVALID_STATE_TRANSITION: {
    code: "BIZ_005",
    message: "Invalid state transition attempted",
    status_code: 400,
    category: "BUSINESS_LOGIC" as ErrorCategory,
  },
  EXPIRED: {
    code: "BIZ_006",
    message: "Resource or offer has expired",
    status_code: 410,
    category: "BUSINESS_LOGIC" as ErrorCategory,
  },
  ALREADY_PROCESSED: {
    code: "BIZ_007",
    message: "Request has already been processed",
    status_code: 409,
    category: "BUSINESS_LOGIC" as ErrorCategory,
  },
} as const;

// ============================================================================
// NETWORK ERRORS (NET_*)
// ============================================================================

export const NETWORK_ERRORS = {
  CONNECTION_TIMEOUT: {
    code: "NET_001",
    message: "Connection timeout",
    status_code: 504,
    category: "NETWORK" as ErrorCategory,
  },
  CONNECTION_REFUSED: {
    code: "NET_002",
    message: "Connection refused",
    status_code: 503,
    category: "NETWORK" as ErrorCategory,
  },
  NETWORK_UNAVAILABLE: {
    code: "NET_003",
    message: "Network is unavailable",
    status_code: 503,
    category: "NETWORK" as ErrorCategory,
  },
  DNS_RESOLUTION_FAILED: {
    code: "NET_004",
    message: "DNS resolution failed",
    status_code: 503,
    category: "NETWORK" as ErrorCategory,
  },
} as const;

// ============================================================================
// EXTERNAL SERVICE ERRORS (EXT_*)
// ============================================================================

export const EXTERNAL_SERVICE_ERRORS = {
  SERVICE_UNAVAILABLE: {
    code: "EXT_001",
    message: "External service is currently unavailable",
    status_code: 503,
    category: "EXTERNAL_SERVICE" as ErrorCategory,
  },
  API_ERROR: {
    code: "EXT_002",
    message: "External API returned an error",
    status_code: 502,
    category: "EXTERNAL_SERVICE" as ErrorCategory,
  },
  PAYMENT_FAILED: {
    code: "EXT_003",
    message: "Payment processing failed",
    status_code: 402,
    category: "EXTERNAL_SERVICE" as ErrorCategory,
  },
  SMS_DELIVERY_FAILED: {
    code: "EXT_004",
    message: "SMS delivery failed",
    status_code: 500,
    category: "EXTERNAL_SERVICE" as ErrorCategory,
  },
  EMAIL_DELIVERY_FAILED: {
    code: "EXT_005",
    message: "Email delivery failed",
    status_code: 500,
    category: "EXTERNAL_SERVICE" as ErrorCategory,
  },
} as const;

// ============================================================================
// SYSTEM ERRORS (SYS_*)
// ============================================================================

export const SYSTEM_ERRORS = {
  INTERNAL_ERROR: {
    code: "SYS_001",
    message: "An internal server error occurred",
    status_code: 500,
    category: "SYSTEM" as ErrorCategory,
  },
  SERVICE_UNAVAILABLE: {
    code: "SYS_002",
    message: "Service is temporarily unavailable",
    status_code: 503,
    category: "SYSTEM" as ErrorCategory,
  },
  MAINTENANCE_MODE: {
    code: "SYS_003",
    message: "System is under maintenance",
    status_code: 503,
    category: "SYSTEM" as ErrorCategory,
  },
  NOT_IMPLEMENTED: {
    code: "SYS_004",
    message: "Feature not yet implemented",
    status_code: 501,
    category: "SYSTEM" as ErrorCategory,
  },
  CONFIGURATION_ERROR: {
    code: "SYS_005",
    message: "System configuration error",
    status_code: 500,
    category: "SYSTEM" as ErrorCategory,
  },
} as const;

// ============================================================================
// ALL ERROR CODES (Combined)
// ============================================================================

export const ERROR_CODES = {
  ...AUTH_ERRORS,
  ...VALIDATION_ERRORS,
  ...DATABASE_ERRORS,
  ...RESOURCE_ERRORS,
  ...PERMISSION_ERRORS,
  ...BUSINESS_ERRORS,
  ...NETWORK_ERRORS,
  ...EXTERNAL_SERVICE_ERRORS,
  ...SYSTEM_ERRORS,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a standardized error response object
 */
export function createErrorResponse(
  status_code: number,
  errorCode: ErrorCode,
  details?: string | Record<string, unknown>,
) {
  return {
    success: false,
    status_code,
    error: {
      code: errorCode.code,
      message: errorCode.message,
      category: errorCode.category,
      ...(details && {
        details: typeof details === "string" ? details : details,
      }),
    },
  };
}

/**
 * Creates a Hono-compatible error response
 * Use this in Hono route handlers for automatic JSON formatting
 */
export function createHonoErrorResponse(
  c: Context, // Hono Context
  errorCode: ErrorCode,
  details?: string | Record<string, unknown>,
) {
  return c.json(
    createErrorResponse(errorCode.status_code, errorCode, details),
    errorCode.status_code as any,
  );
}

/**
 * Creates a custom error with additional context
 */
export function createError(
  errorCode: ErrorCode,
  details?: string | Record<string, unknown>,
) {
  const error = new Error(errorCode.message) as Error & {
    code: string;
    status_code: number;
    category: ErrorCategory;
    details?: string | Record<string, unknown>;
  };

  error.code = errorCode.code;
  error.status_code = errorCode.status_code;
  error.category = errorCode.category;

  if (details) {
    error.details = details;
  }

  return error;
}

/**
 * Get error code by code string
 */
export function getErrorByCode(code: string): ErrorCode | undefined {
  return Object.values(ERROR_CODES).find((error) => error.code === code);
}

/**
 * Get all errors by category
 */
export function getErrorsByCategory(category: ErrorCategory): ErrorCode[] {
  return Object.values(ERROR_CODES).filter(
    (error) => error.category === category,
  );
}

/**
 * Check if an error code exists
 */
export function isValidErrorCode(code: string): boolean {
  return Object.values(ERROR_CODES).some((error) => error.code === code);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ErrorCodeKey = keyof typeof ERROR_CODES;
export type ErrorCodeValue = (typeof ERROR_CODES)[ErrorCodeKey];
