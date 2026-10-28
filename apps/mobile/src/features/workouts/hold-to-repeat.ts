// Holding a stepper's − or +: one step at once, then 200 ms to the next, each wait a fifth shorter than the last,
// down to 50 ms (20 steps a second). 30 reps takes about 2 seconds of holding

const FIRST_WAIT = 200;
const SHORTER = 0.8;
const SHORTEST_WAIT = 50;

// Steps now, then repeats faster and faster until the returned release is called
export function startRepeating(step: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  let wait = FIRST_WAIT;
  const next = () => {
    step();
    timer = setTimeout(next, wait);
    wait = Math.max(SHORTEST_WAIT, Math.round(wait * SHORTER));
  };
  next();
  return () => clearTimeout(timer);
}
