interface WeaponStatProps {
    name: string
    value: number
    bar: boolean
    max?: number // Optional max value for scaling the bar
}

const WeaponStat = ({ name, value, bar, max = 100 }: WeaponStatProps) => {

    const normalizedName = name.toLowerCase();
    const isTimeBasedStat = normalizedName === "charge time" || normalizedName === "draw time";

    return (
        <div key={name} className="flex flex-row gap-2 items-center">
            <div className="w-20 text-sm text-gray-300">{name.length > 10 ? name.slice(0, 9) + "." : name}</div>
            {bar ? (
                <progress key={name} value={value} max={(isTimeBasedStat ? 1000 : max)} className="weapon-progress" />
            ) : (
                <div className="flex-1" />
            )}
            <div className="w-10 text-right font-medium">{value}</div>
        </div>
    )
}

export default WeaponStat