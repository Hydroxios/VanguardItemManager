import Image from "next/image";

/** Starts the Bungie login; /api/login adds the state that protects it against CSRF. */
const LoginButton = ({ label = "Login with Bungie" }: { label?: string }) => (
  <a
    className="w-[350px] rounded-full transition-colors flex items-center justify-center bg-[#ededed] text-black gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
    href="/api/login"
  >
    <Image
      className="dark:invert"
      src="/bungie.svg"
      alt="Bungie logo"
      width={20}
      height={20}
    />
    {label}
  </a>
);

export default LoginButton;
