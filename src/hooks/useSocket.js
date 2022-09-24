import { useContext } from "react";
import { SocketContext } from "../context/socketContext";

/**
 * @returns {WebSocket}
 */
const useSocket = () => useContext(SocketContext);

export default useSocket;
