import { useState, useEffect, useRef, useReducer } from "react";
import styled, { css } from "styled-components";
import { useSounds } from "./hooks";
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

  const handleClick = (event) => {
    event.preventDefault();
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
    <form onSubmit={handleSubmit}>
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

const initialState = {
  users: new Map(),
  user: {},
};

function reducer(state, action) {
  switch (action.type) {
    case "update_user": {
      const users = new Map(state.users);
      users.set(action.user.id, action.user.name);

      if (action.user.id === state.user.id) {
        return {
          ...state,
          users,
          user: action.user,
        };
      }

      return {
        ...state,
        users,
      };
    }
    case "login": {
      const users = new Map([...state.users, ...action.users]);

      return {
        ...state,
        users,
        user: action.user,
      };
    }
    case "add_user": {
      const users = new Map(state.users);
      users.set(action.user.id, action.user.name);

      return {
        ...state,
        users,
      };
    }
    case "remove_user": {
      const users = new Map(state.users);

      if (action.user) {
        users.delete(action.user.id);
      }

      return {
        ...state,
        users,
      };
    }
    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}

const socket = new WebSocket(process.env.REACT_APP_SOCKET_URL);

function App() {
  const { status: soundsStatus, data: sounds } = useSounds();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, users } = state;

  console.log({ user, users, socket });

  // console.log({ state });
  useEffect(() => {
    const handleUserLogin = ({ users: incomingUsers, user: incomingUser }) => {
      console.log(`[event:userlogin]`, incomingUser, incomingUsers);
      const entries = incomingUsers.map((item) => Object.values(item));
      console.log("handleUserLogin", { entries, incomingUser });
      dispatch({ type: "login", users: entries, user: incomingUser });
    };

    const handleUserJoined = ({ users: incomingUsers, user: incomingUser }) => {
      console.log(`[event:userjoined]: user: "${incomingUser?.name}"`);
      dispatch({ type: "add_user", user: incomingUser });
    };

    const handleUserUpdate = ({ user: incomingUser }) => {
      console.log(`[event:userupdated]`, incomingUser.id, incomingUser.name);
      dispatch({ type: "update_user", user: incomingUser });
    };

    const handleUserLeft = ({ user: incomingUser }) => {
      console.log(`[event:userleft]: user: "${incomingUser?.name}"`);
      dispatch({ type: "remove_user", user: incomingUser });
    };

    const handleSoundEvent = ({ user: incomingUser, sound }) => {
      console.log(
        `[event:sound] user: "${incomingUser.name}" is playing "${sound?.name}"`
      );
      playAudio(sound.audio.src);
    };

    const onOpen = () => {
      console.log(`[event:open]`);
      socket.send(
        JSON.stringify({
          type: "adduser",
          name: window.localStorage.getItem("username"),
        })
      );
    };

    const onMessage = (event) => {
      console.log(`[event:message]`);

      const data = JSON.parse(event.data);

      if (data.type === "userlogin") {
        handleUserLogin({ users: data.users, user: data.user });
      }

      if (data.type === "userjoined") {
        handleUserJoined({ users: data.users, user: data.user });
      }

      if (data.type === "userupdated") {
        handleUserUpdate({ user: data.user });
      }

      if (data.type === "sound") {
        handleSoundEvent({ user: data.user, sound: data.sound });
      }

      if (data.type === "userleft") {
        handleUserLeft({ user: data.user });
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);

    return () => {
      console.log("effect cleanup");
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage);
      socket.close();
    };
  }, []);

  const handleOnPlay = (event) => {
    const sound = sounds.find(({ id }) => id === event.id);
    socket.send(JSON.stringify({ type: "sound", sound }));
  };

  const handleChangeUser = ({ username }) => {
    window.localStorage.setItem("username", username);
    socket.send(JSON.stringify({ type: "updateuser", username }));
  };

  return (
    <Wrapper className="App">
      <Main>
        <Header>
          <Label>Connections: {users.size}</Label>
          <Separator size={24} />
          <UserForm
            value={window.localStorage.getItem("username") || user.name}
            onSubmit={handleChangeUser}
          />
        </Header>

        {/* eslint-disable-next-line jsx-a11y/no-distracting-elements */}
        <marquee>
          <ConnectedUsers>
            {Array.from(users)?.map(([id, name]) => (
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
