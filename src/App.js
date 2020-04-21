import React, { useState, useEffect, useRef } from "react";
import styled, { css } from "styled-components";
import { useSounds, useSocket, useLocalStorage } from "./hooks";
import SoundItem from "./components/SoundItem";
import { playAudio } from "./helpers";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  margin: 0 auto;
  padding: 8px;

  @media (min-width: 1024px) {
    padding: 16px;
  }
`;

const SoundItems = styled.div`
  display: grid;
  grid-gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));

  @media (min-width: 1024px) {
    grid-gap: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
`;

const Separator = styled.div`
  flex: 0 0 ${({ size }) => size || 0}px;
`;

const Label = styled.div`
  display: inline-block;
  padding: 0.4em 0.6em;
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: white;
  border-radius: 4px;
  background-color: #e6bb43;
  user-select: none;
`;

const Main = styled.div`
  flex: 1 1 auto;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding: 12px 0;
  width: 100%;

  > a {
    font-size: 12px;
    &:not(:last-child) {
      margin-right: 1em;
    }
  }
`;

const UsernameInput = styled.input`
  font-family: monospace, monospace;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font-size: 16px;
  cursor: pointer;
  outline: none;

  &:focus {
    background-color: #e6bb43;
    cursor: text;
  }
`;

const ConnectedUsers = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ConnectedUsersItem = styled.li`
  display: inline-block;
  border-bottom: 3px dotted #e6bb43;
  pointer-events: none;
  user-select: none;
  color: #e6bb43;

  ${(props) =>
    props.yourself &&
    css`
      color: gray;
      border-color: gray;
    `}

  &:not(:last-child) {
    margin-right: 1em;
  }
`;

function UserForm({ value, onSubmit }) {
  const maxLength = 46;
  const inputRef = useRef(null);
  const [disabled, setDisabled] = useState(true);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    setUsername(value);
  }, [value]);

  const isValid =
    username &&
    username.length > 0 &&
    username.length <= maxLength &&
    typeof username === "string";

  const handleClick = () => {
    setDisabled(false);
    setTimeout(() => {
      inputRef.current.focus();
    }, 1);
  };

  const handleBlur = () => {
    setDisabled(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) {
      return;
    }
    if (onSubmit) {
      onSubmit({ username: username.trim().substring(0, maxLength) });
    }
    handleBlur();
  };

  return (
    <form onSubmit={handleSubmit} onClick={handleClick}>
      <label htmlFor="username">@</label>
      <UsernameInput
        ref={inputRef}
        id="username"
        maxLength={maxLength}
        onChange={(event) => setUsername(event.target.value)}
        size={username?.length}
        type="text"
        value={username || ""}
        disabled={disabled}
        onBlur={handleBlur}
      />
      {disabled && (
        <button type="button" onClick={handleClick} title="Edit Username">
          <span role="img" aria-label="">
            🖍
          </span>
        </button>
      )}
      {!disabled && (
        <button disabled={!isValid} type="submit">
          <span role="img" aria-label="">
            ✔️
          </span>
        </button>
      )}
    </form>
  );
}

function App() {
  const socket = useSocket();
  const { status: soundsStatus, data: sounds } = useSounds();
  const [numUsers, setNumUsers] = useState(0);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState({});
  const [localUsername, setLocalUsername] = useLocalStorage("username");

  useEffect(() => {
    const handleUserLogin = ({ numUsers, users, user }) => {
      console.log(`[user login]`, user);
      setNumUsers(numUsers);
      setUsers(users);
      setUser(user);
    };
    const handleUserJoined = ({ numUsers, users, user }) => {
      console.log(
        `[user joined]: numUsers: "${numUsers}", user: "${user?.name}"`
      );
      setNumUsers(numUsers);
      setUsers(users);
    };
    const handleUserLeft = ({ numUsers, users, user }) => {
      console.log(
        `[user left]: numUsers: "${numUsers}", user: "${user?.name}"`
      );
      setNumUsers(numUsers);
      setUsers(users);
    };
    const handleUsersUpdate = ({ users }) => {
      console.log(`[users updated]`);
      setUsers(users);
    };
    const handleUserUpdate = ({ user }) => {
      console.log(`[user updated]`);
      setUser(user);
    };

    const handleSoundEvent = ({ user, sound }) => {
      console.log(`[sound] user: "${user?.name}" is playing "${sound?.name}"`);
      playAudio(sound.audio.src);
    };

    socket.emit("add user", { name: localUsername });

    socket.on("user login", handleUserLogin);
    socket.on("user joined", handleUserJoined);
    socket.on("user left", handleUserLeft);
    socket.on("users updated", handleUsersUpdate);
    socket.on("user updated", handleUserUpdate);
    socket.on("sound", handleSoundEvent);

    return () => {
      socket.off("user login", handleUserLogin);
      socket.off("user joined", handleUserJoined);
      socket.off("users updated", handleUsersUpdate);
      socket.off("user updated", handleUserUpdate);
      socket.off("user left", handleUserLeft);
    };
  }, [socket, localUsername]);

  const handleOnPlay = (event) => {
    const sound = sounds.find(({ id }) => id === event.id);
    socket.emit("sound", { sound, user });
  };

  const handleChangeUser = ({ username }) => {
    setLocalUsername(username);
    socket.emit("update user", { id: user.id, username });
  };

  return (
    <Wrapper className="App">
      <Main>
        <Header>
          <Label>Connections: {numUsers}</Label>
          <Separator size={24} />
          <UserForm
            value={localUsername || user.name}
            onSubmit={handleChangeUser}
          />
        </Header>

        {/* eslint-disable-next-line jsx-a11y/no-distracting-elements */}
        <marquee>
          <ConnectedUsers>
            {users.map(({ id, name }) => (
              <ConnectedUsersItem yourself={id === user.id} key={id}>
                <span role="img" aria-label="">
                  🥳
                </span>
                {id === user.id ? `It's you` : name}
              </ConnectedUsersItem>
            ))}
          </ConnectedUsers>
        </marquee>

        <h2>Sound Effects</h2>
        {soundsStatus === "success" && (
          <SoundItems>
            {sounds.map(({ id, name, audio, image }) => (
              <SoundItem
                key={id}
                id={id}
                name={name}
                audio={audio}
                image={image}
                onPlay={handleOnPlay}
              />
            ))}
          </SoundItems>
        )}
        {soundsStatus === "loading" && <p>Loading Sounds...</p>}
        {soundsStatus === "error" && (
          <p>
            Error: Something went wrong while loading the sounds. Please try
            again.
          </p>
        )}
      </Main>
      <Footer>
        <a
          href="https://github.com/paulborm/soundboard"
          target="_blank"
          rel="noopener noreferrer"
        >
          Github
        </a>
      </Footer>
    </Wrapper>
  );
}

export default App;
