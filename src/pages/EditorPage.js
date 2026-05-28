import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';

import Client    from '../components/Client';
import Editor    from '../components/Editor';
import Whiteboard from '../components/Whiteboard';
import { initSocket } from '../Socket';
import ACTIONS from '../Actions';

const EditorPage = () => {
  const socketRef  = useRef(null);
  const location   = useLocation();
  const navigate   = useNavigate();
  const { roomID } = useParams();

  const [clients, setClients]         = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser]   = useState('');
  const [activeTab, setActiveTab]     = useState('editor'); // 'editor' | 'board'

  // ── Socket Init ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      socketRef.current = initSocket();
      if (!socketRef.current) return;

      socketRef.current.on('connect', () => {
        setIsConnected(true);
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket error:', err);
        toast.error('Connection failed — check your server.');
        navigate('/');
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username }) => {
        if (username !== location.state?.username) {
          toast.success(`${username} joined the room`);
        }
        setClients(clients);
      });

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketID, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => prev.filter((c) => c.socketID !== socketID));
      });

      socketRef.current.on(ACTIONS.TYPING,      ({ username }) => setTypingUser(`${username} is typing…`));
      socketRef.current.on(ACTIONS.STOP_TYPING, ()            => setTypingUser(''));
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.TYPING);
        socketRef.current.off(ACTIONS.STOP_TYPING);
        socketRef.current.disconnect();
      }
    };
  }, [roomID, location.state, navigate]);

  // ── Emit JOIN after children mount ────────────────────────────
  useEffect(() => {
    if (isConnected && socketRef.current) {
      socketRef.current.emit(ACTIONS.JOIN, {
        roomID,
        username: location.state?.username,
      });
    }
  }, [isConnected, roomID, location.state]);

  // ── Guards ────────────────────────────────────────────────────
  if (!location.state) return <Navigate to="/" />;

  if (!isConnected) {
    return (
      <div className="loadingScreen">
        <div className="loadingSpinner" />
        <p className="loadingText">Connecting to room…</p>
      </div>
    );
  }

  // ── Actions ───────────────────────────────────────────────────
  const copyRoomID = async () => {
    try {
      await navigator.clipboard.writeText(roomID);
      toast.success('Room ID copied!');
    } catch {
      toast.error('Failed to copy Room ID');
    }
  };

  const leaveRoom = () => {
    socketRef.current?.disconnect();
    toast.success('You left the room');
    navigate('/');
  };

  const username = location.state?.username ?? 'User';

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="mainWrap">

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="aside">

        {/* Header */}
        <div className="asideHeader">
          <div className="logo">
            <img src="/shecode.png" alt="SheCode" className="logoimage" />
            <span className="logoText">SheCode</span>
          </div>
          <div className="roomBadge">
            <span>Room</span>
            {roomID}
          </div>
        </div>

        {/* Connected users label */}
        <div className="connectedLabel">
          Connected — {clients.length} {clients.length === 1 ? 'user' : 'users'}
        </div>

        {/* Client list */}
        <div className="asideinner">
          {clients.map((client) => (
            <Client key={client.socketID} username={client.username} />
          ))}
        </div>

        {/* Footer buttons */}
        <div className="asideFooter">
          <button id="copyRoomBtn" className="btn copyBtn" onClick={copyRoomID}>
            Copy Room ID
          </button>
          <button id="leaveRoomBtn" className="btn leaveBtn" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>

      </aside>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div className="editorWrap">

        {/* Top bar with tabs */}
        <div className="editorTopBar">
          <div className="editorTabGroup">
            <button
              className={`editorTab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <span className="tabDot" style={{ background: '#c084fc' }} />
              Code Editor
            </button>
            <button
              className={`editorTab ${activeTab === 'board' ? 'active' : ''}`}
              onClick={() => setActiveTab('board')}
            >
              <span className="tabDot" style={{ background: '#22d3ee' }} />
              Whiteboard
            </button>
          </div>

          <div className="statusChip">
            <span className="statusDot" />
            Live · {username}
          </div>
        </div>

        {/* Typing indicator */}
        {typingUser && (
          <div className="typingIndicator">
            <div className="typingDots">
              <span /><span /><span />
            </div>
            {typingUser}
          </div>
        )}

        {/* Panels — desktop shows both side-by-side */}
        <div className="panelsRow">

          {/* Editor panel */}
          <div className={`editorContainer${activeTab === 'board' ? ' hideOnMobile' : ''}`}>
            <Editor socketRef={socketRef} roomID={roomID} username={username} />
          </div>

          {/* Whiteboard panel */}
          <div className={`whiteboardContainer${activeTab === 'editor' ? ' hideOnMobile' : ''}`}>
            <div className="panelHeader">
              <div className="panelTitle">
                <svg className="panelIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Whiteboard
              </div>
              <span className="panelBadge">Shared Canvas</span>
            </div>
            <Whiteboard socketRef={socketRef} roomID={roomID} />
          </div>

        </div>


      </div>

    </div>
  );
};

export default EditorPage;