"use strict";

var AuthSocket = function() {

  let _socket = new Socket();

  function _debug(aMsg) {
    console.log('# [AuthSocket] ' + aMsg);
  }

  function connect(aSettings) {
    _debug('connect');
    return _socket.connect(aSettings);
  }

  function disconnect() {
    _debug('disconnect');
    _socket.disconnect();
  }

  function sendMessage(type, action, detail) {
    _debug('sendMessage');
    _socket.sendMessage(type, action, detail);
  }

  return {
    connect: connect,
    disconnect: disconnect,
    sendMessage: sendMessage,
  };
};
