"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import AppView from "./components/AppView";
import { refreshToken } from "@/lib/bungie";
export default function Home() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (localStorage.getItem("lastUpdate")) {
      const now = Date.now();
      const lastUpdate = new Date(
        Number(localStorage.getItem("lastUpdate"))
      ).getTime();
      console.log(now - lastUpdate);
      if (now - lastUpdate > 3600 * 1000) {
        refreshToken(localStorage.getItem("rtoken") as string).then(() => {
          window.location.reload();
        });
      }
    }
    setToken(storedToken);
  }, []);

  return (
    <div className="flex items-center justify-center text-center min-h-screen p-8 ">
      {!token ? (
        <div className="flex flex-col justify-center items-center gap-5">
          <img src="./vim.png" height={128} width={128} />
          <h1 className="text-3xl sm:text-4xl">Vanguard Item Manager</h1>
          <p>A Custom Destiny Item Manager !</p>
          <div>
            <a
              className="w-[350px] rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
              href={
                "https://www.bungie.net/en/OAuth/Authorize?client_id=" +
                (process.env.NODE_ENV === "production" ? "46066" : "45124") +
                "&response_type=code"
              }
              rel="noopener noreferrer"
            >
              <Image
                className="dark:invert"
                src="/bungie.svg"
                alt="Bungie logo"
                width={20}
                height={20}
              />
              Login with Bungie
            </a>
          </div>
        </div>
      ) : (
        <AppView token={token} />
      )}
    </div>
  );
}
