# Features
- Scanning nearby devices by __W3C Presentation api__
- Sending webpage via presentation api
- Remotely controlling your Firefox OS TV
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

# Pairing Firefox OS TV
- https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS_for_TV
- https://wiki.mozilla.org/TV_2.6

[jpake]: https://www.gitbook.com/book/chunminchang/j-pake-over-tls/ "J-PAKE over TLS"
