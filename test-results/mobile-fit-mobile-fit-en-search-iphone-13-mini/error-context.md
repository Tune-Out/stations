# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-fit.spec.ts >> mobile fit: /en/search
- Location: tests-e2e/mobile-fit.spec.ts:66:3

# Error details

```
TimeoutError: browserType.launch: Timeout 180000ms exceeded.
Call log:
  - <launching> /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --inspector-pipe --headless --no-startup-window
  - <launched> pid=79673
  - [pid=79673][err] [79673:24675228:0611/085735.531710:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: PHONE_REGISTRATION_ERROR
  - [pid=79673][err] [79673:24675228:0611/085735.534172:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: PHONE_REGISTRATION_ERROR
  - [pid=79673][err] [79673:24675228:0611/085735.534217:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: PHONE_REGISTRATION_ERROR
  - [pid=79673][err] Created TensorFlow Lite XNNPACK delegate for CPU.
  - [pid=79673][err] [79733:24676093:0611/085750.902597:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake-all --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79673][err] [79733:24676093:0611/085750.902835:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480691, parent pid: 79673
  - [pid=79673][err] [79733:24676093:0611/085750.905879:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636350107648B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79733:24676093:0611/085750.905912:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636350107648B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79733:24676093:0611/085750.906005:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79673][err] [79735:24676097:0611/085750.918480:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79673][err] [79735:24676097:0611/085750.918723:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480691, parent pid: 1
  - [pid=79673][err] [79735:24676097:0611/085750.921301:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636350042112B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79735:24676097:0611/085750.921316:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636350042112B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79735:24676097:0611/085750.921405:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79673][err] [79733:24676093:0611/085750.922019:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79673][err] [79733:24676093:0611/085750.923025:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79673][err] [79733:24676093:0611/085750.923117:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79673][err] [79733:24676093:0611/085750.923261:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923276:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923298:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923308:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923315:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923323:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923331:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923364:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923374:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923381:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923387:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923393:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923399:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923405:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923440:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923448:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923454:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923460:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923481:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923490:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923497:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79733:24676093:0611/085750.923513:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79673][err] [79733:24676105:0611/085750.923912:VERBOSE1:chrome/updater/app/app_wakeall.cc:58] Launching `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake`
  - [pid=79673][err] [79736:24676109:0611/085750.934516:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79673][err] [79736:24676109:0611/085750.934758:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480691, parent pid: 79733
  - [pid=79673][err] [79736:24676109:0611/085750.937521:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636350042112B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79736:24676109:0611/085750.937537:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636350042112B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79736:24676109:0611/085750.937604:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79673][err] [79738:24676114:0611/085750.950130:VERBOSE1:chrome/updater/updater.cc:374] Version: 150.0.7863.0, opt, ARM_64, command line: /Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --crash-handler --database=/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/Crashpad --url=https://clients2.google.com/cr/report --annotation=prod=Update4 --annotation=ver=150.0.7863.0 --handshake-fd=6 --enable-logging --vmodule=*/components/update_client/*=2,*/chrome/enterprise_companion/*=2,*/chrome/updater/*=2
  - [pid=79673][err] [79738:24676114:0611/085750.950429:VERBOSE1:chrome/updater/updater.cc:377] OS version: 26.5.1, arch: arm64, System uptime (seconds): 480691, parent pid: 1
  - [pid=79673][err] [79738:24676114:0611/085750.953207:VERBOSE1:chrome/updater/updater.cc:382] Available disk space in install directory (/Users/marc/Library/Application Support/Google/GoogleUpdater): 636350042112B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79738:24676114:0611/085750.953221:VERBOSE1:chrome/updater/updater.cc:386] Available disk space in temporary directory (/var/folders/zl/wkdjv4s1271fbm6w0plzknkh0000gn/T/): 636350042112B (592.647GiB) / 3996329328640B (3.635TiB)
  - [pid=79673][err] [79738:24676114:0611/085750.953302:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS START event to the history log
  - [pid=79673][err] [79736:24676109:0611/085750.953943:VERBOSE1:chrome/updater/crash_reporter.cc:124] Crash handler launched and ready.
  - [pid=79673][err] [79736:24676109:0611/085750.954990:VERBOSE1:chrome/updater/crash_client.cc:108] Found 0 completed crash reports
  - [pid=79673][err] [79736:24676109:0611/085750.955090:VERBOSE1:chrome/updater/crash_client.cc:132] Found 0 pending crash reports
  - [pid=79673][err] [79736:24676109:0611/085750.955234:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/RLZ/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955249:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Measurement/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955258:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955268:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2021.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955274:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/consentOptions/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955281:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/Android File Transfer/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955287:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseInstanceID/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955323:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955332:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955338:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955344:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955353:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudioPreview2025.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955359:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955366:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955401:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2023.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955409:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.2.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955416:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/FirebaseMessaging/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955422:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955428:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2022.1/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955434:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2024.2/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955440:ERROR:third_party/crashpad/crashpad/util/file/file_io_posix.cc:145] open /Users/marc/Library/Application Support/Google/AndroidStudio2025.1.3/Crashpad/settings.dat: No such file or directory (2)
  - [pid=79673][err] [79736:24676109:0611/085750.955453:VERBOSE1:chrome/updater/updater.cc:105] Crash reporting initialized.
  - [pid=79673][err] [79736:24676109:0611/085750.955670:VERBOSE1:chrome/updater/ipc/update_service_internal_proxy_mojo.cc:61] Run
  - [pid=79673][err] [79673:24675228:0611/085804.610434:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
  - [pid=79673][err] [79736:24676109:0611/085807.768895:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79673][err] [79736:24676109:0611/085807.770502:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79673][err] [79736:24676109:0611/085807.770517:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake) returned 0.
  - [pid=79673][err] [79733:24676105:0611/085807.947252:VERBOSE1:chrome/updater/app/app_wakeall.cc:68] `/Users/marc/Library/Application Support/Google/GoogleUpdater/150.0.7863.0/GoogleUpdater.app/Contents/MacOS/GoogleUpdater --wake` exited 0
  - [pid=79673][err] [79733:24676093:0611/085807.947474:VERBOSE1:chrome/updater/app/app.cc:52] Shutdown: 0
  - [pid=79673][err] [79733:24676093:0611/085807.947932:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79673][err] [79733:24676093:0611/085807.947956:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--wake-all) returned 0.
  - [pid=79673][err] [79738:24676114:0611/085817.777913:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79673][err] [79738:24676114:0611/085817.777934:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79673][err] [79735:24676097:0611/085817.779153:VERBOSE2:chrome/updater/event_history.cc:265] Emitted a UPDATER_PROCESS END event to the history log
  - [pid=79673][err] [79735:24676097:0611/085817.779205:VERBOSE1:chrome/updater/updater.cc:419] UpdaterMain (--crash-handler) returned 0.
  - [pid=79673][err] [79673:24675228:0611/085901.027125:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: QUOTA_EXCEEDED

```