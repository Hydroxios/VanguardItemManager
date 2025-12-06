"use client";

import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import Image from "next/image";

interface StatusItemProps {
  label: string;
  loading: boolean;
}

const StatusItem = ({ label, loading }: StatusItemProps) => {
  return (
    <div className="flex flex-row items-center justify-between px-4 py-2 w-72">
      <span className="text-gray-200 text-sm">{label}</span>
      {loading ? (
        <Image src="/loader.gif" width={20} height={20} alt="Loading" className="w-10 h-10" />
      ) : (
        <Image src="/success.png" width={20} height={20} alt="Ready" className="w-10 h-10" />
      )}
    </div>
  );
};

const LoadingStatus = () => {
  const { loadingDefinitions } = useDefinitions();
  const { loadingProfile } = useProfile();

  const allReady = !loadingDefinitions && !loadingProfile;
  if (allReady) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1002]">
      <div className="flex flex-col items-center p-4 gap-2">
        <div className="flex flex-col items-center gap-1 bg-[rgba(20,20,30,0.6)] shadow-lg p-2 border-2 border-[rgb(138,138,138)]">
          <div className="text-white text-lg mb-1">Loading Destiny Data...</div>
          <div className="w-[80%] h-[1px] bg-gray-700"></div>
          <StatusItem label="Databases" loading={loadingDefinitions} />
          <div className="w-[90%] h-[1px] bg-gray-700"></div>
          <StatusItem label="Profile" loading={loadingProfile} />
        </div>
      </div>
    </div>
  );
};

export default LoadingStatus;


