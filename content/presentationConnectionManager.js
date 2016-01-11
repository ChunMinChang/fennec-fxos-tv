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

  function _removeObserverForPresentationDevicePrompt() {
    Debugger.log('# PresentationConnectionManager._removeObserverForPresentationDevicePrompt');
    let prompt = Cc["@mozilla.org/presentation-device/prompt;1"].getService(Ci.nsIObserver);
    if (!prompt) {
      Debugger.log('  >> No available presentationDevicePrompt XPCOM');
      return;
    }
    // presentation-device-prompt XPCOM object will remove
    // "presentation-select-device" signal listener after receiving it.
    // Services.obs.removeObserver(prompt, "presentation-select-device", false);
  }

  function _presentationPrompt(deviceId) {
    Debugger.log('# PresentationConnectionManager._presentationPrompt');
    return new Promise(function(resolve, reject) {
      // Get presentation-device-prompt XPCOM object
      let prompt = Cc["@mozilla.org/presentation-device/prompt;1"].getService(Ci.nsIObserver);
      if (!prompt) {
        reject('No available presentationDevicePrompt XPCOM');
      }
      // Add listener for "presentation-select-device" signal to
      // the presentation-device-prompt XPCOM object everytime
      // before building a session because the
      // presentation-device-prompt XPCOM object will remove
      // "presentation-select-device" signal listener after receiving it.
      Services.obs.addObserver(prompt, "presentation-select-device", false);

      let _presObserver = {
        observe: function (subject, topic, data) {
          if (topic == "presentation-prompt-ready") {
            Services.obs.removeObserver(this, "presentation-prompt-ready", false);
            resolve();
          } else {
            reject('Receive unexpected notification');
          }
        }
      };

      // The presentation-device-prompt XPCOM will fire a
      // "presentation-prompt-ready" signal upon it receive
      // the "presentation-select-device" signal
      Services.obs.addObserver(_presObserver, "presentation-prompt-ready", false);
      Services.obs.notifyObservers(null, "presentation-select-device", deviceId);
    });
  }

  function _startSession(window, url) {
    Debugger.log('# PresentationConnectionManager._startSession');
    return new Promise(function(resolve, reject) {
      let presentationRequest = new window.PresentationRequest(url);
      presentationRequest.start().then(function(session){
        if (session.id && session.state == "connected") {
          _presentation.session = session;
          _presentation.session.onmessage = _presentationOnMessage;
          _presentation.session.onstatechange = _presentationOnStatechange;
          resolve();
        } else {
          reject('session.id or session.state is wrong!');
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
    return new Promise(function(resolve, reject) {
      _presentationPrompt(target.id).then(function(result) {
        return _startSession(window, url);
      }).then(function(result) {
        resolve(result);
      }).catch(function(error){
        reject(error);
      });
    });
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
    _removeObserverForPresentationDevicePrompt();
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
