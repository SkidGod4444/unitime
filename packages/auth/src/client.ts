import { createAuthClient } from "better-auth/client"
import { passkeyClient } from "@better-auth/passkey/client"
import { adminClient, organizationClient, lastLoginMethodClient, emailOTPClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [ 
        passkeyClient(),
        adminClient(),
        organizationClient(),
        lastLoginMethodClient(),
        emailOTPClient()
    ] 
})