"use client";

import Image from "next/image";
import { useT } from "@/lib/i18n";

/** Starts the Bungie login; /api/login adds the state that protects it against CSRF. */
const LoginButton = ({ label }: { label?: string }) => {
  const t = useT();
  return (
  <a
    className="w-[350px] rounded-full transition-colors flex items-center justify-center bg-[#ededed] text-black gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
    href="/api/login"
  >
    <Image
      className="dark:invert"
      src="/bungie.svg"
      alt={t.login.bungieLogoAlt}
      width={20}
      height={20}
    />
    {label ?? t.login.loginWithBungie}
  </a>
  );
};

export default LoginButton;
