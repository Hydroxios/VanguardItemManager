import { lowerIsBetter, recoilDirection, StatRow } from "@/lib/helpers/item-stats";

const MASTERWORK_COLOR = "#f2c94c";
const MOD_COLOR = "#6ec6ff";

const percent = (value: number, max: number) => `${Math.max(0, Math.min(100, (value / max) * 100))}%`;

/** A bar split into what the item rolled, what its masterwork adds and what its mods add */
const SegmentedBar = ({ row }: { row: StatRow }) => {
    const masterwork = Math.max(0, row.masterwork);
    const mods = Math.max(0, row.mods);
    const base = Math.max(0, row.value - masterwork - mods);
    return (
        <div className="flex h-2 flex-1 overflow-hidden bg-white/10" aria-hidden>
            <div className="h-full bg-white" style={{ width: percent(base, row.max) }} />
            {masterwork > 0 && <div className="h-full" style={{ width: percent(masterwork, row.max), background: MASTERWORK_COLOR }} />}
            {mods > 0 && <div className="h-full" style={{ width: percent(mods, row.max), background: MOD_COLOR }} />}
        </div>
    );
};

/** Where the recoil goes: a half dial with the recoil cone drawn from its center */
const RecoilDial = ({ value }: { value: number }) => {
    const { angle, spread } = recoilDirection(value);
    const radius = 11;
    const point = (degrees: number) => {
        const radians = (degrees * Math.PI) / 180;
        return [12 + Math.sin(radians) * radius, 12 - Math.cos(radians) * radius];
    };
    const [tipX, tipY] = point(angle);
    const from = Math.max(-90, angle - spread);
    const to = Math.min(90, angle + spread);
    return (
        <div className="flex flex-1 items-center">
            <svg width="24" height="13" viewBox="0 0 24 13" aria-hidden>
                <path d="M1 12 A11 11 0 0 1 23 12 Z" fill="rgba(255,255,255,0.12)" />
                {to - from < 1
                    ? <line x1="12" y1="12" x2={tipX} y2={tipY} stroke="white" strokeWidth="1.5" />
                    : <path d={`M12 12 L${point(from).join(" ")} A${radius} ${radius} 0 0 1 ${point(to).join(" ")} Z`} fill="white" />}
            </svg>
        </div>
    );
};

const CompareDelta = ({ statHash, delta }: { statHash: number, delta: number }) => {
    if (delta === 0) return <span className="w-9 text-right text-xs text-gray-500">=</span>;
    const better = lowerIsBetter(statHash) ? delta < 0 : delta > 0;
    return (
        <span className={`w-9 text-right text-xs font-semibold tabular-nums ${better ? "text-green-400" : "text-red-400"}`}>
            {delta > 0 ? `+${delta}` : delta}
        </span>
    );
};

/** One stat line of an item tooltip */
const TooltipStatRow = ({ name, row, comparing }: { name: string, row: StatRow, comparing: boolean }) => {
    const bonusParts = [
        row.masterwork ? `masterwork ${row.masterwork > 0 ? "+" : ""}${row.masterwork}` : "",
        row.mods ? `mods ${row.mods > 0 ? "+" : ""}${row.mods}` : "",
    ].filter(Boolean);
    return (
        <div className="flex h-5 items-center gap-2" title={bonusParts.length ? `${name}: ${bonusParts.join(", ")}` : undefined}>
            <div className="w-32 shrink-0 truncate text-right text-[13px] text-gray-400">{name}</div>
            {row.display === "bar" && <SegmentedBar row={row} />}
            {row.display === "recoil" && <RecoilDial value={row.value} />}
            {row.display === "number" && <div className="flex-1" />}
            <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">{row.value}</div>
            {comparing && (row.compare !== undefined ? <CompareDelta statHash={row.statHash} delta={row.compare} /> : <span className="w-9" />)}
        </div>
    );
};

export default TooltipStatRow;
