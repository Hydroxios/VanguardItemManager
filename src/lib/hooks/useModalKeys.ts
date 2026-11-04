"use client";

import { useEffect } from "react";

/**
 * Escape closes the modal, unless `canClose` is false (a save running). Every key stops at the document while it's
 * open, before the page's shortcuts on window (Escape leaving the character, "z" opening the vault, "s" the search...)
 * act behind the modal.
 */
const useModalKeys = (onClose: () => void, { enabled = true, canClose = true }: { enabled?: boolean, canClose?: boolean } = {}) => {
    useEffect(() => {
        if (!enabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === "Escape" && canClose) onClose();
        };
        const handleKeyUp = (e: KeyboardEvent) => e.stopPropagation();
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
        };
    }, [enabled, canClose, onClose]);
};

export default useModalKeys;
