export interface GitHubRelease {
  tag_name: string
  prerelease: boolean
  draft: boolean
}

/** @deprecated Use GitHubRelease instead — kept for config-manager compatibility during migration */
export interface NpmDistTags {
  latest: string
  [key: string]: string
}

export interface OpencodeConfig {
  plugin?: string[]
  [key: string]: unknown
}

export interface PackageJson {
  version: string
  name?: string
  [key: string]: unknown
}

export interface UpdateCheckResult {
  needsUpdate: boolean
  currentVersion: string | null
  latestVersion: string | null
  isLocalDev: boolean
  isPinned: boolean
}

export interface AutoUpdateCheckerOptions {
  showStartupToast?: boolean
  isPaulEnabled?: boolean
  autoUpdate?: boolean
}
