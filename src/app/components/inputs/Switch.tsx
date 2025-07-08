import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => {
  return (
    <div className="flex items-center gap-2 absolute top-[75] left-[10] z-[100]">
      <button
        type="button"
        className={`w-12 h-6 flex items-center rounded-full border border-[rgb(138,138,138)] shadow-[0_0_10px_rgba(255,106,0,0.3),0_0_20px_rgba(30,144,255,0.2),inset_0_0_8px_rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-200 focus:outline-none ${checked ? 'bg-[rgba(255,106,0,0.8)]' : 'bg-[rgba(10,10,20,0.8)]'} hover:bg-opacity-90`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span
          className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
      
      {label && <span className="text-white text-sm">{label}</span>}
    </div>
  );
};

export default Switch; 