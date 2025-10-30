"use client";

import { useProfile } from "@/lib/hooks/useProfile";
import { useEffect, useState } from "react";


const RefreshButton = () => {

  const { refresh, refreshing } = useProfile()


  const handleRefresh = async () => {
    await refresh()
    console.log("refreshed")
  };

  return (
    <div className="p-[2px] border-2 border-[rgb(138,138,138)] h-[48px] w-[48px]">
      <button
        onClick={async () => await handleRefresh()}
        className="flex items-center justify-center h-[40px] w-[40px] bg-opacity-45 bg-[#5a5a5a] backdrop-blur-sm z-50 hover:bg-opacity-30 transition-all"
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
          className={`${refreshing ? 'animate-spin' : ''} text-white`}
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      </button>
    </div>
  );
};

export default RefreshButton;
