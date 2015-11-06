"use strict";

/*
 * Images
 * ==================================
 */
 const ICON_HDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAWCAYAAAAxSueLAAAAAXNSR0IArs4c6QAAAOdJREFUSA3tlj0KwkAQhd8LqUQLD6EnsPMI4hkSiEX8KS30BNrYiiBBPYN4BUt7vYSgtjpOlHQjGHCtss2ws7PvzX7NLINOtw9gCpGyRjeLvKnwyKfIRAB3Rmn7+hACE1+NKul+kyx072YFUSypj+dG3lYtzGwuObMFxpzA7PICo80lZ7bAmBOYXf5XjAyj+JKNGbuf32R1fl09Icd4T9LfqFoqqv/ysc5c5T5O5zDqtYHHTBHXvjYnTxQO18l8a935aJYVB9GgCe/e0r9KA8K6mldBlChQNDirwFFrDyR3q+V8n92z4hNcNDP6qelDfAAAAABJRU5ErkJggg==";
 const ICON_XHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAeCAYAAABE4bxTAAAAAXNSR0IArs4c6QAAAUtJREFUWAntl7tKxEAUhs85SWFjsz6Bha0KYuEFLCx8g1ia9QKSp8gj2CyKi5dtfQ8RFcQV7CwstPNSWiXHfxZcdiHkCMKOCzMQksxP5nz5MgMTTveyeSrLcyWaJSLG4aMpCj+QSCqkegaYOVD4gnECuMcAFlFVB/MvmmOJQdI30zk56l+PknBrZx+Ceo1llIV/UysAWZaCoWDIMmDlYQ4FQ5YBKw9zKBiyDFh5mENjZ4ixfSxB7WXrWmFLhZm7FYGXLsciUazb0OOgfjbaPmDcf1mXmJs+io9XTXMyN3ezzVK1hS869bdX4/dIJDttty7qxonqQpfd390+Li6sdJT1C/Qz6Jq0nhnKmV5F+GAi1rR9fHgzlFXcmIYGn8nzPH5+eVslKpaxApaQTcNcg4kbOBfo+8CAnzg/YcVcw8jVxvraZZIkxeA4ddff5klO7Te5Hm4AAAAASUVORK5CYII=";
 const ICON_XXHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAtCAYAAADlVJiFAAAAAXNSR0IArs4c6QAAAf1JREFUaAXtms1KQkEUx88ZfYCgwha1CVr0AbWolvkEPUGFiB+oiyCC3Lp1FYSUaCYSPUPr3AUREaQEtWrjQl8guvd0pkVIKc29QpxbMyDemXvmzP+c34wDziBwiaVyW0hunggWuBrSbQEsDiK0CFWxUT2+wHgyu+0SnQcwkKGSFeKOcgnyQy0C+oKADhQAzQdU/1DZeklxYIFdU0MD0zGFB71t1Mo4qF1qWyyRoa/aNLE/WWxgQcNqiVliQjJgp6IQEMYyLDHjVAkxtMSEgDCWYYkZp0qIoSUmBISxDEvMOFVCDC0xISCMZVhixqkSYmiJCQFhLMMSM06VEEMc9PewEG0jydBT0RnJg8zODgeGbZna/KvSJ5tKIRT9u5DZUx/Xhu5ub+5XVtefEGiOZU7wJ6i/lPoM+gGU2tdn0DJTblX9wwx4PpKNJTO7CHhIRL+yFhGRLzbQXuO0fOSFj+fAtPN4KhslF854wFkvg3m2RXjmOxuJevXkymtfX1n/GGgmsqhAZZjeo9dBf7RHbKNSaZyeWvITlPbvi1i/MJ6SmEjnNh0XEuxsgymO9b83fkbocpKavNvU6tXSJU/BbzcBjH2x4ciB9Q9WKBTUS6ez7LxhlNvXgCjC37w34iSPNM71V673WHGXhff4ucP753UYQ81KpdQaNRj291neAeiAdCFRHoGDAAAAAElFTkSuQmCC";

/*
 * XPCOM modules
 * ==================================
 */
 const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");
Cu.import('resource://gre/modules/PresentationDeviceInfoManager.jsm');


// An example of how to create a string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
});

// An example of how to import a helper module.
XPCOMUtils.defineLazyGetter(this, "Helper", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/helper.js", sandbox);
  return sandbox["Helper"];
});


/*
 * Utils
 * ==================================
 */
function DEBUG_LOG(msg) {
  console.log(msg);
}

// function GET_UNIQUE_ID() {
//   return Date.now();
// }

function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}

// For Debug
// ----------------------
var gDiscoveryMenuId = null;

function discoveryDevices(win) {
  DEBUG_LOG('# discoveryDevices');
  win.navigator.mozPresentationDeviceInfo.getAll()
  .then(function(devices) {
    DEBUG_LOG('-*- discoveryDevices >> mozPresentationDeviceInfo.getAll() >> successfully!');

    if (devices === undefined || !devices.length) {
      DEBUG_LOG('  >> no device!');
      return;
    }

    DEBUG_LOG('  >> we get: ');
    for (var i in devices) {
      DEBUG_LOG(devices[i]);
    }

    PresentationDevices.setList(devices);
    DEBUG_LOG(PresentationDevices.getList());

  }, function(error) {
    DEBUG_LOG('-*- discoveryDevices >> mozPresentationDeviceInfo.getAll() >> fail!');
    DEBUG_LOG(error);
  });

  win.NativeWindow.toast.show('Discovery presentaion devices', "short");
}



/*
 * Core Functions
 * ==================================
 */
// PresentationDevices
// ----------------------
const PresentationDevices = (function () {
  DEBUG_LOG('# [PresentationDevices] Immediately invoked!');
  // Private Basic class for presentation device's infomation
  function DeviceInfo(device) {
    this.id = device.id || 'unidentified';
    this.name = device.name || 'unidentified';
    this.type = device.type || 'unidentified';
    this.castVideoEnabled = true;
    this.castPageEnabled = true;
    this.pinPageEnabled = true;
    this.remoteControlEnabled = true;
  }

  // To save all information of the presentation devices discovered
  var _list = [];

  function setList(devices) {
    DEBUG_LOG('# [PresentationDevices] setList');
    _list = devices.map(function(dev) {
      var info = new DeviceInfo(dev);
      return info;
    });
  }

  function getList() {
    DEBUG_LOG('# [PresentationDevices] getList');
    return _list;
  }

  function addDevice(device) {
    DEBUG_LOG('# [PresentationDevices] addDevice');
    var found = _list.find(function(dev) {
      return dev.id == device.id;
    });

    if (!found) {
      _list.push(new DeviceInfo(device));
    }
    // For Debug
    else {
      DEBUG_LOG('  >> device alreadt exist!');
    }
  }

  function updateDevice(device) {
    DEBUG_LOG('# [PresentationDevices] updateDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list[index] = new DeviceInfo(device);
    }
    // For Debug
    else {
       DEBUG_LOG('  >> device doesn\'t exist!');
    }
  }

  function removeDevice(device) {
    DEBUG_LOG('# [PresentationDevices] removeDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list.splice(index, 1);
    }
    // For Debug
    else {
       DEBUG_LOG('  >> device doesn\'t exist!');
    }
  }

  return {
    setList: setList,
    getList: getList,
    add: addDevice,
    update: updateDevice,
    remove: removeDevice
  };

})();


// PresentationDeviceManager
// ----------------------
// function PresentationDeviceManager() {}
//
// PresentationDeviceManager.prototype = {
//
//   deviceAvailable: function() {
//     return PresentationDevices.getList().length > 0;
//   },
//
//   init: function(window) {
//     DEBUG_LOG('# PresentationDeviceManager.init');
//
//     if (!window.navigator.mozPresentationDeviceInfo) {
//       DEBUG_LOG('  >> You need to open the preference of Presentation!');
//       return;
//     }
//
//     window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', this);
//
//     window.navigator.mozPresentationDeviceInfo.getAll()
//     .then(function(devices) {
//       DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> successfully!');
//
//       if (devices === undefined || !devices.length) {
//         DEBUG_LOG('  >> no device!');
//         return;
//       }
//
//       // Add these devices into list
//       PresentationDevices.setList(devices);
//       DEBUG_LOG(PresentationDevices.getList());
//
//       // Initialize CastingManager for this window if it doesn't exist
//       initCastingManagerForWindow(window);
//
//     }, function(error) {
//       DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> fail!');
//       DEBUG_LOG(error);
//     });
//   },
//
//   uninit: function(window) {
//     DEBUG_LOG('# PresentationDeviceManager.uninit');
//     window.navigator.mozPresentationDeviceInfo.removeEventListener('devicechange', this);
//   },
//
//   handleEvent: function(evt) {
//     DEBUG_LOG('# PresentationDeviceManager.handleEvent: ' + evt.detail.type);
//     switch (evt.detail.type) {
//       case 'add':
//         PresentationDevices.add(evt.detail.deviceInfo);
//         // If this is the first device, then we need to
//         // initialize CastingManager for this window
//         if (PresentationDevices.getList().length == 1) {
//           // evt.currentTarget is window.PresentationDeviceInfoManager itself,
//           //  (loaded by PresentationDeviceInfoManager.jsm)
//           // but we can get window by 'evt.currentTarget.ownerGlobal'
//           initCastingManagerForWindow(evt.currentTarget.ownerGlobal);
//         }
//         break;
//
//       case 'update':
//         PresentationDevices.update(evt.detail.deviceInfo);
//         break;
//
//       case 'remove':
//         PresentationDevices.remove(evt.detail.deviceInfo);
//         // If the device list is empty now, then CastingManager is no longer
//         // needed for this window
//         if (!PresentationDevices.getList().length) {
//           uninitCastingManagerForWindow(evt.currentTarget.ownerGlobal);
//         }
//         break;
//
//       default:
//         DEBUG_LOG('!!!!! Unexpected error: No event handler for this type');
//         break;
//     }
//   },
//
// };

// PresentationDeviceManager
// ----------------------
var PresentationDeviceManager = function() {

  function deviceAvailable() {
    DEBUG_LOG('# PresentationDeviceManager.deviceAvailable');
    var available = false;
    var devs = PresentationDevices.getList();
    for (var i = 0 ; i < devs.length ; i ++) {
      available |= devs[i].castVideoEnabled |
                   devs[i].castPageEnabled |
                   devs[i].pinPageEnabled |
                   devs[i].remoteControlEnabled;
      if (available) {
        return available;
      }
    }
    return available;
  }

  function _handleEvent(evt) {
    DEBUG_LOG('# PresentationDeviceManager._handleEvent: ' + evt.detail.type);
    DEBUG_LOG(evt);
    switch (evt.detail.type) {
      case 'add':
        PresentationDevices.add(evt.detail.deviceInfo);
        // If this is the first device, then we need to
        // initialize CastingManager for this window
        if (PresentationDevices.getList().length == 1) {
          // evt.currentTarget is window.PresentationDeviceInfoManager itself,
          // (loaded by PresentationDeviceInfoManager.jsm)
          // but we can get window by 'evt.currentTarget.ownerGlobal'
          initCastingManagerForWindow(evt.currentTarget.ownerGlobal);
        }
        break;

      case 'update':
        PresentationDevices.update(evt.detail.deviceInfo);
        break;

      case 'remove':
        PresentationDevices.remove(evt.detail.deviceInfo);
        // If the device list is empty now, then CastingManager is no longer
        // needed for this window
        if (!PresentationDevices.getList().length) {
          uninitCastingManagerForWindow(evt.currentTarget.ownerGlobal);
        }
        break;

      default:
        DEBUG_LOG('!!!!! Unexpected error: No event handler for this type');
        break;
    }
  }

  function init(window) {
    DEBUG_LOG('# PresentationDeviceManager.init');

    if (!window.navigator.mozPresentationDeviceInfo) {
      DEBUG_LOG('  >> mozPresentationDeviceInfo should be available');
      return;
    }

    // Add event listener for devicechange
    window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', _handleEvent);

    // Load avaliable devices into list
    window.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {
      DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> successfully!');

      if (devices === undefined || !devices.length) {
        DEBUG_LOG('  >> no device!');
        return;
      }

      // Add these devices into list
      PresentationDevices.setList(devices);
      DEBUG_LOG(PresentationDevices.getList());

      // Initialize CastingManager for this window if it doesn't exist
      initCastingManagerForWindow(window);

    }, function(error) {
      DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> fail!');
      DEBUG_LOG(error);
    });
  }

  function uninit(window) {
    DEBUG_LOG('# PresentationDeviceManager.uninit');
    window.navigator.mozPresentationDeviceInfo.removeEventListener('devicechange', _handleEvent);
  }

  return {
    init: init,
    uninit: uninit,
    deviceAvailable: deviceAvailable
  };
};


// PresentationConnectionManager
// ----------------------
var PresentationConnectionManager = function() {

  var _presentation = {
    session: null,
    sessionCloseExpected: false,
    seq: 0,
  };

  function _reset() {
    DEBUG_LOG('# PresentationConnectionManager._reset');
    _presentation.sessionCloseExpected = false;
    _presentation.session = null;
    _presentation.seq = 0;
  }

  function _presentationOnMessage(evt) {
    DEBUG_LOG('# PresentationConnectionManager._presentationOnMessage');
    DEBUG_LOG(evt);
    DEBUG_LOG(evt.data);
  }

  function _presentationOnStatechange(evt) {
    DEBUG_LOG('# PresentationConnectionManager._presentationOnStatechange');
    DEBUG_LOG(evt);
    // If the session is terminated by server, then we need to...
    if (_presentation.session && _presentation.session.state == "terminated") {
      if (_presentation.sessionCloseExpected) {
        // Reset the _presentation
        _reset();
        DEBUG_LOG('  >> The presentation connection is terminated successfully!');
      } else {
        DEBUG_LOG('!!!! The session is killed by server ???');
      }
    } else {
      DEBUG_LOG('!!!! Will this happen?');
      DEBUG_LOG(_presentation.session);
      DEBUG_LOG(_presentation.session.state);
      DEBUG_LOG(_presentation.sessionCloseExpected);
    }
  }

  function _presentationPrompt(deviceId) {
    DEBUG_LOG('# PresentationConnectionManager._presentationPrompt');
    return new Promise(function(resolve, reject) {
      // Get presentation-device-prompt XPCOM object
      let prompt = Cc["@mozilla.org/presentation-device/prompt;1"].getService(Ci.nsIObserver);
      if (!prompt) {
        reject('Cannot get presentationDevicePrompt XPCOM!');
      }
      // Add "presentation-select-device" signal listener to
      // the presentation-device-prompt XPCOM everytime before building a
      // session because the presentation-device-prompt XPCOM will remove
      // "presentation-select-device" signal listener after receiving it.
      Services.obs.addObserver(prompt, "presentation-select-device", false);

      let _presObserver = {
        observe: function (subject, topic, data) {
          DEBUG_LOG('$$$ PresentationConnectionManager._presObserver: ' + topic);
          if (topic == "presentation-prompt-ready") {
            resolve('(PresentationConnectionManager._presentationPrompt) get presentation-prompt-ready singal!');
          } else {
            reject('receive unexpected notification');
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

  function _presentationError(error) {
    DEBUG_LOG('# PresentationConnectionManager._presentationError');
    DEBUG_LOG(error);
    disconnect();
  }

  function _startSession(window, url) {
    DEBUG_LOG('# PresentationConnectionManager._startSession');
    return new Promise(function(resolve, reject) {
      let presentationRequest = new window.PresentationRequest(url);
      presentationRequest.start().then(function(session){
        DEBUG_LOG('  >> get session!');
        DEBUG_LOG(session);
        if (session.id && session.state == "connected") {
          DEBUG_LOG('  >> Build connection successfully!');
          _presentation.session = session;
          _presentation.session.onmessage = _presentationOnMessage;
          _presentation.session.onstatechange = _presentationOnStatechange;
          resolve('(PresentationConnectionManager._startSession) presentation session is built!');
        } else {
          _presentationError('session.id or session.state is wrong!');
          reject('session.id or session.state is wrong!');
        }
      }).catch(function(error) {
        DEBUG_LOG('  >> Build connection failed!');
        reject(error);
      });
    });
  }

  function sendCommand(command, data) {
    DEBUG_LOG('# PresentationConnectionManager.sendCommand');
    var msg = {
      'type': command,
      'seq': ++_presentation.seq
    };

    if (data) {
      for (var k in data) {
        msg[k] = data[k];
      }
    }
    _presentation.session.send(JSON.stringify(msg));
  }

  function disconnect() {
    DEBUG_LOG('# PresentationConnectionManager.disconnect');
    if (_presentation.session) {
      _presentation.sessionCloseExpected = true;
      _presentation.session.terminate();
      // _presentation.session = null;
      if (!_presentation.session.onmessage) {
        _presentation.session.onmessage = _presentationOnMessage;
      }
    }
  }

  function connect(window, url, target) {
    DEBUG_LOG('# PresentationConnectionManager.connect');
    return new Promise(function(resolve, reject) {
      _presentationPrompt(target.id).then(function(result) {
        DEBUG_LOG('  >> prompt is ready!');
        DEBUG_LOG(result);
        return _startSession(window, url);
      }).then(function(result) {
        DEBUG_LOG('  >> session is ready!');
        DEBUG_LOG(result);
        resolve(result);
      }).catch(function(error){
        DEBUG_LOG('  >> connection failed!');
        DEBUG_LOG(error);
        reject(error);
      });
    });
  }

  function init(window) {
    DEBUG_LOG('# PresentationConnectionManager.init');

    if (!window.navigator.presentation) {
      DEBUG_LOG('  >> navigator.presentation should be available');
      return;
    }

    // Check the preferences and permissions for presentation API
    if (!window.PresentationRequest) {
      DEBUG_LOG('  >> PresentationRequest should be available');
      return;
    }

    if (window.navigator.presentation.defaultRequest) {
      DEBUG_LOG('  >> navigator.presentation.defaultRequest is already turned-on');
      return;
    }
  }

  function uninit() {
    DEBUG_LOG('# PresentationConnectionManager.uninit');
  }

  return {
    init: init,
    uninit: uninit,
    connect: connect,
    sendCommand: sendCommand,
    disconnect: disconnect
  };
};

// PresentationManager
// ----------------------
function PresentationManager() {}

PresentationManager.prototype = {
  connectionManager: null,
  deviceManager: null,

  init: function(window) {
    DEBUG_LOG('# PresentationManager.init');

    if (!this.deviceManager) {
      DEBUG_LOG('  >> Create a PresentationDeviceManager');
      this.deviceManager = new PresentationDeviceManager();
      this.deviceManager.init(window);
    }

    if (!this.connectionManager) {
      DEBUG_LOG('  >> Create a PresentationConnectionManager');
      this.connectionManager = new PresentationConnectionManager();
      this.connectionManager.init(window);
    }
  },

  uninit:function(window) {
    DEBUG_LOG('# PresentationManager.uninit');

    if (this.deviceManager) {
      this.deviceManager.uninit(window);
      this.deviceManager = null;
    }

    if (this.connectionManager) {
      this.connectionManager.uninit();
      this.connectionManager = null;
    }
  },
};

function initPresentationManagerForWindow(window) {
  DEBUG_LOG('$$$ initPresentationManagerForWindow');

  if (!window.hasOwnProperty('presentationManager')) {
    DEBUG_LOG('  >> Create PresentationManager for this window');
    window.presentationManager = new PresentationManager();
    window.presentationManager.init(window);
  }
}

function uninitPresentationManagerForWindow(window) {
  DEBUG_LOG('$$$ uninitPresentationManagerForWindow');
  if (window.hasOwnProperty('presentationManager')) {
    DEBUG_LOG('  >> Delete PresentationManager for this window');
    window.presentationManager.uninit();
    delete window.presentationManager;
  }
}


// CastingManager
// ----------------------
// function CastingManager() {}
//
// CastingManager.prototype = {
//   _pageActionIcon: null,
//   _pageActionId: null,
//
//   _setPageActionIcon: function() {
//   },
//
//   _shouldCast: function() {
//   },
//
//   _addPageAction: function() {
//   },
//
//   _chooseAction: function() {
//   },
//
//   _promptInfoGenerator: function() {
//   },
//
//   _getCurrentURL: function() {
//   },
//
//   _castVideo: function() {
//   },
//
//   _castWebpage: function() {
//   },
//
//   _pinWebpageToHomescreen: function() {
//   },
//
//   _remoteControl: function() {
//   },
//
//   _updatePageAction: function() {
//   },
//
//   init: function() {
//   },
//
//   uninit: function() {
//   },
//
// };

var CastingManager = function() {

    var _pageActionIcon = null,
        _pageActionId = null;

    function _isCastingEnabled() {
      DEBUG_LOG('# CastingManager._isCastingEnabled');
      return Services.prefs.getBoolPref("browser.casting.enabled");
    }

    function _getCurrentURL(window) {
      DEBUG_LOG('# CastingManager._getCurrentURL');
      return window.BrowserApp.selectedBrowser.currentURI.spec;
    }

    function _castVideo(window, target) {
      DEBUG_LOG('# CastingManager._castVideo');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      window.alert('TODO: Cast video from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast video here...
      }
    }

    function _castWebpage(window, target) {
      DEBUG_LOG('# CastingManager._castWebpage');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      window.alert('TODO: Cast webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast webpage here...
      }
    }

    function _pinWebpageToHomescreen(window, target) {
      DEBUG_LOG('# CastingManager._pinWebpageToHomescreen');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: Pin webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // pin webpage to home here...
        window.presentationManager.connectionManager.connect(window, currentURL, target).then(function(result) {
          DEBUG_LOG('!!!!! Prepare to pin webpage....');
          DEBUG_LOG(result);
          // window.presentationManager.connectionManager.sendCommand("pin", { "url": currentURL });
          window.presentationManager.connectionManager.disconnect();
        }).catch(function(error){
          DEBUG_LOG('!!!!! Fail to pin webpage....');
          DEBUG_LOG(error);
          window.presentationManager.connectionManager.disconnect();
        });
      }
    }

    function _remoteControl(window, target) {
      DEBUG_LOG('# CastingManager._remoteControl');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      window.alert('TODO: remote control from: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // remote control to TV here...
      }
    }

    function _shouldCast(window) {
      DEBUG_LOG('# CastingManager._shouldCast');
      var currentURL = _getCurrentURL(window);
      var validURL = currentURL.includes('http://') || currentURL.includes('https://');
      return validURL && window.presentationManager.deviceManager.deviceAvailable();
    }

    // TODO: Define conditions to cast video
    // reference: using 'mozAllowCasting' for video tag
    // https://dxr.mozilla.org/mozilla-central/source/mobile/android/chrome/content/browser.js#4341
    function _findCastableVideo(browser) {
      DEBUG_LOG('# CastingManager._findCastableVideo');
      if (!browser) {
        return null;
      }

      // Scan for a <video> being actively cast. Also look for a castable <video>
      // on the page.
      let castableVideo = null;
      let videos = browser.contentDocument.querySelectorAll("video");
      DEBUG_LOG(videos);
      for (let video of videos) {
        DEBUG_LOG(video);
        if (video.mozIsCasting) {
          // This <video> is cast-active. Break out of loop.
          return video;
        }

        DEBUG_LOG(video.paused);
        DEBUG_LOG(video.mozAllowCasting);
        if (!video.paused && video.mozAllowCasting) {
          // This <video> is cast-ready. Keep looking so cast-active could be found.
          castableVideo = video;
        }
      }

      // Could be null
      DEBUG_LOG(castableVideo);
      return castableVideo;
    }


    function _setPageActionIcon(window) {
      DEBUG_LOG('# CastingManager._setPageActionIcon');

      // pageActionIncon has already been set
      if (_pageActionIcon) {
        DEBUG_LOG('  >> pageActionIcon alreay exist!');
        return;
      }

      if (window) {
        // Using data URIs as a workaround until bug 993698 is fixed.
        if (window.devicePixelRatio <= 1.5) {
          DEBUG_LOG('window.devicePixelRatio <= 1.5');
          _pageActionIcon = ICON_HDPI;
        } else if (window.devicePixelRatio <= 2) {
          DEBUG_LOG('window.devicePixelRatio <= 2');
          _pageActionIcon = ICON_XHDPI;
        } else {
          DEBUG_LOG('window.devicePixelRatio > 2');
          _pageActionIcon = ICON_XXHDPI;
        }
      }
    }

    function _addPageAction(window) {
      DEBUG_LOG('# CastingManager._addPageAction');
      if (_pageActionId) {
        DEBUG_LOG('  >> PageActionsIcon already exist!');
        return;
      }
      _pageActionId = PageActions.add({
        icon: _pageActionIcon,
        title: Strings.GetStringFromName("pageaction.title"),
        clickCallback: () => _chooseAction(window)
      });
    }

    function _chooseAction(window) {
      DEBUG_LOG('# CastingManager._chooseAction');
      var promptInfo = _promptInfoGenerator(window);

      var p = new Prompt({
        title: Strings.GetStringFromName("prompt.title")
      });

      p.setSingleChoiceItems(promptInfo.menu);

      p.show(function(data) {
        DEBUG_LOG('  >> press button: ' + data.button);
        // Fire callbacks with corresponding target device
        if (data.button > 0 && promptInfo.callbacks[data.button]) {
          DEBUG_LOG('  >> Fire callbak for this button!');
          promptInfo.callbacks[data.button](window, promptInfo.targets[data.button]);
        }
      });
    }

    function _promptInfoGenerator(window) {
      DEBUG_LOG('# CastingManager._promptInfoGenerator');
      var videoCastable = _findCastableVideo(window.BrowserApp.selectedBrowser);

      // Prompt menu
      var menu = [];

      // Callbacks for clicking menu
      var callbacks = {};

      // target device for callbacks
      var targetDevices = {};

      // Load devices information into prompt munu and set its callbacks
      var devices = PresentationDevices.getList();

      var key = 0;
      for (var i in devices) {
        // Assume every device has valid name
        menu.push({ label: devices[i].name, header: true });
        ++key;

        if (videoCastable && devices[i].castVideoEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.sendVideo") });
          callbacks[key] = _castVideo;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].castPageEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.sendURL") });
          callbacks[key] = _castWebpage;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].pinPageEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.addURL") });
          callbacks[key] = _pinWebpageToHomescreen;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].remoteControlEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.remoteControl") });
          callbacks[key] = _remoteControl;
          targetDevices[key] = devices[i];
          ++key;
        }
      }

      return { menu: menu, callbacks: callbacks, targets:targetDevices };
    }

    function _handleEvent(evt) {
      DEBUG_LOG('# CastingManager._handleEvent: ' + evt.type);
      DEBUG_LOG(evt);
      switch (evt.type) {
        case 'visibilitychange':
          DEBUG_LOG(' >> visibilitychange');
        case 'DOMContentLoaded':
          DEBUG_LOG(' >> DOMContentLoaded');
          _updatePageAction(evt.currentTarget); // current target is dom window!
          break;
        case 'pageshow': {
          DEBUG_LOG(' >> pageshow');
          // let domWindow = GetRecentWindow();
          let domWindow = evt.currentTarget;
          let tab = domWindow.BrowserApp.getTabForWindow(evt.originalTarget.defaultView);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        case 'TabSelect': {
          DEBUG_LOG('TabSelect');
          let domWindow = evt.view; //evt.view is ChromeWindow!
          let tab = domWindow.BrowserApp.getTabForBrowser(evt.target);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        default:
          DEBUG_LOG('!!!!! Unexpected error: No event handler for this type');
          break;
      }
    }

    function _removePageAction() {
      if (_pageActionId) {
        DEBUG_LOG('  >> Remove existing PageActionIcon!');
        PageActions.remove(_pageActionId);
        _pageActionId = null;
      }
    }

    function _updatePageActionForTab(window, tab) {
      DEBUG_LOG('# CastingManager._updatePageActionForTab');
      // We only care about events on the selected tab
      if (tab != window.BrowserApp.selectedTab) {
        return;
      }

      // Update the page action, scanning for a castable <video>
      _updatePageAction(window);
    }

    function _updatePageAction(window) {
      DEBUG_LOG('# CastingManager._updatePageAction');
      if (!_shouldCast(window)) {
        DEBUG_LOG('  >> no need to cast!');
        _removePageAction();
        return;
      }

      _addPageAction(window);
    }

    function init(window) {
      DEBUG_LOG('# CastingManager.init');

      if (!_isCastingEnabled()) {
        return;
      }

      _setPageActionIcon(window);

      // Reload pageActionIcon in URL bar after page has been loaded
      // window.addEventListener('DOMContentLoaded', _handleEvent, false);
      // window.BrowserApp.deck.addEventListener("pageshow", _handleEvent, true);
      window.addEventListener("pageshow", _handleEvent, true);

      // Reload pageActionIcon after tab has been switched
      // TODO: visibilitychange is also fired before tab is switching, it's annoyed
      // window.addEventListener('visibilitychange', _handleEvent, false);
      window.BrowserApp.deck.addEventListener("TabSelect", _handleEvent, true);

      // window.addEventListener("VideoBindingAttached", _handleEvent, true);
      // window.BrowserApp.deck.addEventListener("VideoBindingAttached", _handleEvent, true);

      // Add pageActionIcon to URL bar if it need
      _updatePageAction(window);
    }

    function uninit(window) {
      DEBUG_LOG('# CastingManager.uninit');
      _removePageAction();
      window.removeEventListener('DOMContentLoaded', _handleEvent);
      window.removeEventListener('visibilitychange', _handleEvent);
    }

    return {
      init: init,
      uninit: uninit,
    };
};

function initCastingManagerForWindow(window) {
  DEBUG_LOG('$$$ initCastingManagerForWindow');

  if (!window.hasOwnProperty('castingManager')) {
    DEBUG_LOG('  >> Create CastingManager for this window');
    window.castingManager = new CastingManager();
    window.castingManager.init(window);
  }
}

function uninitCastingManagerForWindow(window) {
  DEBUG_LOG('$$$ uninitCastingManagerForWindow');
  if (window.hasOwnProperty('castingManager')) {
    DEBUG_LOG('  >> Delete CastingManager for this window');
    window.castingManager.uninit();
    delete window.castingManager;
  }
}

/*
 * Program Flow Control
 * ==================================
 */
function loadIntoWindow(window) {
  DEBUG_LOG('### loadIntoWindow: ');
  // Set an unique id to window's name
  // window.name = GET_UNIQUE_ID();
  // DEBUG_LOG('  >> window.name: ' + window.name);

  // Initialize PresentationManager for this window
  initPresentationManagerForWindow(window);

  // For Debug: Add a force-discovery into menu
  gDiscoveryMenuId = window.NativeWindow.menu.add("Discovery Devices", null, function() { discoveryDevices(window); });
}

function unloadFromWindow(window) {
  DEBUG_LOG('### unloadFromWindow');

  // Remove PresentationManager from this window
  uninitPresentationManagerForWindow(window);

  // Remove CastingManager from this window
  uninitCastingManagerForWindow(window);

  // For Debug: Remove the force-discovery from menu
  if (gDiscoveryMenuId) {
    window.NativeWindow.menu.remove(gDiscoveryMenuId);
  }
}



/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    DEBUG_LOG('windowListener >> onOpenWindow');
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    function loadListener() {
      DEBUG_LOG('  >> loadListener()');
      domWindow.removeEventListener("load", loadListener, false);
      loadIntoWindow(domWindow);
    }
    domWindow.addEventListener("load", loadListener, false);
  },

  onCloseWindow: function(aWindow) {
    DEBUG_LOG('windowListener >> onCloseWindow');
  },

  onWindowTitleChange: function(aWindow, aTitle) {
    DEBUG_LOG('windowListener >> onWindowTitleChange');
  }
};

function startup(aData, aReason) {
  DEBUG_LOG('startup!');
  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  DEBUG_LOG('shutdown!');
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN) {
    return;
  }

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
  DEBUG_LOG('install!');
}

function uninstall(aData, aReason) {
  DEBUG_LOG('uninstall!');
}
