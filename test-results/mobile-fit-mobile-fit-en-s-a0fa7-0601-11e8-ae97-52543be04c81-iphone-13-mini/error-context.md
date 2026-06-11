# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-fit.spec.ts >> mobile fit: /en/station/9617a958-0601-11e8-ae97-52543be04c81
- Location: tests-e2e/mobile-fit.spec.ts:66:3

# Error details

```
TimeoutError: browserType.launch: Timeout 180000ms exceeded.
Call log:
  - <launching> /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --inspector-pipe --headless --no-startup-window
  - <launched> pid=79893
  - [pid=79893][err] [79893:24680115:0611/090036.121837:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79893][err] [79893:24680115:0611/090036.350300:ERROR:google_apis/gcm/engine/mcs_client.cc:702]   Error code: 401  Error message: Authentication Failed: wrong_secret
  - [pid=79893][err] [79893:24680115:0611/090036.350317:ERROR:google_apis/gcm/engine/mcs_client.cc:704] Failed to log in to GCM, resetting connection.
  - [pid=79893][err] Created TensorFlow Lite XNNPACK delegate for CPU.
  - [pid=79893][err] [79953:24681168:0611/090051.615735:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake-all --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79893][err] [79953:24681168:0611/090051.616051:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480872, parent pid: 79893
  - [pid=79893][err] [79953:24681168:0611/090051.619140:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79953:24681168:0611/090051.619160:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79953:24681168:0611/090051.619241:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79893][err] [79955:24681172:0611/090051.630774:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79893][err] [79955:24681172:0611/090051.631056:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480872, parent pid: 1
  - [pid=79893][err] [79955:24681172:0611/090051.634301:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79955:24681172:0611/090051.634318:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79955:24681172:0611/090051.634426:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79893][err] [79953:24681168:0611/090051.635111:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79893][err] [79953:24681168:0611/090051.636148:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79893][err] [79953:24681168:0611/090051.636239:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79893][err] [79953:24681168:0611/090051.636377:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636393:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636403:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636411:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636419:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636427:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636434:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636465:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636475:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636482:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636488:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636495:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636502:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636509:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636545:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636555:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636562:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636569:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636575:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636582:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636588:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79953:24681168:0611/090051.636602:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79893][err] [79953:24681180:0611/090051.636960:VERBOSE1:chrome/updater/app/app_wakeall.cc:58] Launching `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake`
  - [pid=79893][err] [79956:24681184:0611/090051.647018:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79893][err] [79956:24681184:0611/090051.647265:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480872, parent pid: 79953
  - [pid=79893][err] [79956:24681184:0611/090051.650528:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79956:24681184:0611/090051.650545:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79956:24681184:0611/090051.650637:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79893][err] [79958:24681189:0611/090051.662919:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79893][err] [79958:24681189:0611/090051.663178:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480872, parent pid: 1
  - [pid=79893][err] [79958:24681189:0611/090051.666270:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79958:24681189:0611/090051.666289:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636200591360B (592.508GiB) / 3996329328640B (3.635TiB)
  - [pid=79893][err] [79958:24681189:0611/090051.666376:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79893][err] [79956:24681184:0611/090051.667216:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79893][err] [79956:24681184:0611/090051.668459:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79893][err] [79956:24681184:0611/090051.668578:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79893][err] [79956:24681184:0611/090051.668744:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668762:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668772:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668781:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668789:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668797:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668806:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668843:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668852:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668860:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668868:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668875:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668882:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668890:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668926:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668936:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668943:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668950:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668957:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668963:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668970:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79893][err] [79956:24681184:0611/090051.668986:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79893][err] [79956:24681184:0611/090051.669194:VERBOSE1:chrome/updater/ipc/update_service_internal_proxy_mojo.cc:61] Run
  - [pid=79893][err] [79893:24680115:0611/090102.127745:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79893][err] [79956:24681184:0611/090106.899425:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79893][err] [79956:24681184:0611/090106.900341:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79893][err] [79956:24681184:0611/090106.900361:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake) returned 0.
  - [pid=79893][err] [79953:24681180:0611/090107.067296:VERBOSE1:chrome/updater/app/app_wakeall.cc:68] `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake` exited 0
  - [pid=79893][err] [79953:24681168:0611/090107.067412:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79893][err] [79953:24681168:0611/090107.067833:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79893][err] [79953:24681168:0611/090107.067858:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake-all) returned 0.
  - [pid=79893][err] [79958:24681189:0611/090116.915667:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79893][err] [79958:24681189:0611/090116.915716:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79893][err] [79955:24681172:0611/090116.920262:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79893][err] [79955:24681172:0611/090116.920300:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79893][err] [79893:24680115:0611/090144.139736:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79893][err] [79893:24680115:0611/090317.133043:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT

```