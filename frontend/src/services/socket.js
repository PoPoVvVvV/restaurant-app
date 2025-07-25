import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_API_URL.replace("/api", ""); // On retire /api de l'URL
const socket = io(URL);

export default socket;