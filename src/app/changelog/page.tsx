import type { Metadata } from "next";
import ChangelogPage from "./ChangelogPage";

export const metadata: Metadata = {
  title: "Changelog | Vanguard Item Manager",
};

// The texts follow the language chosen in the app, which only the browser knows
export default function Changelog() {
  return <ChangelogPage />;
}
