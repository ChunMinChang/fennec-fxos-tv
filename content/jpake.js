"use strict";

// Ensure PSM is initialized.
Cc["@mozilla.org/psm;1"].getService(Ci.nsISupports);

var JPAKE = function(aSignerID) {

  function _debug(aMsg) {
    console.log('# [JPAKE] ' + aMsg);
  }

  let _syncJPAKE = Cc["@mozilla.org/services-crypto/sync-jpake;1"]
                     .createInstance(Ci.nsISyncJPAKE);

  let _signerID,
      _peerID;

  let _PIN;

  let _gx1 = {},
      _gx2 = {},
      _gx3 = {},
      _gx4 = {};

  let _zkp_x1 = {},
      _zkp_x2 = {},
      _zkp_x3 = {},
      _zkp_x4 = {};

  let _A = {},
      _B = {};

  let _zkp_A = {},
      _zkp_B = {};

  let _HKDFInfo;

  let _AES256Key = {},
      _HMAC256Key = {};

  function ZeroKnowledgeProof(aID, aV, aR) {
    this.id = aID || 'unidentified';
    this.v = aV || {};
    this.r = aR || {};
    return this;
  }

  function round1(aSignerID) {
    _debug('round1');

    _signerID = aSignerID;
    _zkp_x1 = new ZeroKnowledgeProof(aSignerID);
    _zkp_x2 = new ZeroKnowledgeProof(aSignerID);

    _syncJPAKE.round1(aSignerID,
                      _gx1, _zkp_x1.v, _zkp_x1.r,
                      _gx2, _zkp_x2.v, _zkp_x2.r);

    return { gx1: _gx1,
             zkp_x1: _zkp_x1,
             gx2: _gx2,
             zkp_x2: _zkp_x2 };
  }

  function round2(aPeerID, aGX3, aGV3, aR3, aGX4, aGV4, aR4) {
    _debug('round2');

    if (!_PIN) {
      _debug('no PIN was set!');
      return false;
    }

    if (!_signerID) {
      _debug('no SignerID was set!');
      return false;
    }

    if (!(aPeerID &&
          aGX3 && aGV3 && aR3 &&
          aGX4 && aGV4 && aR4)) {
      _debug('wrong paremeters!');
      return false;
    }

    _peerID = aPeerID;

    _gx3 = aGX3;
    _zkp_x3 = new ZeroKnowledgeProof(aPeerID, aGV3, aR3);

    _gx4 = aGX4;
    _zkp_x4 = new ZeroKnowledgeProof(aPeerID, aGV4, aR4);

    _zkp_A = new ZeroKnowledgeProof(_signerID);

    _syncJPAKE.round2(aPeerID, _PIN,
                      aGX3, aGV3, aR3,
                      aGX4, aGV4, aR4,
                      _A, _zkp_A.v, _zkp_A.r);

    return { A: _A,
             zkp_A: _zkp_A };
  }

  function final(aB, aGVB, aRB, aHkdfInfo) {
    _debug('final');

    if (!_peerID) {
      _debug('no peerID was set!');
      return false;
    }

    if (!(aB && aGVB && aRB && aHkdfInfo)) {
      _debug('wrong paremeters!');
      return false;
    }

    _B = aB;
    _zkp_B = new ZeroKnowledgeProof(_peerID, aGVB, aRB);

    _HKDFInfo = aHkdfInfo;

    _syncJPAKE.final(aB, aGVB, aRB,
                     aHkdfInfo, _AES256Key, _HMAC256Key);

    return { AES: _AES256Key, HMAC: _HMAC256Key };
  }

  return {
    get PIN() { return _PIN; },
    set PIN(aPIN) { _PIN = aPIN; },
    round1: round1,
    round2: round2,
    final: final,
  };
};
