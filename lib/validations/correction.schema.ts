import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What the employee types into the natural-language box. */
export const analyzeCorrectionSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Describe the correction in a sentence or two.")
    .max(1000, "Keep the description under 1000 characters."),
});

export type AnalyzeCorrectionInput = z.infer<typeof analyzeCorrectionSchema>;

/**
 * The structured shape the agent must return.
 *
 * docs/technical_architecture.md section 8 requires the application to validate the model's
 * output before acting on it, and that invalid output must never reach the database. This
 * schema is that gate: parsing happens at the boundary, before any rule runs.
 */
export const aiExtractionSchema = z.object({
  requested_date: z.string().regex(ISO_DATE).nullable(),
  requested_clock_in: z.iso.datetime({ offset: true }).nullable(),
  requested_clock_out: z.iso.datetime({ offset: true }).nullable(),
  employee_reason: z.string().trim().min(1),
});

export type AiExtraction = z.infer<typeof aiExtractionSchema>;

/** The reviewed values an employee confirms before the request is filed. */
export const submitCorrectionSchema = z.object({
  requested_date: z.string().regex(ISO_DATE, "Select a valid date."),
  requested_clock_in: z.iso.datetime({ offset: true }).nullable(),
  requested_clock_out: z.iso.datetime({ offset: true }).nullable(),
  employee_reason: z
    .string()
    .trim()
    .min(5, "Give a short reason for the correction."),
});

export type SubmitCorrectionInput = z.infer<typeof submitCorrectionSchema>;
