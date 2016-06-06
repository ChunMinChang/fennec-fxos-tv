"use strict";

var PresentationConnectionManager = function() {

  var _presentation = {
    // hold the presentation's connection
    session: null,
    // keep track the message sequence
    seq: 0,
    // detect whether or not the session is disconnected by ourselves
    sessionCloseExpected: false,
  };

  function _reset() {
    Debugger.log('# PresentationConnectionManager._reset');
    _presentation.sessionCloseExpected = false;
    _presentation.session = null;
    _presentation.seq = 0;
  }

  function _messageHandler(msg) {
    Debugger.log('# PresentationConnectionManager._messageHandler: ' + msg.type);
    switch(msg.type) {
      case 'ack':
        if (msg.error) {
          Debugger.log('  >> ack error: ' + msg.error);
        }
        _disconnect(true);
        break;
      default:
        break;
    }
  }

  function _presentationOnMessage(evt) {
    Debugger.log('# PresentationConnectionManager._presentationOnMessage');
    Debugger.log(evt);
    Debugger.log('  >> Got message:' + evt.data);
    var rawdata = '[' + evt.data.replace('}{', '},{') + ']';
    var messages = JSON.parse(rawdata);
    messages.forEach(message => {
      _messageHandler(message);
    });
  }

  function _presentationOnStatechange(evt) {
    Debugger.log('# PresentationConnectionManager._presentationOnStatechange');
    Debugger.log(evt);
    Debugger.log('  >> state: ' + _presentation.session.state);

    if (_presentation.session && _presentation.session.state !== "connected") {
      if (!_presentation.sessionCloseExpected) {
        // The session is closed by server
        Debugger.log('The session unexpectedly lose connection!' );
      }
      _reset();
    }
  }

  function _startSession(window, url, id) {
    Debugger.log('# PresentationConnectionManager._startSession');
    return new Promise(function(resolve, reject) {
      let presentationRequest = new window.PresentationRequest(url);
      presentationRequest.startWithDevice(id).then(function(session) {

        function setSession() {
          _presentation.session = session;
          _presentation.session.onmessage = _presentationOnMessage;
          _presentation.session.onstatechange = _presentationOnStatechange;
          // new state-change callbacks for presentation api
          _presentation.session.onconnect = _presentationOnStatechange;
          _presentation.session.onclose = _presentationOnStatechange;
          _presentation.session.onterminate = _presentationOnStatechange;
        }

        if (!session.id) {
          reject('no session.id!');
          return;
        }

        if (session.state == 'connected') {
          setSession();
          resolve();
        } else if(session.state == 'connecting') {
          session.onconnect = function() {
            setSession();
            resolve();
          }
        } else {
          reject('session.state is wrong!');
        }
      }).catch(function(error) {
        reject(error);
      });
    });
  }

  function sendCommand(command, data) {
    Debugger.log('# PresentationConnectionManager.sendCommand');
    var msg = {
      'type': command,
      'seq': ++_presentation.seq
    };

    for (var i in data) {
      msg[i] = data[i];
    }
    _presentation.session.send(JSON.stringify(msg));
  }

  function _disconnect(terminate) {
    Debugger.log('# PresentationConnectionManager.disconnect: ' + terminate);
    if (_presentation.session) {
      _presentation.sessionCloseExpected = true;
      (terminate)? _presentation.session.terminate() : _presentation.session.close();
      // _presentation.session will be set to null once
      // _presentation.session.state is changed to 'terminated' or 'closed'
      if (!_presentation.session.onmessage) {
        _presentation.session.onmessage = _presentationOnMessage;
      }
    }
  }

  // TODO: close semantics is not ready now(Bug 1210340).
  // Uncomment the line after close semantic is ready
  function close() {
    Debugger.log('# PresentationConnectionManager.close');
    // _disconnect(false);
    return;
  }

  function terminate() {
    Debugger.log('# PresentationConnectionManager.terminate');
    _disconnect(true);
  }

  function connect(window, url, target) {
    Debugger.log('# PresentationConnectionManager.connect');
    return _startSession(window, url, target.id);
  }

  function init(window) {
    Debugger.log('# PresentationConnectionManager.init');

    // Check the preferences and permissions for presentation API
    if (!window.navigator.presentation ||
        !window.PresentationRequest) {
      Debugger.log('  >> navigator.presentation or PresentationRequest should be available');
      return;
    }
  }

  function uninit() {
    Debugger.log('# PresentationConnectionManager.uninit');
    // _removeObserverForPresentationDevicePrompt();
  }

  return {
    init: init,
    uninit: uninit,
    connect: connect,
    sendCommand: sendCommand,
    terminate: terminate,
    close: close
  };
};
