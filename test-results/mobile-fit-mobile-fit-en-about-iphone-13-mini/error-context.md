# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-fit.spec.ts >> mobile fit: /en/about
- Location: tests-e2e/mobile-fit.spec.ts:66:3

# Error details

```
TimeoutError: browserType.launch: Timeout 180000ms exceeded.
Call log:
  - <launching> /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --inspector-pipe --headless --no-startup-window
  - <launched> pid=80294
  - [pid=80294][err] [80294:24686108:0611/090336.445442:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=80294][err] Created TensorFlow Lite XNNPACK delegate for CPU.
  - [pid=80294][err] [80376:24687186:0611/090351.917962:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake-all --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=80294][err] [80376:24687186:0611/090351.918273:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 481052, parent pid: 80294
  - [pid=80294][err] [80376:24687186:0611/090351.921383:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80376:24687186:0611/090351.921400:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80376:24687186:0611/090351.921478:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=80294][err] [80378:24687191:0611/090351.934680:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=80294][err] [80378:24687191:0611/090351.934944:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 481052, parent pid: 1
  - [pid=80294][err] [80378:24687191:0611/090351.937595:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80378:24687191:0611/090351.937614:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80378:24687191:0611/090351.937706:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=80294][err] [80376:24687186:0611/090351.938304:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=80294][err] [80376:24687186:0611/090351.939217:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=80294][err] [80376:24687186:0611/090351.939302:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=80294][err] [80376:24687186:0611/090351.939445:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939460:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939470:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939477:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939485:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939493:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939502:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939536:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939551:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939561:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939570:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939578:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939585:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939592:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939628:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939637:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939644:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939650:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939657:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939664:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939671:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80376:24687186:0611/090351.939697:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=80294][err] [80376:24687199:0611/090351.940078:VERBOSE1:chrome/updater/app/app_wakeall.cc:58] Launching `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake`
  - [pid=80294][err] [80379:24687203:0611/090351.951246:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=80294][err] [80379:24687203:0611/090351.951510:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 481052, parent pid: 80376
  - [pid=80294][err] [80379:24687203:0611/090351.954192:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80379:24687203:0611/090351.954206:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80379:24687203:0611/090351.954278:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=80294][err] [80381:24687207:0611/090351.967091:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=80294][err] [80381:24687207:0611/090351.967350:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 481052, parent pid: 1
  - [pid=80294][err] [80381:24687207:0611/090351.969815:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80381:24687207:0611/090351.969830:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636115697664B (592.429GiB) / 3996329328640B (3.635TiB)
  - [pid=80294][err] [80381:24687207:0611/090351.969908:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=80294][err] [80379:24687203:0611/090351.970507:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=80294][err] [80379:24687203:0611/090351.971499:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=80294][err] [80379:24687203:0611/090351.971584:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=80294][err] [80379:24687203:0611/090351.971718:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971735:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971745:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971757:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971767:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971781:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971789:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971819:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971828:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971836:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971842:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971849:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971856:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971862:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971896:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971906:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971913:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971920:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971926:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971933:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971940:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=80294][err] [80379:24687203:0611/090351.971954:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=80294][err] [80379:24687203:0611/090351.972145:VERBOSE1:chrome/updater/ipc/update_service_internal_proxy_mojo.cc:61] Run
  - [pid=80294][err] [80294:24686108:0611/090405.221306:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=80294][err] [80379:24687203:0611/090407.609400:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=80294][err] [80379:24687203:0611/090407.611643:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=80294][err] [80379:24687203:0611/090407.611720:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake) returned 0.
  - [pid=80294][err] [80376:24687199:0611/090407.648027:VERBOSE1:chrome/updater/app/app_wakeall.cc:68] `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake` exited 0
  - [pid=80294][err] [80376:24687186:0611/090407.648261:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=80294][err] [80376:24687186:0611/090407.648667:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=80294][err] [80376:24687186:0611/090407.648680:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake-all) returned 0.
  - [pid=80294][err] [80381:24687207:0611/090417.621789:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=80294][err] [80381:24687207:0611/090417.621831:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=80294][err] [80378:24687191:0611/090417.624490:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=80294][err] [80378:24687191:0611/090417.624530:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=80294][err] [80294:24686108:0611/090446.778109:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=80294][err] [80294:24686108:0611/090629.248288:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT

```