const PowerHelperButton = ({onClick}: {onClick: () => void}) => {

    return (
        <button
        onClick={onClick}
        className="flex items-center justify-center gap-2 h-[45px] w-[150px] p-2 rounded bg-opacity-80 bg-[rgba(10,10,20,0.8)] border border-[rgb(138,138,138)] shadow-[0_0_10px_rgba(255,106,0,0.3),0_0_20px_rgba(30,144,255,0.2),inset_0_0_8px_rgba(255,255,255,0.15)] backdrop-blur-sm z-50 hover:bg-opacity-30 transition-all cursor-pointer"
        aria-label="Power Helper"
        >
            <img src={"./power.svg"} height={49} width={24}/>
            Power Helper
        </button>
    )
}

export default PowerHelperButton;