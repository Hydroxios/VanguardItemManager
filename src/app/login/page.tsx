"use client"

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LoginButton from "../components/LoginButton";
import Loader from "../components/Loader";
import { getDictionary, useT } from "@/lib/i18n";

/** Explains why /api/token refused the authorization code. */
const loginErrorMessage = (status: number, data: { error?: string, error_description?: string }) => {
  const t = getDictionary();
  if (data.error === "invalid_state") return t.login.invalidState;
  if (data.error === "invalid_grant") return t.login.invalidGrant;
  if (status >= 500) return t.login.bungieDown;
  return data.error_description ?? data.error ?? t.login.failed;
}

const Login = () => {
  const [error, setError] = useState<string>();
  const t = useT();
  // An authorization code only works once: never send it twice (React runs effects twice in development)
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const urlParam = new URLSearchParams(window.location.search)
    const code = urlParam.get("code")
    if (!code) {
      window.location.replace("/");
      return;
    }

    // The code is exchanged server side so the client secret never reaches the browser
    fetch("/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, state: urlParam.get("state") }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        // The route stored the refresh token in an httpOnly cookie; the home page gets an access token from it.
        // Replace, so going back doesn't land on a used code
        if (data.access_token) {
          window.location.replace("/");
        } else {
          console.error("Failed to retrieve access token:", data);
          setError(loginErrorMessage(response.status, data));
        }
      })
      .catch((error) => {
        console.error("Error fetching access token:", error);
        setError(getDictionary().login.serverUnreachable);
      });
  }, []);

  return (
    <div className="flex items-center justify-center text-center min-h-screen p-8">
      <div className="flex flex-col justify-center items-center gap-5">
        <Image src="/vanguard.svg" height={128} width={128} alt={t.common.logoAlt} loading="eager" />
        {error ? (
          <>
            <p className="max-w-md text-red-400">{error}</p>
            <LoginButton label={t.login.logInAgain} />
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">{t.login.backToHome}</Link>
          </>
        ) : (
          <div className="flex items-center gap-3 text-gray-200">
            <Loader size={40} />
            {t.login.loggingIn}
          </div>
        )}
      </div>
    </div>
  );
};
export default Login;
