# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-fit.spec.ts >> mobile fit: /en/browse
- Location: tests-e2e/mobile-fit.spec.ts:66:3

# Error details

```
TimeoutError: browserType.launch: Timeout 180000ms exceeded.
Call log:
  - <launching> /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --inspector-pipe --headless --no-startup-window
  - <launched> pid=79387
  - [pid=79387][err] [79387:24671135:0611/085435.127969:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79387][err] Created TensorFlow Lite XNNPACK delegate for CPU.
  - [pid=79387][err] [79449:24672004:0611/085450.505190:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake-all --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79387][err] [79449:24672004:0611/085450.505436:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480510, parent pid: 79387
  - [pid=79387][err] [79449:24672004:0611/085450.508072:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79449:24672004:0611/085450.508091:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79449:24672004:0611/085450.508158:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79387][err] [79451:24672008:0611/085450.520771:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79387][err] [79451:24672008:0611/085450.521041:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480510, parent pid: 1
  - [pid=79387][err] [79451:24672008:0611/085450.524413:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79451:24672008:0611/085450.524429:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79451:24672008:0611/085450.524525:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79387][err] [79449:24672004:0611/085450.525082:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79387][err] [79449:24672004:0611/085450.526095:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79387][err] [79449:24672004:0611/085450.526194:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79387][err] [79449:24672004:0611/085450.526357:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526378:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526388:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526398:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526406:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526414:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526422:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526459:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526468:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526477:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526485:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526493:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526500:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526509:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526550:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526561:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526568:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526575:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526582:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526589:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526596:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79449:24672004:0611/085450.526610:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79387][err] [79449:24672016:0611/085450.527032:VERBOSE1:chrome/updater/app/app_wakeall.cc:58] Launching `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake`
  - [pid=79387][err] [79452:24672020:0611/085450.537230:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79387][err] [79452:24672020:0611/085450.537479:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480511, parent pid: 79449
  - [pid=79387][err] [79452:24672020:0611/085450.540214:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79452:24672020:0611/085450.540238:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79452:24672020:0611/085450.540312:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79387][err] [79454:24672024:0611/085450.551640:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79387][err] [79454:24672024:0611/085450.551904:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480511, parent pid: 1
  - [pid=79387][err] [79454:24672024:0611/085450.554316:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79454:24672024:0611/085450.554331:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636460449792B (592.750GiB) / 3996329328640B (3.635TiB)
  - [pid=79387][err] [79454:24672024:0611/085450.554407:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79387][err] [79452:24672020:0611/085450.554895:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79387][err] [79452:24672020:0611/085450.555611:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79387][err] [79452:24672020:0611/085450.555693:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79387][err] [79452:24672020:0611/085450.555813:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555826:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555835:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555847:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555855:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555862:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555869:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555905:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555914:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555921:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555928:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555935:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555941:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555948:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555982:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.555994:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.556002:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.556010:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.556018:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.556024:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.556031:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79387][err] [79452:24672020:0611/085450.556044:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79387][err] [79452:24672020:0611/085450.556217:VERBOSE1:chrome/updater/ipc/update_service_internal_proxy_mojo.cc:61] Run
  - [pid=79387][err] [79387:24671135:0611/085501.392883:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79387][err] [79452:24672020:0611/085508.242993:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79387][err] [79452:24672020:0611/085508.244728:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79387][err] [79452:24672020:0611/085508.244759:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake) returned 0.
  - [pid=79387][err] [79449:24672016:0611/085508.388134:VERBOSE1:chrome/updater/app/app_wakeall.cc:68] `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake` exited 0
  - [pid=79387][err] [79449:24672004:0611/085508.388351:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79387][err] [79449:24672004:0611/085508.388709:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79387][err] [79449:24672004:0611/085508.388723:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake-all) returned 0.
  - [pid=79387][err] [79454:24672024:0611/085518.253872:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79387][err] [79454:24672024:0611/085518.253909:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79387][err] [79451:24672008:0611/085518.256000:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79387][err] [79451:24672008:0611/085518.256026:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79387][err] [79387:24671135:0611/085543.974183:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79387][err] [79387:24671135:0611/085720.889855:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT

```