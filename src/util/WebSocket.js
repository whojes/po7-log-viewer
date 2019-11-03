import { whojes } from "../config/const";
import { msgType } from "../config/msgType";
import { loadingOn } from "./View";

const connectWebSocket = (connection, messageHandler, oldWebSocket, rollback) => {
  if(!(connection.ip && connection.user && connection.pwd)){
    alert("입력값을 똑바로 하세요.");
    return;
  }
  loadingOn();
  const ws = new WebSocket(whojes.wsUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({msgType: msgType.HANDSHAKE, message: connection }));
    rollback();
  }
  ws.onmessage = (message) => {
    messageHandler(message);
  }
  ws.onerror = (error) => {
    alert(`앗! 예기치 못한 에러가 발생했습니다! \n ${ error }`)
    window.location.reload();
  }
  ws.onclose = () => {
  }

  if(oldWebSocket) {
    oldWebSocket.close();
  }
  
  return ws;
}

export {
  connectWebSocket,
}