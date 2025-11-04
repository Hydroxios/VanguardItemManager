interface CurrenciesProps {
  currencies: any[];
}

const Currencies = ({ currencies }: CurrenciesProps) => {
  return (
    <div className="w-fit hover:backdrop-blur-sm hover:bg-gray-300/10 px-2 py-1 transition-all duration-300">
      <div className="flex justify-end items-center border-b border-gray-400 pb-1 mb-1">
        <h3 className="text-white text-xs uppercase tracking-wider">Currencies</h3>
      </div>
      <div className="flex gap-2 justify-center">
        {currencies.map((c) => (
          <div key={c.item.hash} className="flex flex-row gap-1 items-center">
            <img
              height={24}
              width={24}
              src={"https://www.bungie.net" + c.item.displayProperties.icon}
            />
            <p>{c.quantity.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Currencies;
