import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { ChangelogEntry, Changelogs, compareVersions, CURRENT_VERSION, localizeChangelog, parseChangelog, unseenEntries } from "./changelog";
import { readChangelogs } from "./changelog-files";

const entry = (version: string, text = version): ChangelogEntry => ({ version, date: "2026-01-01", changes: [{ kind: "fix", text }] });

describe("parseChangelog", () => {
    it("reads releases, sections and changes, skipping the introduction", () => {
        const markdown = [
            "# Changelog",
            "",
            "Some introduction, with a - dash.",
            "",
            "## 1.1.0 - 2026-11-04",
            "",
            "### New",
            "",
            "- A feature",
            "- A long feature",
            "  that wraps",
            "",
            "### Fixed",
            "* A fix",
            "",
            "## [1.0.0] – 2026-10-07",
            "### Improved",
            "- Better",
        ].join("\r\n");

        expect(parseChangelog(markdown)).toEqual([
            {
                version: "1.1.0",
                date: "2026-11-04",
                changes: [
                    { kind: "feature", text: "A feature" },
                    { kind: "feature", text: "A long feature that wraps" },
                    { kind: "fix", text: "A fix" },
                ],
            },
            { version: "1.0.0", date: "2026-10-07", changes: [{ kind: "improvement", text: "Better" }] },
        ]);
    });

    it("reads the French section headings", () => {
        const markdown = "## 1.0.0 - 2026-10-07\n### Nouveau\n- a\n### Amélioré\n- b\n### Corrigé\n- c";
        expect(parseChangelog(markdown)[0].changes.map(({ kind }) => kind)).toEqual(["feature", "improvement", "fix"]);
    });

    it("rejects a malformed file, naming the file and the line", () => {
        expect(() => parseChangelog("## 1.0 - 2026-10-07", "CHANGELOG.md")).toThrow("CHANGELOG.md:1");
        expect(() => parseChangelog("## 1.0.0 - 2026-10-07\n### Removed\n- a")).toThrow(/:2: unknown section "Removed"/);
        expect(() => parseChangelog("## 1.0.0 - 2026-10-07\n- a")).toThrow(/:2: a change must be under/);
        expect(() => parseChangelog("## 1.0.0 - 2026-10-07\n### New\nloose text")).toThrow(/:3: unexpected line/);
    });
});

describe("changelog files", () => {
    const changelogs = readChangelogs();
    const shape = (entries: ChangelogEntry[]) =>
        entries.map(({ version, date, changes }) => ({ version, date, kinds: changes.map(({ kind }) => kind) }));

    it("starts with the version of package.json", () => {
        expect(changelogs.en[0].version).toBe(packageJson.version);
        expect(CURRENT_VERSION).toBe(packageJson.version);
    });

    it("lists each version once, newest first, with valid dates", () => {
        for (let i = 1; i < changelogs.en.length; i++) {
            expect(compareVersions(changelogs.en[i - 1].version, changelogs.en[i].version)).toBeGreaterThan(0);
            expect(changelogs.en[i - 1].date >= changelogs.en[i].date).toBe(true);
        }
        for (const { date } of changelogs.en) expect(Number.isNaN(Date.parse(date))).toBe(false);
    });

    it("has at least one change per release, none empty", () => {
        for (const entries of Object.values(changelogs)) {
            for (const { changes } of entries) {
                expect(changes.length).toBeGreaterThan(0);
                for (const { text } of changes) expect(text.trim()).not.toBe("");
            }
        }
    });

    it("translates every release in French, with the same changes in each section", () => {
        expect(shape(changelogs.fr)).toEqual(shape(changelogs.en));
    });
});

describe("localizeChangelog", () => {
    const changelogs: Changelogs = {
        en: [entry("1.1.0", "New"), entry("1.0.0", "Old")],
        fr: [entry("1.0.0", "Ancien")],
    };

    it("gives the translated releases, and the others in English", () => {
        expect(localizeChangelog(changelogs, "fr").map(({ changes }) => changes[0].text)).toEqual(["New", "Ancien"]);
    });

    it("gives English in a language without a changelog file", () => {
        expect(localizeChangelog(changelogs, "de")).toEqual(changelogs.en);
    });
});

describe("compareVersions", () => {
    it("compares each part as a number", () => {
        expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
        expect(compareVersions("1.0.9", "1.0.10")).toBeLessThan(0);
        expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
        expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    });
});

describe("unseenEntries", () => {
    const entries = [entry("1.2.0"), entry("1.1.0"), entry("1.0.0")];

    it("gives only the newest release to someone who never saw the changelog", () => {
        expect(unseenEntries(null, entries).map(({ version }) => version)).toEqual(["1.2.0"]);
    });

    it("gives every release newer than the one seen", () => {
        expect(unseenEntries("1.0.0", entries).map(({ version }) => version)).toEqual(["1.2.0", "1.1.0"]);
    });

    it("gives nothing once the newest release was seen", () => {
        expect(unseenEntries("1.2.0", entries)).toEqual([]);
        expect(unseenEntries("9.0.0", entries)).toEqual([]);
    });
});
