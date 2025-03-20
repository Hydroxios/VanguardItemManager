"use client";

import { useState } from "react";


interface RefreshButtonProps{
    onClick: () => Promise<void>;
}

const RefreshButton = ({onClick}:RefreshButtonProps) => {
  const [isRotating, setIsRotating] = useState(false);

  const handleRefresh = async () => {
    setIsRotating(true);
    await onClick();
    console.log("refreshed")
    setIsRotating(false);
  };

  return (
    <button
      onClick={async () => await handleRefresh()}
      className="flex items-center justify-center h-[45px] w-[45px] p-2 rounded bg-opacity-80 bg-[rgba(10,10,20,0.8)] border border-[rgb(138,138,138)] shadow-[0_0_10px_rgba(255,106,0,0.3),0_0_20px_rgba(30,144,255,0.2),inset_0_0_8px_rgba(255,255,255,0.15)] backdrop-blur-sm z-50 hover:bg-opacity-90 transition-all"
      aria-label="Refresh"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={`${isRotating ? 'animate-spin' : ''} text-white`}
      >
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
      </svg>
    </button>
  );
};

export default RefreshButton;
