import { LightAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useT } from '@/lib/i18n';

const DebugInfos = ({ data } : {data: unknown}) => {
    const t = useT();

    return (
        <div>  
            <div className="absolute right-0 top-0">
                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>{t.common.copy}</button>
            </div>
            <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{fontSize: 10, textAlign: "left"}}>
                {JSON.stringify(data, null, 2)}
            </SyntaxHighlighter>
        </div>
    )

}

export default DebugInfos;