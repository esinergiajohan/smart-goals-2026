import { spawn } from 'node:child_process'

const MAX_OUTPUT_BYTES = 20 * 1024 * 1024
const SECRET_ENV = /TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|CREDENTIAL|WEBHOOK/i

export interface ProcessResult {
  code: number | null
  stdout: string
  stderr: string
}

export const safeEnv = (): NodeJS.ProcessEnv => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !SECRET_ENV.test(name))),
  NO_COLOR: '1',
  PYTHON_COLORS: '0',
})

export const runProcess = (
  command: string,
  args: string[],
  { cwd, timeoutMs, env }: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv },
): Promise<ProcessResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...safeEnv(), ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      killSignal: 'SIGTERM',
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let size = 0
    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length
      if (size <= MAX_OUTPUT_BYTES) target.push(chunk)
    }

    child.stdout.on('data', collect(stdout))
    child.stderr.on('data', collect(stderr))
    child.on('error', reject)
    child.on('close', (code, signal) => {
      const result = {
        code,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      }
      if (signal) {
        reject(new Error(`${command} se detuvo (${signal}) tras ${Math.round(timeoutMs / 60000)} min o por cierre.`))
        return
      }
      resolve(result)
    })
  })

export const git = async (repoPath: string, args: string[]) => {
  const result = await runProcess('git', ['-C', repoPath, ...args], { cwd: repoPath, timeoutMs: 30_000 })
  return { ok: result.code === 0, output: result.stdout.trim() }
}
