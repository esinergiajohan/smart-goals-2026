import { git } from '../process.ts'
import { bitbucketRepository, createBitbucketProvider } from './bitbucket.ts'
import type { GitProvider } from './types.ts'

export interface ProviderSettings {
  bitbucketEnvFile: string
}

export const providerFor = async (repoPath: string, settings: ProviderSettings): Promise<GitProvider | null> => {
  const remote = await git(repoPath, ['remote', 'get-url', 'origin'])
  if (!remote.ok) return null
  if (bitbucketRepository(remote.output)) return createBitbucketProvider(remote.output, settings.bitbucketEnvFile)
  return null
}
