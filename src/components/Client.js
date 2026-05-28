import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username }) => {
  return (
    <div className="client">
      <Avatar
        name={username}
        size="38"
        round="10px"
        className="userAvatar"
        textSizeRatio={2.2}
      />
      <span className="userName">{username}</span>
    </div>
  );
};

export default Client;
