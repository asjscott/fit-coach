import { z } from "zod";

// A rating from 1 to 5: sleep and energy from poor to great, soreness from none to very
export const CheckInRating = z.number().int().min(1).max(5);

// How the user feels today, before training (GLOSSARY.md)
export const CheckIn = z.object({ sleep: CheckInRating, energy: CheckInRating, soreness: CheckInRating });
export type CheckIn = z.infer<typeof CheckIn>;

// A local date on the phone, as "2026-11-09"
export const LocalDate = z.iso.date();

// A Check-in as it's uploaded, by the local date it's for. checkedInAt is when the user made it: a later one for the same
// date replaces it on the server, and an earlier one arriving late doesn't
export const CheckInUpload = CheckIn.extend({ checkedInAt: z.iso.datetime() });
export type CheckInUpload = z.infer<typeof CheckInUpload>;

// The user's Check-in for a date, as stored on the server and queued on the phone
export const DatedCheckIn = CheckInUpload.extend({ date: LocalDate });
export type DatedCheckIn = z.infer<typeof DatedCheckIn>;
