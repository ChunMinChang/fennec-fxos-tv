# fennec-fxos-tv
- Scanning nearby devices by W3C presentation api
- Sending webpage via presentation api
- Remotely controlling your Firefox OS TV
  - protocol: J-PAKE over TLS

# Install
```
./build
```
If there is an error shows that you can't install a unsigned add-on,
then you can need to

1. open ```about:config``` on your URL bar
2. set __xpinstall.signatures.required__ to __false__

## Enabling __xpinstall.signatures.required__ by default
set ```pref("xpinstall.signatures.required", false);```
in __<m-c>/mobile/android/app/mobile.js__
