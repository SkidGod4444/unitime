import { Resend } from "resend";

// Initialise once and reuse across all routes
export const resend = new Resend(process.env.RESEND_API_KEY);
