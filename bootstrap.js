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
Cu.import("resource://gre/modules/MulticastDNS.jsm");


// Create a string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
});

// Import a helper module.
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

function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}

// For Debug
// ----------------------
var gDiscoveryMenuId = null;

function discoveryDevices(win) {
  win.navigator.mozPresentationDeviceInfo.getAll()
  .then(function(devices) {

    if (devices === undefined || !devices.length) {
      return;
    }

    PresentationDevices.setList(devices);
    DEBUG_LOG(PresentationDevices.getList());

  }, function(error) {
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
  // Containing presentation device's infomation
  function DeviceInfo(device) {
    this.id = device.id || 'unidentified';
    this.name = device.name || 'unidentified';
    this.type = device.type || 'unidentified';
    // Assuming all functions are enabled on presentation devices
    this.castVideoEnabled = true;
    this.castPageEnabled = true;
    this.pinPageEnabled = true;
    this.remoteControlPortAndPath = false;
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

  function updateServices(dnsServiceInfo) {
    DEBUG_LOG('# [PresentationDevices] updateService');

    var index = _list.findIndex(function(dev) {
      return dev.name == dnsServiceInfo.serviceName;
    });

    if (index > -1) {
      DEBUG_LOG("Updating " + _list[index].name + "'s service.....");
      // TODO: Detecting which services will be updated
      DEBUG_LOG("  >> port: " + dnsServiceInfo.port);
      // DEBUG_LOG("  >> path: " + dnsServiceInfo.attributes.getPropertyAsAString("path"));
      _list[index].remoteControlPortAndPath = ":8080/";
    }
  }

  return {
    setList: setList,
    getList: getList,
    add: addDevice,
    update: updateDevice,
    remove: removeDevice,
    updateServices: updateServices
  };

})();



// PresentationDeviceManager
// ----------------------
var PresentationDeviceManager = function() {

  let _listener = {
    onDiscoveryStarted: function(servType) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onDiscoveryStarted");
    },
    onDiscoveryStopped: function(servType) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onDiscoveryStopped");
    },
    onStartDiscoveryFailed: function(servType, errorCode) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onStartDiscoveryFailed");
    },
    onStopDiscoveryFailed: function(servType, errorCode) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onStopDiscoveryFailed");
    },

    // The serviceInfo is a nsIDNSServiceInfo XPCOM object
    // see more: https://dxr.mozilla.org/mozilla-central/source/netwerk/dns/mdns/nsIDNSServiceDiscovery.idl
    onServiceFound: function(serviceInfo) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onServiceFound");
      PresentationDevices.updateServices(serviceInfo);
    },
    onServiceLost: function(serviceInfo) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onServiceLost");
    },
    onServiceRegistered: function(serviceInfo) {
    },
    onServiceUnregistered: function(serviceInfo) {
    },
    onServiceResolved: function(serviceInfo) {
    },
    onRegistrationFailed: function(serviceInfo, errorCode) {
    },
    onUnregistrationFailed: function(serviceInfo, errorCode) {
    },
    onResolveFailed: function(serviceInfo, errorCode) {
    },
  };

  function _deviceAvailable() {
    DEBUG_LOG('# PresentationDeviceManager._deviceAvailable');
    var available = false;
    var devs = PresentationDevices.getList();
    for (var i = 0 ; i < devs.length ; i ++) {
      available |= devs[i].castVideoEnabled |
                   devs[i].castPageEnabled |
                   devs[i].pinPageEnabled |
                   devs[i].remoteControlPortAndPath;
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

        // update device's services
        updateServices(evt.currentTarget.ownerGlobal);
        break;

      case 'update':
        PresentationDevices.update(evt.detail.deviceInfo);

        // update device's services
        updateServices(evt.currentTarget.ownerGlobal);
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
        DEBUG_LOG('No event handler for this type');
        break;
    }
  }

  function _mdnsDiscovery(window, period, serviceType) {
    DEBUG_LOG('# PresentationDeviceManager._mdnsDiscovery');
    period = period || 1000;
    serviceType = serviceType || "_http._tcp.";
    let mdns = Cc["@mozilla.org/toolkit/components/mdnsresponder/dns-sd;1"].
               getService(Ci.nsIDNSServiceDiscovery);
    // https://developer.mozilla.org/en-US/docs/Mozilla/Errors
    let timeout_code = 0x804B000E;
    let disc = mdns.startDiscovery(serviceType, _listener);
    window.setTimeout(function() {
      disc.cancel(timeout_code);
    }, period);
  }

  function _registerServicesUpdater(window) {
    DEBUG_LOG('# PresentationDeviceManager._registerServicesUpdater');
    // Use startDiscovery to register mdns' listerers first.
    _mdnsDiscovery(window, 500);
  }

  function updateServices(window) {
    DEBUG_LOG('# PresentationDeviceManager.updateServices');
    // Trigger onServiceFound by startDiscovery
    _mdnsDiscovery(window, 1000);
  }

  function init(window) {
    DEBUG_LOG('# PresentationDeviceManager.init');

    if (!window.navigator.mozPresentationDeviceInfo) {
      DEBUG_LOG('  >> mozPresentationDeviceInfo should be available');
      return;
    }

    _registerServicesUpdater(window);

    // Add event listener for devicechange
    window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', _handleEvent);

    // Load avaliable devices into list
    window.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {

      if (devices === undefined || !devices.length) {
        return;
      }

      // Add these devices into list
      PresentationDevices.setList(devices);
      DEBUG_LOG(PresentationDevices.getList());

      // Initialize CastingManager for this window if it doesn't exist
      initCastingManagerForWindow(window);

    }, function(error) {
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
    get deviceAvailable() {
      return _deviceAvailable();
    },
    updateServices: updateServices
  };
};


// PresentationConnectionManager
// ----------------------
var PresentationConnectionManager = function() {

  var _presentation = {
    // hold the presentation's connection
    session: null,
    // keep track the message sequence
    seq: 0,
    // detect the
    sessionCloseExpected: false,
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
  }

  function _presentationOnStatechange(evt) {
    DEBUG_LOG('# PresentationConnectionManager._presentationOnStatechange');
    DEBUG_LOG(evt);
    DEBUG_LOG('  >> state: ' + _presentation.session.state);

    if (_presentation.session && _presentation.session.state !== "connected") {
      if (_presentation.sessionCloseExpected) {
        DEBUG_LOG('The session is unexpectedly closed');
      }
      _reset();
    }
  }

  function _presentationPrompt(deviceId) {
    DEBUG_LOG('# PresentationConnectionManager._presentationPrompt');
    return new Promise(function(resolve, reject) {
      // Get presentation-device-prompt XPCOM object
      let prompt = Cc["@mozilla.org/presentation-device/prompt;1"].getService(Ci.nsIObserver);
      if (!prompt) {
        reject('No available presentationDevicePrompt XPCOM');
      }
      // Add "presentation-select-device" signal listener to
      // the presentation-device-prompt XPCOM everytime before building a
      // session because the presentation-device-prompt XPCOM will remove
      // "presentation-select-device" signal listener after receiving it.
      Services.obs.addObserver(prompt, "presentation-select-device", false);

      let _presObserver = {
        observe: function (subject, topic, data) {
          if (topic == "presentation-prompt-ready") {
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
    DEBUG_LOG(msg);
    DEBUG_LOG(JSON.stringify(msg));
    _presentation.session.send(JSON.stringify(msg));
  }

  function _disconnect(terminate) {
    DEBUG_LOG('# PresentationConnectionManager.disconnect');
    if (_presentation.session) {
      _presentation.sessionCloseExpected = true;
      (terminate)? _presentation.session.terminate() : _presentation.session.close();
      // _presentation.session will be set to null once
      // _presentation.session.state is changed to 'terminated'
      if (!_presentation.session.onmessage) {
        _presentation.session.onmessage = _presentationOnMessage;
      }
    }
  }

  // TODO: close semantics is not ready now(Bug 1210340).
  // Uncomment the line after close semantic is ready
  function close() {
    DEBUG_LOG('# PresentationConnectionManager.close');
    // _disconnect(false);
    return;
  }

  function terminate() {
    DEBUG_LOG('# PresentationConnectionManager.terminate');
    _disconnect(true);
  }

  function connect(window, url, target) {
    DEBUG_LOG('# PresentationConnectionManager.connect');
    return new Promise(function(resolve, reject) {
      _presentationPrompt(target.id).then(function(result) {
        DEBUG_LOG('  >> prompt is ready!');
        return _startSession(window, url);
      }).then(function(result) {
        DEBUG_LOG('  >> session is ready!');
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

    // Check the preferences and permissions for presentation API
    if (!window.navigator.presentation ||
        !window.PresentationRequest) {
      DEBUG_LOG('  >> navigator.presentation or PresentationRequest should be available');
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
    terminate: terminate,
    close: close
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
      // window.alert('TODO: Cast video from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast video here...
      }
    }

    function _castWebpage(window, target) {
      DEBUG_LOG('# CastingManager._castWebpage');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: Cast webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast webpage here...
        var appURL = "app://notification-receiver.gaiamobile.org/index.html";
        window.presentationManager.connectionManager.connect(window, appURL, target).then(function(result) {
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.send"), "long");
          DEBUG_LOG('!!!!! Prepare to cast webpage....');
          DEBUG_LOG(result);
          window.presentationManager.connectionManager.sendCommand("view", { "url": currentURL, "timestamp": Date.now() });
          window.presentationManager.connectionManager.close();
        }).catch(function(error){
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.fail"), "long");
          DEBUG_LOG(error);
          window.presentationManager.connectionManager.terminate();
        });
      }
    }

    function _pinWebpageToHomescreen(window, target) {
      DEBUG_LOG('# CastingManager._pinWebpageToHomescreen');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: Pin webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // pin webpage to home here...
      }
    }

    function _remoteControl(window, target) {
      DEBUG_LOG('# CastingManager._remoteControl');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: remote control from: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // remote control to TV here...
        var appURL = "app://notification-receiver.gaiamobile.org/index.html";
        window.presentationManager.connectionManager.connect(window, appURL, target).then(function(result) {
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.send"), "long");
          // We need to cast a webpage first
          window.presentationManager.connectionManager.sendCommand("view", { "url": currentURL, "timestamp": Date.now() });
          // and open a remote control tab
          DEBUG_LOG(">> ip: " + target.id);
          DEBUG_LOG(">> port and path: " + target.remoteControlPortAndPath);
          window.BrowserApp.addTab(target.id + target.remoteControlPortAndPath);
          // close the session
          window.presentationManager.connectionManager.close();
        }).catch(function(error){
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.fail"), "long");
          DEBUG_LOG(error);
          window.presentationManager.connectionManager.terminate();
        });
      }
    }

    function _shouldCast(window) {
      DEBUG_LOG('# CastingManager._shouldCast');
      var currentURL = _getCurrentURL(window);
      var validURL = currentURL.includes('http://') || currentURL.includes('https://');
      return validURL && window.presentationManager.deviceManager.deviceAvailable;
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
          _pageActionIcon = ICON_HDPI;
        } else if (window.devicePixelRatio <= 2) {
          _pageActionIcon = ICON_XHDPI;
        } else {
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

        if (devices[i].remoteControlPortAndPath) {
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
        case 'pageshow': {
          DEBUG_LOG(' >> pageshow');
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
          DEBUG_LOG('No event handler for this type');
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
      window.addEventListener("pageshow", _handleEvent, true);

      // Reload pageActionIcon after tab has been switched
      window.BrowserApp.deck.addEventListener("TabSelect", _handleEvent, true);

      // TODO: Remove pageAction when wifi is turned-off,
      // and reload it when wifi is turned-on.

      // updateServices

      // Add pageActionIcon to URL bar if it need
      _updatePageAction(window);
    }

    function uninit(window) {
      DEBUG_LOG('# CastingManager.uninit');
      _removePageAction();
      window.removeEventListener('pageshow', _handleEvent);
      window.BrowserApp.deck.removeEventListener('TabSelect', _handleEvent);
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
    window.castingManager.uninit(window);
    delete window.castingManager;
  }
}

/*
 * Program Flow Control
 * ==================================
 */
function loadIntoWindow(window) {
  DEBUG_LOG('### loadIntoWindow: ');

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
