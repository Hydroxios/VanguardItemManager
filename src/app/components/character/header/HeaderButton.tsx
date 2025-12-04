interface HeaderButtonProps {
    children: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    width?: number;
    className?: string;
}

const HeaderButton = ({ children, active = false, onClick, width = 64, className = '' }: HeaderButtonProps) => {
    return (
        <button className={`flex flex-row items-center justify-center px-2 h-[70px] text-white hover:text-white transition-all duration-300 hover:backdrop-blur-sm hover:bg-gray-300/10 ${className} ${active ? 'border-b-2 border-white' : ''}`} style={{ width: `${width}px` }} onClick={onClick}>
            {children}
        </button>
    )
}

export default HeaderButton;