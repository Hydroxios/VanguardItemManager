interface WeaponStatProps {
    name: string
    value: number
    bar: boolean
    max?: number // Optional max value for scaling the bar
}

const WeaponStat = ({name, value, bar, max = 100}: WeaponStatProps) => {
    // Function to determine color based on stat value (now adapts to max)
    const getProgressColor = (val: number) => {
        const percent = (val / max) * 100;
        if (percent >= 80) return "#4ade80"; // Green for high values
        if (percent >= 50) return "#facc15"; // Yellow for medium values
        return "#ef4444"; // Red for low values
    };

    // For time-based stats (charge time, draw time), lower values are better
    const normalizedName = name.toLowerCase();
    const isTimeBasedStat = normalizedName === "charge time" || normalizedName === "draw time";
    const displayValue = isTimeBasedStat ? `${value}ms` : value;
    
    // For time-based stats, we invert the color logic (lower is better, adapts to max)
    const getTimeBasedColor = (val: number) => {
        const percent = (val / max) * 100;
        if (percent <= 20) return "#4ade80"; // Green for low values (fast charging/drawing)
        if (percent <= 50) return "#facc15"; // Yellow for medium values
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
                            width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
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