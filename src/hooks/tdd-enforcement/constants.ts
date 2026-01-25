/**
 * TDD Exemption Patterns
 *
 * Defines which files require TDD (Test-Driven Development) and which are exempt.
 *
 * Philosophy:
 * - Code with business logic or validation → TDD REQUIRED
 * - Pure types, configs, documentation → TDD EXEMPT
 */

/**
 * File patterns that REQUIRE TDD (write tests first)
 */
export const CODE_FILE_PATTERNS: RegExp[] = [
  // TypeScript/JavaScript code files (implementation)
  /\.(ts|tsx|js|jsx)$/,

  // Python code files
  /\.py$/,

  // Go code files
  /\.go$/,

  // But exclude specific exempt patterns (handled by EXEMPT_FILE_PATTERNS)
]

/**
 * File patterns that are EXEMPT from TDD requirements
 *
 * These patterns take precedence over CODE_FILE_PATTERNS.
 * If a file matches both, it's EXEMPT.
 */
export const EXEMPT_FILE_PATTERNS: RegExp[] = [
  // Documentation files
  /\.md$/,
  /\.txt$/,
  /README/i,
  /CHANGELOG/i,
  /LICENSE/i,

  // Configuration files
  /\.json$/,
  /\.yaml$/,
  /\.yml$/,
  /\.env/,
  /\.toml$/,
  /\.ini$/,
  /package\.json$/,
  /tsconfig\.json$/,
  /\.eslintrc/,
  /\.prettierrc/,

  // Pure type definition files (no logic)
  /\.types\.ts$/,
  /\.d\.ts$/,
  /types\.(ts|tsx)$/,

  // Constants files (static data, no logic)
  /\.constants\.ts$/,
  /constants\.(ts|tsx)$/,

  // Assets
  /\.(css|scss|sass|less)$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
  /\.(woff|woff2|eot|ttf|otf)$/,
  /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/,

  // Build artifacts and dependencies
  /node_modules/,
  /dist\//,
  /build\//,
  /\.next\//,
  /\.cache\//,
  /coverage\//,

  // Test files themselves (don't need tests for tests)
  /\.(test|spec)\.(ts|tsx|js|jsx)$/,
  /__tests__\//,
  /__mocks__\//,

  // Generated files
  /\.generated\.(ts|tsx|js|jsx)$/,
  /\.g\.(ts|tsx|js|jsx)$/,

  // Coordination/plan files
  /\.sisyphus\//,
  /\.paul\/plans\//,
  /\.paul\/drafts\//,

  // Git and version control
  /\.git\//,
  /\.gitignore$/,
  /\.gitattributes$/,
]

/**
 * File patterns that REQUIRE TDD even if they match code patterns
 *
 * Schema files contain validation logic → TDD REQUIRED
 */
export const FORCE_TDD_PATTERNS: RegExp[] = [
  /\.schema\.ts$/,
  /schema\.(ts|tsx)$/,
  /validation\.(ts|tsx)$/,
]

/**
 * Determines if a file requires TDD based on its path
 *
 * Logic:
 * 1. If matches FORCE_TDD_PATTERNS → TRUE (TDD required)
 * 2. If matches EXEMPT_FILE_PATTERNS → FALSE (TDD exempt)
 * 3. If matches CODE_FILE_PATTERNS → TRUE (TDD required)
 * 4. Otherwise → FALSE (TDD exempt by default)
 *
 * @param filePath - The file path to check (can be relative or absolute)
 * @returns true if TDD is required, false if exempt
 */
export function requiresTDD(filePath: string): boolean {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = filePath.replace(/\\/g, "/")

  // Force TDD for schema/validation files
  if (FORCE_TDD_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return true
  }

  // Exempt files take precedence
  if (EXEMPT_FILE_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return false
  }

  // Code files require TDD
  if (CODE_FILE_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return true
  }

  // Default: exempt (conservative - only enforce TDD on known code files)
  return false
}

/**
 * Get human-readable reason for TDD requirement
 *
 * @param filePath - The file path to check
 * @returns Explanation string
 */
export function getTDDRequirementReason(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, "/")

  if (FORCE_TDD_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return "Schema/validation file contains logic → TDD REQUIRED"
  }

  if (EXEMPT_FILE_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return "File type exempt from TDD (config/docs/types/assets)"
  }

  if (CODE_FILE_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return "Code file → TDD REQUIRED"
  }

  return "Unknown file type → TDD EXEMPT (by default)"
}
