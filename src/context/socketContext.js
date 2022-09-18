import { createContext } from "react";

export const SocketContext = createContext();

const socket = new WebSocket(process.env.REACT_APP_SOCKET_URL);

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
