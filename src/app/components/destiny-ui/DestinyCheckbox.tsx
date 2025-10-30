interface DestinyCheckboxProps {
    checked: boolean
    label?: string
    onClick: () => void
}


const DestinyCheckBox = ({ checked, label, onClick }: DestinyCheckboxProps) => {

    return (
        <div className="flex flex-row gap-3 items-center justify-center">
            <div 
                className={`w-6 h-6 bg-zinc-800 border border-2 p-[3px] cursor-pointer ${checked ? "border-zinc-400" : "border-white"}`}
                onClick={onClick}
            >
                {checked && (
                    <div className="bg-green-400 opacity-90 w-full h-full" />
                )}
            </div>
            <div>
                <span className="font-thin">{label}</span>
            </div>
        </div>
    )

}

export default DestinyCheckBox