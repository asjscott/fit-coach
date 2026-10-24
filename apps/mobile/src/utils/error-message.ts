// A caught error as a line fit to show the user
export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");
