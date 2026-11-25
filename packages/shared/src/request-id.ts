import { z } from "zod";

// Made by the phone for each thing the user does, and sent again with a retry, so a retry after a lost answer adds
// nothing more
export const RequestId = z.uuid();
