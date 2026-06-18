import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  fetchOptions: {
    credentials: "include",
  },
});

export type AuthSession = NonNullable<ReturnType<typeof authClient.useSession>["data"]>;
