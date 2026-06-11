# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-fit.spec.ts >> mobile fit: /en/
- Location: tests-e2e/mobile-fit.spec.ts:66:3

# Error details

```
TimeoutError: browserType.launch: Timeout 180000ms exceeded.
Call log:
  - <launching> /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --inspector-pipe --headless --no-startup-window
  - <launched> pid=79189
  - [pid=79189][err] [79189:24666781:0611/085135.462871:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79189][err] Created TensorFlow Lite XNNPACK delegate for CPU.
  - [pid=79189][err] [79249:24667578:0611/085150.335126:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake-all --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79189][err] [79249:24667578:0611/085150.335374:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480330, parent pid: 79189
  - [pid=79189][err] [79249:24667578:0611/085150.337960:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79249:24667578:0611/085150.337977:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79249:24667578:0611/085150.338059:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79189][err] [79251:24667582:0611/085150.348905:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79189][err] [79251:24667582:0611/085150.349187:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480330, parent pid: 1
  - [pid=79189][err] [79251:24667582:0611/085150.351667:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79251:24667582:0611/085150.351683:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79251:24667582:0611/085150.351769:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79189][err] [79249:24667578:0611/085150.352277:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79189][err] [79249:24667578:0611/085150.353154:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79189][err] [79249:24667578:0611/085150.353239:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79189][err] [79249:24667578:0611/085150.353371:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353384:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353394:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353402:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353410:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353417:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353425:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353458:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353467:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353474:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353480:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353488:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353494:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353501:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353535:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353547:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353554:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353561:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353567:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353574:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353580:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79249:24667578:0611/085150.353594:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79189][err] [79249:24667590:0611/085150.353894:VERBOSE1:chrome/updater/app/app_wakeall.cc:58] Launching `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake`
  - [pid=79189][err] [79252:24667594:0611/085150.365585:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79189][err] [79252:24667594:0611/085150.365891:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480330, parent pid: 79249
  - [pid=79189][err] [79252:24667594:0611/085150.368790:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79252:24667594:0611/085150.368807:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79252:24667594:0611/085150.368887:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79189][err] [79254:24667601:0611/085150.381759:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79189][err] [79254:24667601:0611/085150.381985:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480330, parent pid: 1
  - [pid=79189][err] [79254:24667601:0611/085150.384640:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79254:24667601:0611/085150.384657:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636585861120B (592.867GiB) / 3996329328640B (3.635TiB)
  - [pid=79189][err] [79254:24667601:0611/085150.384763:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79189][err] [79252:24667594:0611/085150.385484:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79189][err] [79252:24667594:0611/085150.386498:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79189][err] [79252:24667594:0611/085150.386589:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79189][err] [79252:24667594:0611/085150.386728:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386747:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386756:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386763:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386771:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386782:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386789:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386820:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386832:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386839:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386847:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386856:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386864:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386873:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386913:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386922:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386929:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386936:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386944:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386952:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386963:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79189][err] [79252:24667594:0611/085150.386980:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79189][err] [79252:24667594:0611/085150.387274:VERBOSE1:chrome/updater/ipc/update_service_internal_proxy_mojo.cc:61] Run
  - [pid=79189][err] [79189:24666781:0611/085156.047847:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79189][err] [79252:24667594:0611/085206.230174:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79189][err] [79252:24667594:0611/085206.231277:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79189][err] [79252:24667594:0611/085206.231298:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake) returned 0.
  - [pid=79189][err] [79249:24667590:0611/085206.319397:VERBOSE1:chrome/updater/app/app_wakeall.cc:68] `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake` exited 0
  - [pid=79189][err] [79249:24667578:0611/085206.319686:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79189][err] [79249:24667578:0611/085206.320132:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79189][err] [79249:24667578:0611/085206.320144:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake-all) returned 0.
  - [pid=79189][err] [79254:24667601:0611/085216.243177:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79189][err] [79254:24667601:0611/085216.243206:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79189][err] [79251:24667582:0611/085216.244520:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79189][err] [79251:24667582:0611/085216.244542:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79189][err] [79189:24666781:0611/085242.676498:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT

```