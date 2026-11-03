// Guitar input from an audio interface or the microphone. Browser only.
export const listGuitarInputs = async (): Promise<MediaDeviceInfo[]> =>
  (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')

export interface GuitarInput {
  context: AudioContext
  read: () => Float32Array // latest 2048 samples
  close: () => void
}

// The browser's voice processing wrecks a guitar signal (it gates the decay and pumps the gain),
// so all three are off.
export async function openGuitarInput(deviceId: string | null): Promise<GuitarInput> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })
  const context = new AudioContext()
  await context.resume()
  const analyser = context.createAnalyser()
  analyser.fftSize = 2048
  context.createMediaStreamSource(stream).connect(analyser) // never to the speakers
  const buffer = new Float32Array(analyser.fftSize)
  return {
    context,
    read() {
      analyser.getFloatTimeDomainData(buffer)
      return buffer
    },
    close() {
      for (const track of stream.getTracks()) track.stop()
      void context.close()
    },
  }
}
