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
    
    // For time-based stats, we invert the color logic (lower is better, adapts to max)
    const getTimeBasedColor = (val: number) => {
        const percent = (val / 1000) * 100;
        if (percent <= 20) return "#4ade80"; // Green for low values (fast charging/drawing)
        if (percent <= 50) return "#facc15"; // Yellow for medium values
        return "#ef4444"; // Red for high values (slow charging/drawing)
    };

    return (
        <div key={name} className="flex flex-row gap-2 items-center">
            <div className="w-20 text-sm text-gray-300">{name.length > 10 ? name.slice(0, 9) + "." : name}</div>
            {bar ? (
                <progress key={name} value={value} max={(isTimeBasedStat ? 1000 : max)} className="weapon-progress"/>
            ) : (
                <div className="flex-1" />
            )}
            <div className="w-10 text-right font-medium">{value}</div>
        </div>
    )
}

export default WeaponStat