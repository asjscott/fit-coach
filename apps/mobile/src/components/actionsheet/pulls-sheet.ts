// Whether a drag on the sheet's content pulls the sheet down: a mostly downward one, once any list in it is back at
// the top. Until then the same drag is the list scrolling back up (#59, R26)
export const pullsSheet = ({ dx, dy }: { dx: number; dy: number }, listScrollY: number) =>
  listScrollY <= 0 && dy > 6 && Math.abs(dy) > Math.abs(dx);
