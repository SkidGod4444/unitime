import { betterAuth } from "better-auth";
import { passkey } from "@better-auth/passkey"
import { admin, organization, lastLoginMethod, haveIBeenPwned, emailOTP } from "better-auth/plugins"

export const auth = betterAuth({
  advanced: {
    cookiePrefix: "@unitime_auth"
},
  emailVerification: {
    sendVerificationEmail: async ( { user, url, token }, request) => {
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
    sendResetPassword: async ({user, url, token}, request) => {
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
    updateAge: 60 * 60 * 24 // 1 day (every 1 day the session expiration is updated)
},
rateLimit: {
  enabled: true,
  window: 5, // time window in seconds
  max: 100, // max requests in the window
},
plugins: [ 
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
}) 
], 
});