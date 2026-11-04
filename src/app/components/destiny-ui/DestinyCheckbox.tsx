interface DestinyCheckboxProps {
    checked: boolean
    label?: string
    /** Names the box when it has no label next to it */
    ariaLabel?: string
    onClick: () => void
}


// A real button, so the label is clickable too and the box works from the keyboard
const DestinyCheckBox = ({ checked, label, ariaLabel, onClick }: DestinyCheckboxProps) => {

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label ? undefined : ariaLabel}
            className="flex flex-row gap-3 items-center justify-center cursor-pointer outline-none group"
            onClick={onClick}
        >
            <div
                className={`w-6 h-6 bg-zinc-800 border-2 p-[3px] group-focus-visible:ring-2 group-focus-visible:ring-purple-500/50 ${checked ? "border-zinc-400" : "border-white"}`}
            >
                {checked && (
                    <div className="bg-green-400 opacity-90 w-full h-full" />
                )}
            </div>
            {label && <span className="font-thin">{label}</span>}
        </button>
    )

}

export default DestinyCheckBox
