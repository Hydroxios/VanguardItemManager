interface CurrenciesProps {
    currencies: any[]
}

const Currencies = ({currencies} :CurrenciesProps) => {
    return (
        <div className="p-[2px] border-2 border-[rgb(138,138,138)]">
            <div className="flex items-center justify-center h-[40px] px-2 gap-4 bg-opacity-45 bg-[#5a5a5a] backdrop-blur-sm z-50 hover:bg-opacity-30 transition-all">
                {currencies.map(c => (
                    <div key={c.item.hash} className="flex flex-row gap-1 items-center">
                        <img height={24} width={24} src={"https://www.bungie.net" + c.item.displayProperties.icon}/>
                        <p>{c.quantity.toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Currencies