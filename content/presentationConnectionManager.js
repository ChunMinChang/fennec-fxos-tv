"use strict";

var PresentationConnectionManager = function() {

  // Hold the presentation's connection
  let _session = null;
  // Keep track the message's sequence
  let _seq = 0;
  // Detect whether or not the session is disconnected by ourselves
  let _closeIsExpected = false;
  // Store listeners registering to receive messages
  let _listeners = [];

  function _debug(aMsg) {
    console.log('# [PresentationConnectionManager] ' + aMsg);
  }

  function _clearAllListeners() {
    _listeners = [];
  }

  function _reset() {
    _debug('_reset');
    _session = null;
    _seq = 0;
    _closeIsExpected = false;
    _clearAllListeners();
  }

  function _messageHandler(aMessage, aEvent) {
    console.log(aMessage);
    _debug('_messageHandler: ' + aMessage.type);
    // switch(aMessage.type) {
    //   case 'ack':
    //     break;
    //   default:
    //     break;
    // }
    for (let i in _listeners) {
      if (_listeners[i][aMessage.type] &&
          typeof _listeners[i][aMessage.type] === 'function') {
        _listeners[i][aMessage.type](aMessage, aEvent);
      }
    }
  }

  function _onMessage(aEvent) {
    _debug('_onMessage >> Got message: ' + aEvent.data);
    let rawdata = '[' + aEvent.data.replace('}{', '},{') + ']';
    let messages = JSON.parse(rawdata);
    messages.forEach(message => {
      _messageHandler(message, aEvent);
    });
  }

  function _onStatechange(aEvent) {
    _debug('_onStatechange >> state: ' + _session.state);

    if (!_session) {
      _debug('there is no session!');
      return;
    }

    if (_session.state == "connected") {
      _debug('Build session successfully!');
      return;
    }

    // If state is terminated or closed
    if (!_closeIsExpected) {
      _debug('Unexpectedly lose session!');
    }
    _reset();
  }

  function start(aWindow, aUrl, aTarget) {
    _debug('start');
    return new Promise(function(aResolve, aReject) {
      let request = new aWindow.PresentationRequest(aUrl);
      request.startWithDevice(aTarget.id).then(function(aSession) {
        if (!aSession.id || aSession.state != "connected") {
          aReject('The session is wrong!');
        }
        // Store the session
        _session = aSession;
        _session.onmessage = _onMessage;
        _session.onstatechange = _onStatechange;
        aResolve();
      }).catch(function(aError) {
        aReject(error);
      });
    });
  }

  function sendCommand(aCommand, aData) {
    _debug('sendCommand');

    if (!_session) {
      _debug('  >> there is no used session!');
      return;
    }

    let msg = {
      'type': aCommand,
      'seq': ++_seq,
    };

    for (var i in aData) {
      msg[i] = aData[i];
    }
    _session.send(JSON.stringify(msg));
  }

  // TODO: close semantics is not ready now(Bug 1210340).
  function close() {
    _debug('close');
    return;
  }

  function terminate() {
    _debug('terminate');
    if (!_session) {
      _debug('  >> there is no used session!');
      return;
    }
    // Indicate that we want to end this session
    _closeIsExpected = true;
    // Terminate session
    _session.terminate();
  }

  function registerListener(aListener) {
    _debug('registerListener');
    _listeners.push(aListener);
  }

  function unregisterListener(aListener) {
    _debug('unregisterListener');
    let index = _listeners.indexOf(aListener);
    if (index > -1) {
      _debug('delete a listener');
      _listeners.splice(index, 1);
    }
  }

  function init(aWindow) {
    _debug('init');
    // Check the preferences and permissions for presentation API
    if (!aWindow.navigator.presentation ||
        !aWindow.PresentationRequest) {
      _debug('  >> navigator.presentation or PresentationRequest should be available');
      return;
    }
  }

  function uninit() {
    _debug('uninit');
    _reset();
  }

  return {
    init: init,
    uninit: uninit,
    start: start,
    sendCommand: sendCommand,
    terminate: terminate,
    // close: close, // TODO: Uncomment the line after close semantic is ready
    registerListener: registerListener,
    unregisterListener: unregisterListener,
  };
};
