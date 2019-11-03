
const msgType = {
  HANDSHAKE: 1,
  SHOWFILELIST: 2,
  FILEREAD: 3,
  FILETAIL: 4,
  FILETAILKILL: 5,
  INSPECTPOHOME: 6,
  LOGFILELIST: 7,
}

const status = {
  SUCCESS: true,
  FAIL: false,
}

module.exports.msgType = msgType;
module.exports.status = status;