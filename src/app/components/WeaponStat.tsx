interface WeaponStatProps {
    name: string
    value: number
    bar: boolean
}

const WeaponStat = ({name, value, bar}: WeaponStatProps) => {
    // Function to determine color based on stat value
    const getProgressColor = (val: number) => {
        if (val >= 80) return "#4ade80"; // Green for high values
        if (val >= 50) return "#facc15"; // Yellow for medium values
        return "#ef4444"; // Red for low values
    };

    // For time-based stats (charge time, draw time), lower values are better
    const normalizedName = name.toLowerCase();
    const isTimeBasedStat = normalizedName === "charge time" || normalizedName === "draw time";
    const displayValue = isTimeBasedStat ? `${value}ms` : value;
    
    // For time-based stats, we invert the color logic (lower is better)
    const getTimeBasedColor = (val: number) => {
        if (val <= 20) return "#4ade80"; // Green for low values (fast charging/drawing)
        if (val <= 50) return "#facc15"; // Yellow for medium values
        return "#ef4444"; // Red for high values (slow charging/drawing)
    };

    return (
        <div key={name} className="flex flex-row gap-2 items-center mb-1">
            <div className="w-20 text-sm text-gray-300">{name.length > 10 ? name.slice(0, 9) + "." : name}</div>
            {bar ? (
                <div className="flex-1 h-[10px] bg-gray-800 rounded-sm overflow-hidden">
                    <div 
                        className="h-full rounded-sm transition-all duration-300"
                        style={{
                            width: `${value}%`,
                            backgroundColor: isTimeBasedStat ? getTimeBasedColor(value) : getProgressColor(value)
                        }}
                    />
                </div>
            ) : (
                <div className="flex-1" />
            )}
            <div className="w-12 text-right font-medium">{displayValue}</div>
        </div>
    )
}

export default WeaponStat