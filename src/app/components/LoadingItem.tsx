const LoadingItem = () => {
    return (
        <div className="w-16 h-16 border-2 border-white relative flex items-center justify-center" style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)" }}>
            <div className="w-8 h-8 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
        </div>
    )
}

export default LoadingItem;