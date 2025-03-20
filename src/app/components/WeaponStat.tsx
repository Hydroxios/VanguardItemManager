interface WeaponStatProps {
    name :string
    value :number
    bar: boolean
}

const WeaponStat = ({name, value, bar}:WeaponStatProps) => {
    return (
        <div key={name} className="flex flex-row gap-2 items-center justify-end">
            <div>{name.length > 7 ? name.slice(0, 6) + "." : name}</div>
            {bar && <progress value={value} max={100} style={{height: "15px"}}/>}
            <div>{value}</div>
        </div>
    )
}

export default WeaponStat