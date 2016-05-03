"use strict";

// This is refered from
// https://dxr.mozilla.org/mozilla-central/source/devtools/shared/security/cert.js

const localCertService = Cc["@mozilla.org/security/local-cert-service;1"]
                           .getService(Ci.nsILocalCertService);

const localCertName = 'RemoteControlService';

var Cert = {
  /**
   * Get or create a new self-signed X.509 cert to represent this device for
   * some purposes over a secure transport, like TLS.
   *
   * The cert is stored permanently in the profile's key store after first use,
   * and is valid for 1 year.  If an expired or otherwise invalid cert is found,
   * it is removed and a new one is made.
   *
   * @return promise
   */
  getOrCreate: function() {
    return new Promise((aResolve, aReject) => {
      localCertService.getOrCreateCert(localCertName, {
        handleCert: function(aCert, aRv) {
          if (aRv) {
            aReject(aRv);
          } else {
            aResolve(aCert);
          }
        }
      });
    });
  },

  /**
   * Remove the DevTools self-signed X.509 cert for this device.
   *
   * @return promise
   */
  removeCert: function() {
    return new Promise((aResolve, aReject) => {
      localCertService.removeCert(localCertName, {
        handleResult: function(aRv) {
          if (aRv) {
            aReject(aRv);
          } else {
            aResolve();
          }
        }
      });
    });
  },
};
