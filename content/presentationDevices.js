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
    return {
      // Notice that the |id| of presentation api device
      // is the |host| of mdns service
      id: aDevice.id || 'unidentified',
      name: aDevice.name || 'unidentified',
      type: aDevice.type || 'unidentified',
      // Set initial function for searched presentation devices
      sendVideo: false,
      sendPage: false,
      pinPage: false,
      remoteControlInfo: false,
      // Return true if the device provide any service
      get available() {
        return this.sendVideo ||
               this.sendPage ||
               this.pinPage ||
               this.remoteControlInfo;
      },
    };
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

  // updateServices now will only be called when onServiceFound is fired.
  // The parameter |aServiceInfo| is the service information found in
  // mDNS's network. The presentation-api now is built on the top of mDNS,
  // but it lacks for providing what the services that devices have, so
  // we use mDNS to find services.
  function updateServices(aServiceInfo, aType) {
    _debug('updateServices');
    // console.log(aServiceInfo);

    let index = _list.findIndex(function(dev) {
      // The |id| of presentation api device
      // is same of the |host| of mdns service
      return dev.id == aServiceInfo.host;
    });

    if (index > -1) {
      _debug("  >> Updating " + _list[index].name + "'s service.....");
      switch(aType) {
        case _serviceEnum.remoteControl:
          _debug("  set remote control port: " + aServiceInfo.port);
          _list[index].remoteControlInfo = {
            address: aServiceInfo.address,
            port: aServiceInfo.port,
          };
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
