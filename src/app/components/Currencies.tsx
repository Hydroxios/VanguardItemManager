interface CurrenciesProps {
    currencies: any[]
}

const Currencies = ({currencies} :CurrenciesProps) => {
    return (
        <div className="currencies flex flex-row">
            {currencies.map(c => (
                <div key={c.item.hash} className="flex flex-row gap-1 items-center">
                    <img height={24} width={24} src={"https://www.bungie.net" + c.item.displayProperties.icon}/>
                    <p>{c.quantity.toLocaleString()}</p>
                </div>
            ))}
        </div>
    )
}

export default Currencies