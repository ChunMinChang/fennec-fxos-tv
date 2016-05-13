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

  function sendCommand(aAction, aDetail) {
    _debug('sendCommand');
    _socket.sendMessage('command', aAction, aDetail);
  }

  return {
    connect: connect,
    disconnect: disconnect,
    sendCommand: sendCommand,
  };
};
