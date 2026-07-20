let audioCtx: AudioContext | null = null

export function playGong() {
  audioCtx ??= new AudioContext()
  const ctx = audioCtx
  if (ctx.state === 'suspended') ctx.resume()

  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(220, now)

  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.4, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(now)
  oscillator.stop(now + 1.4)
}
