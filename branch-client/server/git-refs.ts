import { HttpError } from './http.ts'
import { git } from './process.ts'

export const existingRefs = async (repoPath: string, name: string) => {
  const candidates = [
    { ref: name, full: `refs/heads/${name}` },
    { ref: `origin/${name}`, full: `refs/remotes/origin/${name}` },
  ]
  const found = await Promise.all(
    candidates.map(async ({ ref, full }) =>
      (await git(repoPath, ['rev-parse', '--verify', '--quiet', full])).ok ? ref : null,
    ),
  )
  return found.filter((ref): ref is string => ref !== null)
}

export const resolveRef = async (repoPath: string, name: string) => {
  const [ref] = await existingRefs(repoPath, name)
  if (!ref) {
    throw new HttpError(
      400,
      `La rama «${name}» no existe en local ni en origin. Ejecuta git fetch en el repositorio y reintenta.`,
    )
  }
  return ref
}

export const findMergedBase = async (repoPath: string, branchRef: string, base: string) => {
  const baseRefs = await existingRefs(repoPath, base)
  if (!baseRefs.length) await resolveRef(repoPath, base)
  for (const baseRef of baseRefs) {
    if ((await git(repoPath, ['merge-base', '--is-ancestor', branchRef, baseRef])).ok) return baseRef
  }
  return null
}
