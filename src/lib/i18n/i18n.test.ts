import { afterEach, describe, expect, it, vi } from "vitest";
import { getDictionary, getLocale, hasInterfaceTranslation, LOCALE_STORAGE_KEY } from ".";
import { en } from "./en";
import { fr } from "./fr";

// Every path to a text, with "()" for the ones that take parameters
const shape = (value: unknown, path = ""): string[] => typeof value === "object" && value !== null
    ? Object.entries(value).flatMap(([key, child]) => shape(child, `${path}.${key}`))
    : [`${path}${typeof value === "function" ? "()" : ""}`];

const stubStorage = (locale: string | null) => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: (key: string) => key === LOCALE_STORAGE_KEY ? locale : null });
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("dictionaries", () => {
    it("translates every text of the English dictionary in French", () => {
        expect(shape(fr)).toEqual(shape(en));
    });

    it("has no empty text", () => {
        const texts = (value: unknown): unknown[] => typeof value === "object" && value !== null ? Object.values(value).flatMap(texts) : [value];
        expect(texts(fr).filter((text) => text === "")).toEqual([]);
    });
});

describe("getLocale", () => {
    it("is English on the server", () => {
        expect(getLocale()).toBe("en");
    });

    it("reads the stored language", () => {
        stubStorage("fr");
        expect(getLocale()).toBe("fr");
    });

    it("falls back to English for an unknown or missing language", () => {
        stubStorage("xx");
        expect(getLocale()).toBe("en");
        stubStorage(null);
        expect(getLocale()).toBe("en");
    });
});

describe("getDictionary", () => {
    it("gives the texts of a translated language", () => {
        expect(getDictionary("fr")).toBe(fr);
        expect(hasInterfaceTranslation("fr")).toBe(true);
    });

    it("shows a language without interface translation in English", () => {
        expect(getDictionary("ja")).toBe(en);
        expect(hasInterfaceTranslation("ja")).toBe(false);
    });

    it("follows the stored language by default", () => {
        stubStorage("fr");
        expect(getDictionary().settings.title).toBe("Paramètres");
    });
});
