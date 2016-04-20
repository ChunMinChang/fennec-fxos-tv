"use strict";

var PresentationDevices = (function () {

  function _debug(aMsg) {
    console.log('# [PresentationDevices] ' + aMsg);
  }

  const _serviceEnum = {
    remoteControl: 0,
    sendPage: 1,
    pinPage: 2,
    sendVideo: 3,
  };

  // Containing presentation device's infomation
  function DeviceInfo(aDevice) {
    this.id = aDevice.id || 'unidentified';
    this.name = aDevice.name || 'unidentified';
    this.type = aDevice.type || 'unidentified';
    // Set initial function for searched presentation devices
    this.sendVideo = false;
    this.sendPage = true;
    this.pinPage = false;
    this.remoteControlPort = false;
  }

  // To save all information of the presentation devices discovered
  let _list = [];

  function setList(aDevices) {
    _list = aDevices.map(function(dev) {
      let info = new DeviceInfo(dev);
      return info;
    });
  }

  function getList() {
    return _list;
  }

  function addDevice(aDevice) {
    _debug('addDevice');
    let found = _list.find(function(dev) {
      return dev.id == aDevice.id;
    });

    if (!found) {
      _list.push(new DeviceInfo(aDevice));
    }
    // For debugging
    else {
      _debug('  >> device alreadt exist!');
    }
  }

  function updateDevice(aDevice) {
    _debug('updateDevice');
    let index = _list.findIndex(function(dev) {
      return dev.id == aDevice.id;
    });

    if (index > -1) {
      _list[index] = new DeviceInfo(aDevice);
    }
    // For debugging
    else {
       _debug('  >> device doesn\'t exist!');
    }
  }

  function updateServices(aServiceInfo, aType) {
    _debug('updateServices');

    let index = _list.findIndex(function(dev) {
      return dev.name == aServiceInfo.serviceName;
    });

    if (index > -1) {
      _debug("  >> Updating " + _list[index].name + "'s service.....");
      switch(aType) {
        case _serviceEnum.remoteControl:
          _debug("  set remote control port: " + aServiceInfo.port);
          _list[index].remoteControlPort = aServiceInfo.port;
          break;
        default:
          _debug("  Can't find any service!");
          break;
      }
    }
    // For Debug
    else {
      _debug('  >> device doesn\'t exist!');
    }

    // NOTE:
    // You can also get presentation's attributes by
    // aServiceInfo.attributes.getPropertyAsAString("ATT_NAME");
    // e.g., let path = aServiceInfo.attributes.getPropertyAsAString("path");
  }

  function removeDevice(aDevice) {
    _debug('removeDevice');
    let index = _list.findIndex(function(dev) {
      return dev.id == aDevice.id;
    });

    if (index > -1) {
      _list.splice(index, 1);
    }
    // For debugging
    else {
       _debug('  >> device doesn\'t exist!');
    }
  }

  return {
    setList: setList,
    getList: getList,
    add: addDevice,
    update: updateDevice,
    remove: removeDevice,
    updateServices: updateServices,
    service: _serviceEnum,
  };

})();
