import { spawn } from "child_process"
import { mkdtemp, writeFile, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { logger } from "./log"

export interface ComposeScene {
  imageBase64: string
  voiceLineMs: number
}

export interface ComposeRequest {
  scenes: ComposeScene[]
  musicBase64?: string
  voiceBase64?: string
  videoBase64?: string
  width?: number
  height?: number
  fps?: number
}

export interface ComposeResult {
  mp4: Buffer
  durationMs: number
}

interface RunCmdResult {
  code: number
  stdout: string
  stderr: string
}

function runCommand(cmd: string, args: string[]): Promise<RunCmdResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (d) => (stdout += d.toString()))
    child.stderr.on("data", (d) => (stderr += d.toString()))
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

async function decodeToFile(base64: string, path: string): Promise<void> {
  const buf = Buffer.from(base64, "base64")
  await writeFile(path, buf)
}

export async function composeAd(req: ComposeRequest): Promise<ComposeResult> {
  if (req.scenes.length === 0) {
    throw new Error("compose requires at least one scene")
  }
  const width = req.width ?? 1280
  const height = req.height ?? 720
  const fps = req.fps ?? 30

  const workDir = await mkdtemp(join(tmpdir(), "delegate-compose-"))
  try {
    const sceneInputs: string[] = []
    const filterParts: string[] = []
    let totalMs = 0

    for (let i = 0; i < req.scenes.length; i++) {
      const scene = req.scenes[i]!
      const path = join(workDir, `scene-${i}.png`)
      await decodeToFile(scene.imageBase64, path)
      sceneInputs.push(path)
      const durSec = Math.max(scene.voiceLineMs / 1000, 1)
      totalMs += scene.voiceLineMs
      filterParts.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=cover,setsar=1,zoompan=z='zoom+0.0015':d=${Math.round(durSec * fps)}:s=${width}x${height}:fps=${fps}[v${i}]`,
      )
    }

    const concatFilter = req.scenes
      .map((_, i) => `[v${i}]`)
      .join("") + `concat=n=${req.scenes.length}:v=1:a=0[vout]`

    const ffmpegArgs: string[] = []
    for (const input of sceneInputs) {
      ffmpegArgs.push("-loop", "1", "-i", input)
    }

    let audioInputIndex = -1
    if (req.voiceBase64) {
      const voicePath = join(workDir, "voice.mp3")
      await decodeToFile(req.voiceBase64, voicePath)
      audioInputIndex = sceneInputs.length
      ffmpegArgs.push("-i", voicePath)
    }
    let musicInputIndex = -1
    if (req.musicBase64) {
      const musicPath = join(workDir, "music.mp3")
      await decodeToFile(req.musicBase64, musicPath)
      musicInputIndex = audioInputIndex >= 0 ? audioInputIndex + 1 : sceneInputs.length
      ffmpegArgs.push("-i", musicPath)
    }

    let audioFilter = ""
    let audioMap = ""
    if (audioInputIndex >= 0 && musicInputIndex >= 0) {
      audioFilter = `;[${audioInputIndex}:a]volume=1.0[a1];[${musicInputIndex}:a]volume=0.25[a2];[a1][a2]amix=inputs=2:duration=longest[aout]`
      audioMap = "[aout]"
    } else if (audioInputIndex >= 0) {
      audioMap = `${audioInputIndex}:a`
    } else if (musicInputIndex >= 0) {
      audioFilter = `;[${musicInputIndex}:a]volume=0.6[aout]`
      audioMap = "[aout]"
    }

    const filterComplex = filterParts.join(";") + ";" + concatFilter + audioFilter
    const outputPath = join(workDir, "out.mp4")

    ffmpegArgs.push("-filter_complex", filterComplex)
    ffmpegArgs.push("-map", "[vout]")
    if (audioMap) ffmpegArgs.push("-map", audioMap)
    ffmpegArgs.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p")
    if (audioMap) ffmpegArgs.push("-c:a", "aac", "-b:a", "128k")
    ffmpegArgs.push("-shortest", "-y", outputPath)

    logger.info({ cmd: "ffmpeg", args: ffmpegArgs.slice(0, 6) }, "compose: starting ffmpeg")
    const result = await runCommand("ffmpeg", ffmpegArgs)
    if (result.code !== 0) {
      logger.error({ stderr: result.stderr.slice(-1500) }, "ffmpeg failed")
      throw new Error(`ffmpeg exited with code ${result.code}`)
    }

    const mp4 = await readFile(outputPath)
    return { mp4, durationMs: totalMs }
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
