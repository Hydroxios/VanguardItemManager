"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/hooks/useSettings";

/** Puts the animations setting on <html>, where globals.css reads it */
const MotionPreference = () => {
  const { settings: { motion } } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (motion === "system") delete root.dataset.motion;
    else root.dataset.motion = motion;
  }, [motion]);

  return null;
};

export default MotionPreference;
