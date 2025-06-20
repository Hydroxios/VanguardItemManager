const DebugInfos = ({ data } : {data: any}) => {

    return (
        <div>  
            <div className="absolute right-0 top-0">
                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>Copy</button>
            </div>
            <pre style={{color: 'white', fontSize: 10}}>{JSON.stringify(data, null, 2)}</pre>
        </div>
    )

}

export default DebugInfos;