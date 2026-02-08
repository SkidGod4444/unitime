import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import { prisma } from "@unitime/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
    admin,
    emailOTP,
    haveIBeenPwned,
    lastLoginMethod,
    organization,
} from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    "unitime://*",
    // Development mode - Expo's exp:// scheme
    ...(process.env.NODE_ENV === "development"
      ? [
          "exp://", // Trust all Expo URLs (prefix matching)
          "exp://**", // Trust all Expo URLs (wildcard matching)
        ]
      : []),
  ],
  advanced: {
    cookiePrefix: "@unitime_auth",
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // void sendEmail({
      //   to: user.email,
      //   subject: "Verify your email address",
      //   text: `Click the link to verify your email: ${url}`,
      // });
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    // requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      // void sendEmail({
      //   to: user.email,
      //   subject: "Reset your password",
      //   text: `Click the link to reset your password: ${url}`,
      // });
    },
    onPasswordReset: async ({ user }, request) => {
      // your logic here
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
    freshAge: 60 * 5, // 5 minutes
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  rateLimit: {
    enabled: true,
    window: 5, // time window in seconds
    max: 100, // max requests in the window
  },
  plugins: [
    expo(),
    passkey(),
    admin(),
    organization(),
    lastLoginMethod(),
    haveIBeenPwned(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          // Send the OTP for sign in
        } else if (type === "email-verification") {
          // Send the OTP for email verification
        } else {
          // Send the OTP for password reset
        }
      },
    }),
  ],
});
