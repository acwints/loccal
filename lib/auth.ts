import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Missing Google OAuth environment variables.");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: String(token.refreshToken ?? "")
      })
    });

    const refreshedTokens = (await response.json()) as GoogleTokenResponse;

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken
    };
  } catch {
    return {
      ...token,
      error: "RefreshAccessTokenError"
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly"
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: (account.expires_at ?? 0) * 1000,
          refreshToken: account.refresh_token ?? token.refreshToken
        };
      }

      if (Date.now() < Number(token.accessTokenExpires ?? 0)) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
      }
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    }
  }
};
