// Dev-only constants. NODE_ENV === "development" is only true locally —
// Vercel always sets NODE_ENV=production, so these bypasses never fire in prod.

export const isDev = process.env.NODE_ENV === "development";
export const DEV_USER_ID = "70360df8-4888-4401-9aa0-b2b15da354b0";
