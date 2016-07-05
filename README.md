# Demo
[![FxOS Remote Control][RemoteControlImg]][RemoteControlURL]

# Features
- Scan nearby devices by __W3C Presentation api__
- Cast webpage to TV via _presentation_ api
- Remotely control your Firefox OS TV
  - protocol: J-PAKE over TLS

# Install
1. Check the ```ANDROID_APP_ID``` in [build](build)
has the same name as your fennec app.
2. Run command:
```
$ ./build
```
Then fennec(firefox for android) will show a install-page,
that has a install-link. Click it to install this add-on.

3. If there is an error shows that you can't install a __unsigned__ add-on,
then:
  1. open ```about:config``` on your URL bar
  2. set __xpinstall.signatures.required__ to __false__

## Enabling __xpinstall.signatures.required__ by default
set ```pref("xpinstall.signatures.required", false);```
in [<mozilla-central>/mobile/android/app/mobile.js][mobileJS_link]

# Remove
1. Delete the add-on in ```Tools > Add-ons > This add-on's name```
2. Run command:
```
$ ./rm_files
```

# J-PAKE over TLS
Please read the [my book][jpake] about this to get more detail.

## Talk slides
The Magic behind Remote-control Service of Firefox OS TV: [slides here][slides]

# Notes
## LazyGetter
Don't call objects defined in LazyGetter in global scope
because they aren't loaded yet!

## Import order of modules
- Every module labels their __dependence__,
so you must make sure their order is right.
- Many modules use ```Cc```, ```Cu```, ..etc, so these modules should be called
after ```const { classes: Cc, interfaces: Ci, utils: Cu } = Components;```,
or you can just put ```{ ... } = Components; ``` in the beginning
of the _bootstrap.js_.
- _socket.js_ and _authSocket.js_ will call ```let window = GetRecentWindow();```
to use ```window.setTimeout``` and ```window.crypto```,
so they must be loaded after the declaration of ```GetRecentWindow()```.

# Future Risk Issues
XPCOM calling/registration in add-on will be
[deprecated at the end of this year][xpcom_deprecated], or early next year,
so this add-on may need to be refactored with new style to meet the new policy.

[mobileJS_link]: https://dxr.mozilla.org/mozilla-central/source/mobile/android/app/mobile.js#194  "mobile.js"
[xpcom_deprecated]: https://blog.mozilla.org/addons/2015/08/21/the-future-of-developing-firefox-add-ons/ "xpcom deprecated"

# Compatible Firefox OS TV
- https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS_for_TV
- https://wiki.mozilla.org/TV_2.6

## Gaia
- TV 2.6: https://github.com/mozilla-b2g/gaia/tree/v2.6

## Gecko
- TV 2.6: https://github.com/mozilla-b2g/gecko-b2g/tree/b2g48_v2_6

## Build FxOS TV on Nexus Player
https://developer.mozilla.org/en-US/docs/Mozilla/B2G_OS/Porting_B2G_OS/B2G_Nexus_Player

## Build FxOS TV on Flame/Nexus5
```
$ cd <path/to/B2G>
$ ./build.sh
$ ./flash.sh
$ cd <B2G>/gaia
$ apply patch https://gist.github.com/schien/e972c97b35922a91d206
(set layout.css.devPixelsPerPx to 0.5 for flame, 1 for nexus 5)
$ apply patch
$ make clean
$ make GAIA_DEVICE_TYPE=tv DEVICE_DEBUG=1 reset-gaia
```

[jpake]: https://www.gitbook.com/book/chunminchang/j-pake-over-tls/ "J-PAKE over TLS"
[RemoteControlImg]: http://img.youtube.com/vi/Hqv_EnqQ86Y/0.jpg "FxOS Remote Control"
[RemoteControlURL]: https://www.youtube.com/watch?v=Hqv_EnqQ86Y&list=PLSVOWZrQzZlY07b3gR6ONDECSsh-83w9N&index=1 "FxOS Remote Control"
[slides]: http://chunminchang.github.io/works/remotecontrol/jpake-over-tls.pdf "The Magic behind Remote-control Service of Firefox OS TV"
<!-- [RemoteControlURL]: https://www.youtube.com/playlist?list=PLSVOWZrQzZlY07b3gR6ONDECSsh-83w9N "FxOS Remote Control" -->
