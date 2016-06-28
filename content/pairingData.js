"use strict";

const kServerClientPairsPref = 'fxos.tv.server_client_pairs';
// const kValidPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days to ms;
const kValidPeriod = 60 * 1000; // 30 days to ms;

var PairingData = (function () {

  function PairingInfo(aServerId, aClientId, aPIN) {
    this.server = aServerId;
    this.client = aClientId;
    this.pin = aPIN;
    this.lastUpdate = _getTimestamp();
    return this;
  }

  // The Pairing Data structure is:
  // {
  //   server1 id: {
  //     client id: server1 assigned client id,
  //     pin: the AES base 64 signature from last time for next PIN code,
  //     lastUpdate: the last connection time between the server and the client
  //   }
  //   server2 id: {
  //     client id: server2 assigned client id,
  //     pin: the AES base 64 signature from last time for next PIN code,
  //     lastUpdate: the last connection time between the server and the client
  //   }
  //   ...
  // }

  function _debug(aMsg) {
    console.log('# [PairingData] ' + aMsg);
  }

  function _getTimestamp() {
    return new Date().getTime();
  }

  // Return the stored server-client pairing information.
  // If nothing exist, then return a empty object
  function getPairs() {
    _debug('getPairs');
    return (Services.prefs.getPrefType(kServerClientPairsPref)) ?
      JSON.parse(Services.prefs.getCharPref(kServerClientPairsPref)) : {};
  }

  // Save the pairing data
  function setPairs(aPairs) {
    _debug('setPairs');
    let pairsData = JSON.stringify(aPairs);
    Services.prefs.setCharPref(kServerClientPairsPref, pairsData);
    // This preference is consulted during startup.
    Services.prefs.savePrefFile(null);
  }

  function add(aServerId, aClientId, aPIN) {
    _debug('add');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    let pairingInfo = new PairingInfo(aServerId, aClientId, aPIN);

    // If it exist, then do nothing!
    if (pairs[pairingInfo.server]) {
      _debug('The ' + aServerId + ' is already added!');
      return false;
    }

    // Append the new server-client pair into pairs
    pairs[pairingInfo.server] = {
      client: pairingInfo.client,
      pin: pairingInfo.pin,
      lastUpdate: pairingInfo.lastUpdate
    };

    // Save it
    setPairs(pairs);

    return true;
  }

  function update(aServerId, aClientId, aPIN) {
    _debug('update');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    // If it doesn't exist, then do nothing!
    if (!pairs[aServerId]) {
      _debug('The ' + aServerId + ' does NOT exist!');
      return false;
    }

    if (aClientId) {
      pairs[aServerId].client = aClientId;
    }

    if (aPIN) {
      pairs[aServerId].pin = aPIN;
    }

    // Save it
    setPairs(pairs);

    return true;
  }

  function save(aServerId, aClientId, aPIN) {
    _debug('save');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    // If it doesn't exist, then do nothing!
    if (!pairs[aServerId]) {
      pairs[aServerId] = {};
    }

    if (aClientId) {
      pairs[aServerId].client = aClientId;
    }

    if (aPIN) {
      pairs[aServerId].pin = aPIN;
    }

    pairs[aServerId].lastUpdate = _getTimestamp();

    // Save it
    setPairs(pairs);

    return true;
  }

  function remove(aServerId) {
    _debug('remove');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    // If it doesn't exist, then do nothing!
    if (!pairs[pairingInfo.server]) {
      _debug('The ' + aServerId + ' does NOT exist!');
      return false;
    }

    delete pairs[pairingInfo.server];

    setPairs(pairs);

    return true;
  }

  function deleteAll() {
    _debug('deleteAll');

    Services.prefs.deleteBranch(kServerClientPairsPref);
  }

  // Remove the expired server-client info pair
  function refresh() {
    _debug('refresh');

    // Get the current timestamp
    let currentTime = _getTimestamp();

    // Retrieve the stored pairing data
    let pairs = getPairs();

    // A flag to detect whether or not we need to update the data
    let updated = false;

    // Check every item's valid time
    for (let serverId in pairs) {
      // Delete the pair if it is already expired
      if ((pairs[serverId].lastUpdate + kValidPeriod) < currentTime) {
        updated = true;

        _debug('Server: ' + serverId + ' is expired! Remove its pairing data!');
        delete pairs[serverId];
      }
    }

    // Update the pairing data if it needs
    if (updated) {
      setPairs(pairs);
    }
  }

  return {
    getPairs: getPairs,
    setPairs: setPairs,
    add: add,
    update: update,
    save: save,
    remove: remove,
    deleteAll: deleteAll,
    refresh: refresh,
  };
})();
