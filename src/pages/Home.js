import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate  = useNavigate();
  const [roomID, setRoomID]     = useState('');
  const [username, setUsername] = useState('');

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidV4();
    setRoomID(id);
    toast.success('New room created — paste the ID to invite others!');
  };

  const joinRoom = () => {
    if (!roomID || !username) {
      toast.error('Room ID and username are required');
      return;
    }
    navigate(`/editor/${roomID}`, { state: { username } });
  };

  const handleInputEnter = (e) => {
    if (e.code === 'Enter') joinRoom();
  };

  return (
    <div className="homepageWrapper">
      <div className="formWrapper">

        {/* Logo + Brand */}
        <img src="/shecode.png" alt="SheCode Logo" className="homePageLogo" />

        <div className="homeBrand">
          <h1>SheCode Editor</h1>
          <p>Real-time collaborative coding &amp; whiteboard</p>
        </div>

        {/* Inputs */}
        <div className="inputGroup">
          <label className="mainLabel">Room ID</label>
          <input
            id="roomId"
            type="text"
            className="inputBox"
            placeholder="Enter or create a room ID"
            value={roomID}
            onChange={(e) => setRoomID(e.target.value)}
            onKeyUp={handleInputEnter}
            spellCheck={false}
          />

          <label className="mainLabel">Username</label>
          <input
            id="username"
            type="text"
            className="inputBox"
            placeholder="Enter your display name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleInputEnter}
            spellCheck={false}
            maxLength={24}
          />

          <button id="joinBtn" className="btn joinbtn" onClick={joinRoom}>
            Join Workspace
          </button>

          <span className="createInfo">
            No room yet?&nbsp;
            <button id="createRoomBtn" className="createNewBtn" onClick={createNewRoom} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
              Create new room
            </button>
          </span>
        </div>

      </div>

      <footer>
        <h4>Built with 💜 by&nbsp;<a href="https://github.com/darkiratk7284" target="_blank" rel="noreferrer">Darkirat</a></h4>
      </footer>
    </div>
  );
};

export default Home;
