import React, {
    useEffect,
    useState,
    useRef
} from "react";

import CodeMirror from "@uiw/react-codemirror";

import { javascript }
from "@codemirror/lang-javascript";

import { oneDark }
from "@codemirror/theme-one-dark";

import ACTIONS from "../Actions";
import { toast } from "react-toastify";

const Editor = ({
    socketRef,
    roomID,
    username,
}) => {

    const [code, setCode] =
        useState("");

    // FIXED TIMER
    const typingTimer =
        useRef(null);

    // =========================
    // RECEIVE CODE
    // =========================
    useEffect(() => {

        if (!socketRef.current)
            return;

        const handleCodeChange =
            ({ code }) => {

                if (code !== null) {

                    setCode(code);

                }

            };

        const handleSyncCode =
            ({ code }) => {

                if (code !== null) {

                    setCode(code);

                }

            };

        socketRef.current.on(
            ACTIONS.CODE_CHANGE,
            handleCodeChange
        );

        socketRef.current.on(
            ACTIONS.SYNC_CODE,
            handleSyncCode
        );

        return () => {

            socketRef.current.off(
                ACTIONS.CODE_CHANGE,
                handleCodeChange
            );

            socketRef.current.off(
                ACTIONS.SYNC_CODE,
                handleSyncCode
            );

        };

    }, [socketRef]);

    // =========================
    // EDITOR CHANGE
    // =========================
    const handleEditorChange =
        (value) => {

            setCode(value);

            // SEND CODE
            socketRef.current.emit(
                ACTIONS.CODE_CHANGE,
                {
                    roomID,
                    code: value,
                }
            );

            // USER TYPING
            socketRef.current.emit(
                ACTIONS.TYPING,
                {
                    roomID,
                    username,
                }
            );

            // CLEAR OLD TIMER
            clearTimeout(
                typingTimer.current
            );

            // STOP TYPING
            typingTimer.current =
                setTimeout(() => {

                    socketRef.current.emit(
                        ACTIONS.STOP_TYPING,
                        {
                            roomID,
                        }
                    );

                }, 1000);

        };

    const [fileExt, setFileExt] = useState('js');

    const runCode = () => {
        if (fileExt === 'html') {
            try {
                const blob = new Blob([code], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                toast.success("HTML preview opened in a new tab.");
            } catch (error) {
                toast.error(`Preview Error:\n${error.message}`);
            }
            return;
        }

        try {
            // Setup simple console.log capture
            const logs = [];
            const originalLog = console.log;
            console.log = (...args) => {
                logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                originalLog(...args);
            };

            // Execute the code securely inside the browser context
            // eslint-disable-next-line no-new-func
            const func = new Function(code);
            func();

            console.log = originalLog;

            if (logs.length > 0) {
                toast.success(`Output:\n${logs.join('\n')}`, { style: { whiteSpace: 'pre-wrap' } });
            } else {
                toast.success("Code ran successfully (no output).");
            }
        } catch (error) {
            toast.error(`Execution Error:\n${error.message}`, { style: { whiteSpace: 'pre-wrap' } });
        }
    };

    const downloadCode = () => {
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `shecode.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Code downloaded as .${fileExt}`);
    };

    return (
        <>
            <div 
                className="editorToolbar" 
                style={{ 
                    position: 'absolute', 
                    top: '50px', 
                    right: '16px', 
                    zIndex: 10, 
                    display: 'flex', 
                    gap: '8px', 
                    alignItems: 'center' 
                }}
            >
                <button
                    className="runCodeBtn"
                    onClick={runCode}
                    title="Execute Javascript"
                >
                    Run Code
                </button>
                <select 
                    className="extensionSelect"
                    value={fileExt}
                    onChange={(e) => setFileExt(e.target.value)}
                    title="Select file extension"
                >
                    <option value="js">.js</option>
                    <option value="html">.html</option>
                    <option value="css">.css</option>
                    <option value="txt">.txt</option>
                    <option value="json">.json</option>
                    <option value="py">.py</option>
                </select>
                <button
                    className="downloadCodeBtn"
                    onClick={downloadCode}
                    title="Download Code"
                >
                    Download
                </button>
            </div>

            <div className="editorWrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
                <CodeMirror
                    value={code}
                    height="100%"
                    theme={oneDark}
                    extensions={[
                        javascript(),
                    ]}
                    onChange={
                        handleEditorChange
                    }
                />
            </div>
        </>
    );

};

export default Editor;