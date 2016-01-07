"use strict";

var PresentationDeviceManager = function() {

  // Return true if one of services of discovered devices is enabled
  function _deviceAvailable() {
    Debugger.log('# PresentationDeviceManager._deviceAvailable: ');
    var devs = PresentationDevices.getList();
    Debugger.log(devs);
    for (var i = 0 ; i < devs.length ; i ++) {
      if (devs[i].castPageEnabled) {
        return true;
      }
    }
    return false;
  }

  function _handleEvent(evt) {
    Debugger.log('# PresentationDeviceManager._handleEvent: ' + evt.detail.type);
    Debugger.log(evt);

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
        Debugger.log('No event handler for this type');
        break;
    }
  }

  function _loadDevices(window, callback) {
    Debugger.log('# PresentationDeviceManager._loadDevices');
    // Load avaliable devices into list
    window.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {

      if (devices === undefined || !devices.length) {
        return;
      }

      // Add these devices into list
      PresentationDevices.setList(devices);
      Debugger.log(PresentationDevices.getList());

      if (callback) {
        callback();
      }

    }, function(error) {
      Debugger.log(error);
    });
  }

  function init(window) {
    Debugger.log('# PresentationDeviceManager.init');

    if (!window.navigator.mozPresentationDeviceInfo) {
      Debugger.log('  >> mozPresentationDeviceInfo should be available');
      return;
    }

    // Add event listener for devicechange
    window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', _handleEvent);

    // Load existed presentation devices
    _loadDevices(window, function(){
      // Initialize CastingManager for this window if it doesn't exist
      initCastingManagerForWindow(window);
    });
  }

  function uninit(window) {
    Debugger.log('# PresentationDeviceManager.uninit');
    window.navigator.mozPresentationDeviceInfo.removeEventListener('devicechange', _handleEvent);
  }

  return {
    init: init,
    uninit: uninit,
    get deviceAvailable() {
      return _deviceAvailable();
    },
  };
};
