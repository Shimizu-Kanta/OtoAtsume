import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { getAllowedAdminEmails, isAllowedAdminEmail } from "@/lib/auth/allowed";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const devAdminEmail = process.env.DEV_ADMIN_EMAIL ?? getAllowedAdminEmails()[0];
const devLoginEnabled = process.env.NODE_ENV === "development" && Boolean(devAdminEmail);

const providers: NextAuthOptions["providers"] = [
  ...(googleConfigured
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
        })
      ]
    : []),
  ...(devLoginEnabled
    ? [
        CredentialsProvider({
          id: "dev-admin",
          name: "Development Admin",
          credentials: {},
          async authorize() {
            if (!isAllowedAdminEmail(devAdminEmail)) {
              return null;
            }

            return {
              id: "dev-admin",
              email: devAdminEmail,
              name: "Development Admin"
            };
          }
        })
      ]
    : [])
];

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  secret: process.env.AUTH_SECRET,
  providers,
  callbacks: {
    async signIn({ user }) {
      return isAllowedAdminEmail(user.email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
      }

      return session;
    }
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login"
  }
};
