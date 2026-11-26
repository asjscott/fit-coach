// The rest's beep on the web (#179). A browser plays sound only from a context a tap has started, so Log set unlocks it

let context: AudioContext | undefined;

export const hasRestSound = () => typeof AudioContext !== "undefined";

// Called from a tap. iOS interrupts the context in the background, so every unlock also resumes it
export function unlockRestSound() {
  if (!hasRestSound()) return;
  try {
    context ??= new AudioContext();
    context.resume().catch(() => {});
  } catch {
    // No sound here: the rest still counts down and vibrates
  }
}

const BEEP = { hz: 880, seconds: 0.15 };
const END_BEEP = { hz: 1320, seconds: 0.6 };

// Higher and longer at zero. Silent until the context is running, rather than playing late
export function playRestBeep(end: boolean) {
  if (context?.state !== "running") return;
  const { hz, seconds } = end ? END_BEEP : BEEP;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const from = context.currentTime;
  oscillator.frequency.value = hz;
  // Fades out, so it doesn't click
  gain.gain.setValueAtTime(0.8, from);
  gain.gain.exponentialRampToValueAtTime(0.001, from + seconds);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(from);
  oscillator.stop(from + seconds);
}
