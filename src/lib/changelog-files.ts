import { readFileSync } from "fs";
import { join } from "path";
import { CHANGELOG_LOCALES, Changelogs, parseChangelog } from "./changelog";

/** CHANGELOG.md for English, CHANGELOG.<locale>.md for its translations, at the root of the repository */
export const changelogFileName = (locale: string) => locale === "en" ? "CHANGELOG.md" : `CHANGELOG.${locale}.md`;

/**
 * Reads and parses every changelog file. Server only (it reads the files from disk): the root layout calls it while
 * the app is built, so the changelog shown always matches the deployed code.
 */
export const readChangelogs = (root = process.cwd()): Changelogs =>
  Object.fromEntries(CHANGELOG_LOCALES.map((locale) => {
    const fileName = changelogFileName(locale);
    return [locale, parseChangelog(readFileSync(join(root, fileName), "utf8"), fileName)];
  })) as Changelogs;
