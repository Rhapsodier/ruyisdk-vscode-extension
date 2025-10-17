// SPDX-License-Identifier: Apache-2.0
/**
 * DetectService
 *
 * Provides detectRuyiVersion() for use by the commands layer.
 *
 * Detection process:
 *  1. Attempts to retrieve the Ruyi version via the CLI (`ruyi --version`)
 *  2. Falls back to the Python entrypoint (`python -m ruyi --version`) if CLI
 * is unavailable
 *
 * Returns the detected version string on success, or null if Ruyi is not found.
 */

import * as cp from 'child_process'
import * as util from 'util'

import { SHORT_CMD_TIMEOUT_MS } from '../../common/constants'
import { pythonCandidates } from '../../common/utils'

const execAsync = util.promisify(cp.exec)


export async function detectRuyiVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('ruyi --version', {
      timeout: SHORT_CMD_TIMEOUT_MS,
    })
    const version = stdout.trim()
    if (version) return version
  } catch {
  }

  try {
    const { stdout: pipxList } = await execAsync('pipx list --json', {
      timeout: SHORT_CMD_TIMEOUT_MS,
    })
    
    try {
      const pipxData = JSON.parse(pipxList)
      if (pipxData.venvs && pipxData.venvs.ruyi) {
        const venvPath = pipxData.venvs.ruyi.metadata.main_package_path
        const pythonPath = `${venvPath}/bin/python`
        
        const { stdout } = await execAsync(`${pythonPath} -m ruyi --version`, {
          timeout: SHORT_CMD_TIMEOUT_MS,
        })
        const version = stdout.trim()
        if (version) return version
      }
    } catch {
    }
    
    const commonPipxPaths = [
      `${process.env.HOME}/.local/share/pipx/venvs/ruyi/bin/python`,
      `${process.env.XDG_DATA_HOME || `${process.env.HOME}/.local/share`}/pipx/venvs/ruyi/bin/python`,
      `/opt/pipx/venvs/ruyi/bin/python`,
    ]
    
    for (const pipxPath of commonPipxPaths) {
      try {
        const { stdout } = await execAsync(`${pipxPath} -m ruyi --version`, {
          timeout: SHORT_CMD_TIMEOUT_MS,
        })
        const version = stdout.trim()
        if (version) return version
      } catch {
        continue
      }
    }
  } catch {
  }

  for (const py of pythonCandidates()) {
    try {
      const { stdout } = await execAsync(`${py} -m ruyi --version`, {
        timeout: SHORT_CMD_TIMEOUT_MS,
      })
      const version = stdout.trim()
      if (version) return version
    } catch {
      continue
    }
  }

  return null
}
