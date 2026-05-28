import React, {
    useRef,
    useEffect,
    useState
} from 'react';

import ACTIONS from '../Actions';

const Whiteboard = ({
    socketRef,
    roomID
}) => {

    const canvasRef = useRef(null);

    const drawing = useRef(false);

    const current = useRef({
        x: 0,
        y: 0,
    });

    const [color, setColor] = useState('#a855f7');
    const [thickness, setThickness] = useState(2.5);
    const [isEraser, setIsEraser] = useState(false);

    const colorRef = useRef(color);
    const thicknessRef = useRef(thickness);
    const isEraserRef = useRef(isEraser);

    useEffect(() => {
        colorRef.current = color;
        thicknessRef.current = thickness;
        isEraserRef.current = isEraser;
    }, [color, thickness, isEraser]);

    // STORE ALL LINES
    const linesRef = useRef([]);

    useEffect(() => {

        if (!socketRef.current) return;

        const canvas =
            canvasRef.current;

        const ctx =
            canvas.getContext('2d');

        // DRAW SINGLE LINE
        const drawLine = (
            x0,
            y0,
            x1,
            y1,
            strokeColor,
            strokeWidth,
            lineIsEraser
        ) => {

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);

            if (lineIsEraser) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = strokeWidth || 10;
                ctx.strokeStyle = "rgba(0,0,0,1)";
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = strokeColor || '#a855f7';
                ctx.lineWidth = strokeWidth || 2.5;
            }

            ctx.stroke();
            ctx.closePath();
            
            // Reset to default for other draw calls
            ctx.globalCompositeOperation = 'source-over';

        };

        // REDRAW ENTIRE BOARD
        const redrawBoard = () => {

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            linesRef.current.forEach((line) => {

                drawLine(
                    line.x0,
                    line.y0,
                    line.x1,
                    line.y1,
                    line.color,
                    line.thickness,
                    line.isEraser
                );

            });

        };

        // RESIZE
        const resizeCanvas = () => {

            const oldLines =
                [...linesRef.current];

            canvas.width =
                canvas.offsetWidth;

            canvas.height =
                canvas.offsetHeight;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            linesRef.current =
                oldLines;

            redrawBoard();

        };

        resizeCanvas();

        window.addEventListener(
            'resize',
            resizeCanvas
        );

        // RECEIVE REALTIME DRAW
        const handleDraw = ({
            x0,
            y0,
            x1,
            y1,
            color,
            thickness,
            isEraser,
        }) => {

            linesRef.current.push({
                x0,
                y0,
                x1,
                y1,
                color,
                thickness,
                isEraser,
            });

            drawLine(
                x0,
                y0,
                x1,
                y1,
                color,
                thickness,
                isEraser
            );

        };

        socketRef.current.on(
            ACTIONS.DRAW,
            handleDraw
        );

        // LOAD OLD BOARD
        socketRef.current.on(
            'load-board',
            (lines) => {

                linesRef.current = lines;

                redrawBoard();

            }
        );

        // CLEAR BOARD (from another user)
        const handleClearBoard = () => {
            linesRef.current = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        socketRef.current.on(ACTIONS.CLEAR_BOARD, handleClearBoard);

        // START DRAW
        const startDraw = (e) => {

            drawing.current = true;

            current.current = {
                x: e.offsetX,
                y: e.offsetY,
            };

        };

        // DRAW
        const draw = (e) => {

            if (!drawing.current)
                return;

            const line = {
                x0: current.current.x,
                y0: current.current.y,
                x1: e.offsetX,
                y1: e.offsetY,
                color: colorRef.current,
                thickness: thicknessRef.current,
                isEraser: isEraserRef.current
            };

            // SAVE LOCALLY
            linesRef.current.push(line);

            // DRAW LOCALLY
            drawLine(
                line.x0,
                line.y0,
                line.x1,
                line.y1,
                line.color,
                line.thickness,
                line.isEraser
            );

            // SEND TO SERVER
            socketRef.current.emit(
                ACTIONS.DRAW,
                {
                    roomID,
                    ...line,
                }
            );

            current.current = {
                x: e.offsetX,
                y: e.offsetY,
            };

        };

        // STOP DRAW
        const stopDraw = () => {

            drawing.current = false;

        };

        canvas.addEventListener(
            'mousedown',
            startDraw
        );

        canvas.addEventListener(
            'mousemove',
            draw
        );

        window.addEventListener(
            'mouseup',
            stopDraw
        );

        canvas.addEventListener(
            'mouseleave',
            stopDraw
        );

        return () => {

            socketRef.current.off(
                ACTIONS.DRAW,
                handleDraw
            );

            socketRef.current.off(
                'load-board'
            );

            socketRef.current.off(
                ACTIONS.CLEAR_BOARD,
                handleClearBoard
            );

            canvas.removeEventListener(
                'mousedown',
                startDraw
            );

            canvas.removeEventListener(
                'mousemove',
                draw
            );

            window.removeEventListener(
                'mouseup',
                stopDraw
            );

            canvas.removeEventListener(
                'mouseleave',
                stopDraw
            );

            window.removeEventListener(
                'resize',
                resizeCanvas
            );

        };

    }, [socketRef, roomID]);

    const clearBoard = () => {
        if (!socketRef.current) return;
        socketRef.current.emit(ACTIONS.CLEAR_BOARD, { roomID });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        linesRef.current = [];
    };

    return (
        // The wrapper fills the flex parent via CSS (.whiteboardInner).
        // The canvas is positioned absolutely so offsetWidth/offsetHeight
        // always reflect the true rendered size — fixes the "nothing draws" bug.
        <div className="whiteboardInner">
            
            <div className="whiteboardToolbar">
                <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)} 
                    className="colorPicker"
                    title="Brush Color"
                    disabled={isEraser}
                    style={{ opacity: isEraser ? 0.5 : 1 }}
                />
                <input 
                    type="range" 
                    min="1" max="20" 
                    value={thickness} 
                    onChange={(e) => setThickness(Number(e.target.value))} 
                    className="thicknessSlider"
                    title="Brush Thickness"
                />
                <button
                    className={`toolBtn ${isEraser ? 'activeTool' : ''}`}
                    onClick={() => setIsEraser(prev => !prev)}
                    title="Toggle Eraser"
                >
                    {isEraser ? 'Eraser On' : 'Eraser Off'}
                </button>
            </div>

            <canvas
                ref={canvasRef}
                className="whiteboardCanvas"
            />
            <button
                id="clearBoardBtn"
                className="clearBoardBtn"
                onClick={clearBoard}
                title="Clear the whiteboard"
            >
                Clear Board
            </button>
        </div>
    );

};

export default Whiteboard;