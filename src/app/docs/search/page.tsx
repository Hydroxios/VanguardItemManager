import type { Metadata } from "next";
import SearchDocs from "./SearchDocs";

export const metadata: Metadata = {
  title: "Search Docs | Vanguard Item Manager",
};

// The texts follow the language chosen in the app, which only the browser knows
export default function SearchDocsPage() {
  return <SearchDocs />;
}
