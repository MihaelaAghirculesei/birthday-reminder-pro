## [1.0.1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/compare/v1.0.0...v1.0.1) (2026-07-12)


### Bug Fixes

* **android:** bump CI JDK to 21 to match Capacitor Gradle source/target compatibility ([5313303](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/53133034e2b446022cb70772dc4e08a43ae8f1c0))
* **sw:** switch api-data group from performance to freshness strategy ([f65fc75](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f65fc75a5a8bfe5aeb1e5a034d3c12237164ca8d))

# 1.0.0 (2026-07-12)


### Bug Fixes

* **a11y:** add aria-hidden to decorative mat-icons in import-export menu ([965a12f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/965a12fdaef77122af0ebde541dbd6a8340787b2))
* **a11y:** add aria-hidden to mat-icons and empty alt in user menu ([09dd01b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/09dd01b48c51a49a943d17b800444d8b4f12a7f8))
* **a11y:** add aria-hidden to nav mat-icons and empty alt for logo ([c03c9ba](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c03c9ba221ae587c0df709f0344f45886cc8634c))
* **a11y:** add aria-label and aria-hidden to settings menu items ([20276a5](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/20276a5861bb22582b7908e4b64689b492dd20e3))
* **a11y:** add aria-label attribute to sr-only chart data table ([90e9195](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/90e9195ec818fcd8d3b056a286956bb84c0c073f))
* **a11y:** add role=img and aria-label to category-icon wrapper ([14b580c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/14b580c7c07323547d65905d443ce6e010c0432f))
* **a11y:** promote h3 to h2 in dashboard and home for screen readers ([26d65a7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/26d65a70a8c454e2af3b67ced6f272de49958c98))
* **a11y:** replace notification click-to-dismiss with role=status aria-live ([7f1878d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7f1878d817056314a38e26149303d58ad5888f0d))
* add error handling for invalid JSON in backup import ([8e4f489](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8e4f489525754fa51f75503848fbc9387c0d9f2a))
* add error handling to notification permission observer ([cec21b1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/cec21b1da5368f11a67e76e2f0bc21aea597ea42))
* add error logging to catch blocks in dev mode ([46ede9b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/46ede9b0bb699baf01227d8d0bb931e64c0c5f2e))
* add error logging to silent catch blocks ([17e3e82](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/17e3e82ff571a66474e0d752fc7ee342e8829f54))
* add platform checks for SSR compatibility in storage services ([e117b72](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e117b725a3eb056352d6b0f68bacb4da58d4238b))
* **auth-effects:** recover from auth state observer errors by dispatching signed-out action ([e6ac0bb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e6ac0bb32b9c61ae08deb8d7fb69175ad9cc1b18))
* **auth:** dispatch Google sign-in result directly from components ([2579fd0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2579fd012e773d1eb4f5090036408b365b17c2a3))
* **auth:** replace localStorage auth hint with __Secure- prefixed SameSite=Strict cookie ([899f90b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/899f90bbd7183c47c0a8dd4b9a06f0ec9d5e39fa))
* **auth:** replace redirect flow with popup to avoid COOP and bounce-tracker issues ([63dfd22](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/63dfd22ec5edf1a7b7774190401f2e2164dcee4e))
* **auth:** show user-friendly message when popup is dismissed before completing ([c72ea32](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c72ea329694daddeb6828aa8dfff6457e6ce8167))
* **backup:** replace z.any() with typed ScheduledMessageSchema ([4d4ceed](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4d4ceed68fed799e873be629982d954bee7a0a22))
* **birthday-chart:** restructure bar-value positioning and optimize chart sizing ([f37e403](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f37e403eeb82c38de7b2053c6907d3ba6ea95776))
* **birthday-form:** use parseLocalDate to avoid UTC off-by-one in validator ([92cf3e6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/92cf3e6462786aa5b8f407266936f734bafa62b7))
* **birthday-list:** add take(1) to dialog subscription for consistency ([4e873fd](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4e873fd790f199476e22ff36bd11d495ee1e7fe4))
* **birthday-list:** align virtual-scroll breakpoint with tablet-md CSS breakpoint ([e455b64](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e455b643cdb87c7dedf0f6dc517722d15f3c4e6e))
* **birthday-list:** restore import-export component for [@defer](https://github.com/defer) ([c33179f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c33179f258e8c439bb8ddab5961cd037530b007b))
* **birthday-store:** handle API errors with proper failure actions ([9876e8e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9876e8eef4a03d2a356afd5c59047d0f93c975cf))
* **category-filter:** pointer-events, cursor and img filter button styles ([58dc1d8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/58dc1d8cb42241ad9c619ae2355ab6f99544932e))
* **chart:** replace non-standard align-items:end with flex-end ([ef45253](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ef452532b1345026985e81debaa19dca3296d0fe))
* **ci:** align Cypress port, command and wait-on timeout with start:ci ([cabed92](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/cabed92c959a0e080de0c6a0803535d22b628acc))
* **ci:** disable Lighthouse assertions to prevent CI failures ([a96ec70](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a96ec70090d604b021f96fef3d7d070aaf95a347))
* **ci:** increase Lighthouse timeout thresholds for CI stability ([12310c7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/12310c7b3268f94f8814527bf78810fc16d9c9f7))
* **ci:** match main-*.js hash pattern in bundle size check ([48cc963](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/48cc963dad0ca51110d899b27d212afb8d7d2f9b))
* **ci:** move secrets check out of step if: into job-level env ([676008a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/676008aeecc50677e1f149e492a55d61244cc372))
* **ci:** pin OWASP action to 1.1.0, use ChromeHeadlessCI browser ([e844a6c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e844a6c6f78c885711b81277a430ae068673b392))
* **ci:** relax audit gate to policy thresholds, patch known-fixable vulns ([17bd2d7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/17bd2d7d1558e2b9109b94b515a64fe2690c81b5))
* **ci:** simplify Lighthouse assertions to prevent failures ([50bfbb2](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/50bfbb2dea157f6e12cf0519806e605ede6874b5))
* cleanup auto-save timer on service destroy ([b9462cd](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b9462cd2f8ffb02dac6148b090c4d961f3c73737))
* cleanup test data timer on component destroy ([0001ba3](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0001ba341ede7904ac0247e80b8bdf77a9e9df01))
* clear notification check interval on service destroy ([33dfd18](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/33dfd1819dbd812df51851f240e4c2f9f6d41689))
* codeql permissions yaml syntax ([4adf037](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4adf037f06c3e51af9dddf734f1b3c9287cbcae7))
* **config:** resolve TypeScript types after Node.js v22 upgrade ([5bc62bd](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5bc62bd35d4b8528147b3c2c93407da3aca5af7c))
* correct date construction to prevent invalid date overflow ([b838da6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b838da6d532310281fe776e4ea7a45f857042083))
* correct invalid dates in test data ([72deddb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/72deddb4461ee05a2b1bf1ff96deaff60a2d0087))
* **crud-effects:** pass birthday payload through deleteBirthdaySuccess ([15d9f3a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/15d9f3aa352af765c8009339e1be17ab3943dd45))
* **csp:** add fonts and avatar domains to connect-src for service worker ([c525a6f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c525a6fbcf3a4ac068bad835e140e57ef0813163))
* **csp:** add fonts and avatar domains to connect-src for service worker ([89d1fcd](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/89d1fcda058eae9fdac01fe608bb59f84f1d7cfc))
* **csp:** add Sentry ingest host to connect-src directive ([461b685](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/461b68545ada32ee41b0df8ede6e52387a6a6a08))
* **csp:** allow font lazy-load onload handler via unsafe-hashes ([7858a57](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7858a571f4caa2e75980dc354ed5672d9ff8cb82))
* **csp:** derive frame-src authDomain from environment instead of hardcoded domain ([7d86d3c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7d86d3c5e86079afa002281f12ca26e77afe718b))
* **csp:** scope img-src to explicit photo/avatar origins instead of wildcard https: ([23c158e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/23c158e29a7cd1d168c5c78c533ed9433376d305))
* **cypress:** replace kill-port with fkill-cli ([870b458](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/870b45876710c321a8f789246c7a6195e9aeca87))
* **dashboard:** add 390px breakpoint and apply icon-size mixin to container and sections ([a1f671d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a1f671dfedfff0339f492abcc6ed1a25523c2716))
* **date:** fall back to Feb 28 for leap-day birthdays in non-leap years ([26e4b35](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/26e4b35648d28e3af2ed32bfe7a804241e45f664))
* **deps:** patch @angular/ssr SSRF and open redirect vulnerability (CVE) ([485cc08](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/485cc08054353c62e7d68e3ee86a54daf9831bbd))
* **deps:** regenerate lockfile with node_modules cleared to include Linux optional deps ([d145198](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d145198f1d809142af877aa3ee123b12be821e94))
* **deps:** resolve all npm audit security vulnerabilities & Update Angular from 19.2.19 to 19.2.20 ([cc95103](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/cc951030a85b28c981c974b6f8a34342ca5f7272))
* **dispatch:** pass operationId to updateBirthday at all call sites ([9f37dbb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9f37dbb34591129f0dfaf86e3f97969b8fe67dd7))
* **e2e:** harden expandBirthdayForm and search test against animation race conditions ([07d5f12](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/07d5f123f1670e00ab114e1d80e94f5d02bd6c3a))
* **e2e:** re-expand form between birthday additions in search tests ([3b7caf2](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/3b7caf275a838d56ba0a5e0648e7c0cc45345ee7))
* **e2e:** split command chains in search test to prevent DOM detach ([c093ff2](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c093ff2ff95c4830a47e9c2d69ed7568196293ec))
* **e2e:** wait for form close animation before re-expanding in category filter tests ([67d7917](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/67d7917e60ceac08c3c7d028728e1e5b7917ae10))
* eliminate silent failures by handling all empty catch blocks ([46ba178](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/46ba178b0641b5459df36b98684c38b1ed403848))
* **env:** add errorReportingEndpoint to environment.example.ts ([0462d19](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0462d19ace1bf43419e520536b9f8419d82caea0))
* **error-handler:** wrap logger calls in try/finally to ensure groupEnd fires ([a74fe16](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a74fe164d9ac1050dd5b843980c372773915b2a8))
* export all birthdays instead of only filtered results ([59974eb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/59974eb1ce8bf19d6353514c7f6edbc91820f6cd))
* export all birthdays instead of only filtered results ([9ceb254](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9ceb25401fee671a38f84ea51c0030fbee8019d2))
* **firestore:** retry transient errors with exponential backoff ([35dd368](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/35dd3681e91d2026ce83ccb458486f9cf7fe6bc2))
* **firestore:** store birthDate as plain string to prevent timezone shift ([5f8c3eb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5f8c3eb1fec33a1be7487c3ad664751e2b272553))
* **firestore:** strip undefined values before Firestore write ([be6e2af](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/be6e2afa1718431b3627d5f450c1970aa062eef0))
* **footer:** replace img role=button with semantic button element ([5ac0060](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5ac0060b1cf8506e4468ea1b19c3fe070551f9cd))
* handle message operation errors properly ([e3ae5c4](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e3ae5c4ebbdb6f26c218755e470ba57da981051a))
* **header:** prevent memory leak with takeUntilDestroyed on subscriptions ([249e3b0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/249e3b016f04283a3c38836925d31d7ef60a39a3))
* **home:** add aria-expanded, keyboard nav and focus-visible to add-birthday ([8f5f581](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8f5f581bfccd03f3bc2680d9426e24378a48d318))
* **husky:** quote $1 in commit-msg hook to handle paths with spaces ([ebe0ca6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ebe0ca654843d8d2894546b8548dda6c81d3b608))
* **idb:** resolve write transactions via oncomplete/onabort to prevent double-settle ([8aa3b8e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8aa3b8e69be7a6860d29efb551944187b1db5c40))
* improve Cypress E2E tests for Angular SSR hydration ([b5ba102](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b5ba102b226af66733c2cdf6385742461f967c67))
* improve error handling and remove empty functions ([ec976e1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ec976e1d0cb69b850811cd0886b80fb524c8ff1c))
* improve form field border visibility ([ccabe3e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ccabe3e444326ef15358144fa0534af7b0caae3d))
* improve UI element visibility in light mode ([0af245b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0af245bc17c3b6810196c6ba3c7a5e3e9a8e605c))
* **layout:** add 390px breakpoint and fix Sass mixed-decls deprecation ([4ce7521](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4ce7521a54afe2355489b7b96180506389964290))
* **legal:** escape @ in email link text to prevent Angular template parse error ([296b566](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/296b5661c68a4cc2ee32dd005cd4ae7184b3a425))
* **lighthouse:** run against SSR server, add csp-xss and minification gates ([f4e0278](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f4e0278ec3a56af749e9dae181330d17a7629160))
* **logging:** replace silent catch with diagnostic warning in SyncCoordinator ([755fb97](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/755fb974b639d30c757d396ba5b593296b3b2977))
* **merge:** deduplicate by name+date composite key instead of name only ([6bf84bc](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6bf84bcaada46d5ae89cbee2498bd94d94a02acf))
* **merge:** upload merged winner when both local and cloud contributed ([5cf860d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5cf860d0cc07cce1d5d422d59f33077982dc56f3))
* **network:** bypass NGSW cache and verify connectivity on online event ([9782b00](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9782b003e101255415a2e4f132fee2e1b6e438ec))
* **ngsw:** remove deprecated cacheConfig blocks from service worker config ([fac758c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/fac758c5296b27771a9206b1d13052bd8082c2e0))
* **notifications:** handle missing Notification API in headless browsers ([ae14e54](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ae14e5463f1c1add8e1aaf4bb562bcc568f3a19f))
* **notifications:** move requestPermission() out of service init, require user gesture ([957cd53](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/957cd531dbeb1aa6646ededfc4170ed6d11e748f))
* **offline-storage:** replace hardcoded constants with injectable RETRY_CONFIG token ([1a95947](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1a95947efe256433598faf179f658eb912f39e9e))
* **orphan-cleanup:** guard against missing store object on transaction open ([30679ec](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/30679ec1ef9703ea835a194525bba525f6f5746f))
* **photo-storage:** rewrite base64ToFile as async using fetch API ([d29ef7f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d29ef7fdc5fa1856074a29797ff87c2645cb0ad4))
* prevent NG0205 in PushNotificationService with Subject-based teardown ([ac5dd45](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ac5dd4546978fa3695b8744805b3fe7c74f69867))
* prevent NG0205 in SyncCoordinatorService with Subject-based teardown ([3d62658](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/3d6265820c939b0e94e028ed69d1d716654d7ff2))
* **reducer:** bound optimistic-backup size and prevent stale overwrite ([a15974e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a15974eccf305f81b0786f87d2a2c2b0e8dde69d))
* **reducer:** improve error msg when optimistic backup is missing on rollback ([c46b80f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c46b80f8990b9306659dd1167353b708fe231c63))
* **release:** initialize environment files before semantic-release ([f2b2e3a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f2b2e3ae7e2ef39b5b02ef1389e981b4288d2cd1))
* remove deprecated meta tag warning ([9509a2b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9509a2b438f478a17209a71eea2a0e9468ecc165))
* remove unused imports and variables ([9488881](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9488881110cca941c8fd0174b41e020334305c2d))
* rename Output bindings to avoid DOM event conflicts ([2a87433](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2a8743370b637f9b4e075d7545ce69386707e4af))
* resolve backup download and memory leak issues ([b647128](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b6471280535836f9f3dee93a127f703c56709d40))
* **scheduled-messages:** eliminate memory leak in subscriptions ([1f39b92](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1f39b92a10a9edf4b77059c0dca927e887c0975d))
* **scheduled-messages:** eliminate potential memory leaks ([b7baa7e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b7baa7eba09a93b2ccae8d192d7b311fdbf71272))
* **scripts:** locale-independent netstat parsing; wait for port release after kill ([3219063](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/32190632f9b8ce7c5d19099c2ba4753bf6e535d6))
* **secure-storage:** persist encryption key in IndexedDB as non-extractable CryptoKey ([54bfebc](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/54bfebc8b2b5e3257551a02ee71f6ce2c7e530ab))
* **security:** add COOP header and remove unsafe-hashes from CSP ([0177046](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/01770461541fb8d404fbc53d497fed58fded0523))
* **security:** add COOP header and remove unsafe-hashes from CSP ([217a857](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/217a8570adad4b25a99db358ab530cfdabc7ec44))
* **security:** harden Firebase hosting headers and Firestore data-validation rules ([ee3b71e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ee3b71efc0f8477a99f64bf0a174569ef4ea2a77))
* **security:** restrict isBase64 to safe MIME types, reject SVG (XSS vector) ([c9135d8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c9135d85c5fcac65227365983440d67bdc03c716))
* **security:** switch auth domain to .web.app and extend CSP frame-src accordingly ([9134203](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/91342039b1205b114bed30c237f6990b426f0675))
* **sentry:** dynamic import keeps @sentry/browser out of SSR bundle ([63edde6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/63edde693a697fb631c4a401c5ea28bc1c6ec826))
* **server:** guard sentryDsn URL parsing and log SSR errors to stdout ([dc9f6ab](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/dc9f6aba2819c1b6905485b39dc1675765994589))
* **server:** log listen port on startup; clarify CLI-only module guard comment ([a392a6e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a392a6e714c029b9e6b26024d1e30126f0a14798))
* **server:** per-request nonce CSP + allowedHosts for Angular 19 SSR ([469bf3c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/469bf3cfba450727923b7b60dfb83d02d277b988))
* **server:** use CSP-Report-Only in non-prod; add google.com to frame-src ([3593527](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/3593527f29415d33e9f9fdc9ec37a85345f9360f))
* **ssr:** guard browser-only APIs and configure per-route render modes ([f0cc521](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f0cc5214eb7f9f1ffe72eec443aa711d217e5c58))
* **ssr:** replace browser globals with Angular platform injection tokens ([b1d2d98](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b1d2d987c1ce8554cdb04707370dd8bae78f3576))
* **storage:** handle malformed JSON gracefully in SecureStorage.getItem ([a812511](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a81251128f45363acfc35c82f335b858519f335e))
* **storage:** recurse into per-type subfolders when cleaning orphan photos ([25ff3e8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/25ff3e85b62f231e848bad06f61c1ee853f379f8))
* **store:** batch-load test data to prevent duplicate birthday entries ([6a097b3](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6a097b3b521655822350e88f5b47415c98e3396b))
* **store:** replace createFeatureSelector to prevent NgRx init-time warning ([fbb1790](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/fbb17903c9586fad46c0974b572dadd20e108c95))
* **styles:** add cursor:pointer to circular-button mixin ([c4e6745](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c4e6745f87c08c78696dd2650dfdf004f20b56a2))
* **sync:** deduplicate birthdays by name+date during cloud-local merge ([8b243e0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8b243e045b3021673c246ec17b3109e542c0d398))
* **sync:** dispatch syncFailure when migration check throws in CloudSync ([88651c9](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/88651c9caae6ffb69d12bd0c9776294d8361fa87))
* **sync:** resolve syncing state deadlock in pushPendingChanges ([f502c25](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f502c259e4daad588e5338ed301dcd8f53d0da2a))
* **test:** improve error handling comment in offline-storage tests ([7126816](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7126816ac2003a6df286388deb331c6bf4f1a99e))
* **test:** make isFirebaseConfigured test env-agnostic for CI ([0fc4b5b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0fc4b5b919addb277ee110c37a1781c7b0119828))
* track and cleanup notification timers ([7098e7f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7098e7f0b307ec522fed50f34206eb837e7a9ad7))
* type safety, removed non-null assertion and cleaned console logs ([67a421e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/67a421e8f5d37f233eebde971211f808e5a8bb46))
* **ui:** reposition notification toast from centered overlay to top-right corner ([89f19c0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/89f19c02fa2521b3d352bfd4bc40a940a343fc45))
* unsubscribe from network events on service destroy ([af759a5](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/af759a56dce2334ce6b33107063e036acaded851))
* use track icon instead of track $index in category dialog ([450d848](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/450d8481961fdc8725e2947d32c1e3e9cc2ad068))
* validate dates in backup import to prevent data corruption ([ee3b02f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ee3b02fbe789fdd4c3cb50b0f436fc788a9f75b1))


### Features

* **a11y:** add ARIA labels, live region and reduced-motion support ([9c2cbc9](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9c2cbc91d4eacfb98b22edf11ead3fef6084561c))
* **a11y:** add figure/figcaption, sr-only data table and aria-hidden to birthday chart ([2453c61](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2453c61a66500ca5ceb4467a55d253bd01a525f1))
* **a11y:** add WCAG 2.1 AA accessibility improvements ([674f3df](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/674f3df5d80026c369837350e7646131296d2560))
* **actions:** add calendarEventIdSet and calendarSyncFailed actions ([6096db0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6096db035bedbf211ca872985e5c65f71efd92df))
* **actions:** carry birthday payload in add/update failure actions ([75f7431](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/75f7431f0589bdff2037a07bc2f5522b2b29be8e))
* add accessibility improvements for interactive elements ([4fa38b9](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4fa38b92a86820f5aa19ab42017c6b0ac151fdd6))
* add auth NgRx store with actions, reducer, effects and selectors ([316f07c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/316f07cba248e83b6b670be6ad2a9d63f8885958))
* add auth-button, user-menu and sync-status UI components ([8aafcd8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8aafcd8cd33bb8abf8dd47de86cbfbf3d5d614ac))
* add comprehensive SEO meta tags and PWA enhancements ([6b8e101](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6b8e101dcdb9dfc93bec9169ef9feef8679cbee7))
* add dark mode support for birthday list action buttons ([7059910](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/70599109482b04900847e6ea2565cee4742ccf5e))
* add dark mode support for dialogs and category filters ([6d6494c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6d6494c2bf089b06e7e28e5b52bf9f76747d10d4))
* add dark mode support for global button styles ([1362b58](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1362b582b57df563c6055dd711b98bea238e0a35))
* add dark mode support for zodiac icons ([7be2299](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7be2299c0f618b4eb8fe8af2f5ff4f5dd7c7834f))
* add Firebase authentication service with Google sign-in ([d1525bd](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d1525bdeef6b208c93d9c13ceb419841c6f1dd40))
* add Firestore cloud sync service for birthdays and categories ([1fe8938](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1fe89388478bf1bc9c5952713a8be850d40ccb1e))
* add sync coordinator service and update service exports ([c7b12dd](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c7b12dd8bd812f5acaaba5089343ca115d094e35))
* add sync NgRx store with actions, reducer, effects and selectors ([516f136](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/516f136aeeea36526ed9f710d652116d7bf8f406))
* add type-safe Google Calendar API interfaces ([198afde](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/198afde4c97a33f0a58745fdc4203af2c705c479))
* add zodiac sign calculation and logo next to birthdate in contacts ([57f94da](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/57f94daac62f1e0debfb7d5b7af660771ce6d2ca))
* add zodiac signs to Next 5 Birthdays ([ffd7895](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ffd7895c4328389ffafdd076756f87e91d149b1c))
* **app:** register BirthdayCalendarSyncEffects, remove eager Firebase init ([90f1fcb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/90f1fcbdccece3516dbe1f84c9a63bfb06c4c34f))
* **assets:** add SVG icon files for nav and action buttons ([4259a11](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4259a11a6809b46a882dc2fe9bfc57d9aa9c6edf))
* **auth:** add initializeAuth$ effect to dispatch authInitialized when Firebase loading$ settles ([6843f17](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6843f175020f25aac103126d13cc322d2b7e32c7))
* **auth:** add typed FirebaseAuthError, isFirebaseAuthError guard and mapSignInError ([73d086f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/73d086f653b8b37eb4e297d226525926e246860c))
* **auth:** i18n sign-in/out labels in auth-button and user-menu ([9508475](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9508475ff99f5616789b53353042d6a7dd022454))
* **auth:** trigger orphan cleanup on sign-in; update cloud sync and CORS config ([28af928](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/28af928da52bf49be7f87a076e388ec634f8249a))
* **backup:** return ImportResult{valid,invalid} instead of throwing on bad rows ([124ffe9](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/124ffe9e98d3ac3fccd8a473a4c033c20b08b6c1))
* **backup:** reuse BirthdaySchema and add Zod validation to CSV and vCard imports ([5ec0b20](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5ec0b2015de33f520149b29819bdebbecacd682f))
* **birthday-chart:** i18n axis labels and accessibility polish ([4c42fce](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4c42fced1bb2faa7f8b0b653ea729fd0e655c6d8))
* **birthday-item:** i18n display strings and interaction polish ([c50ae37](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c50ae37d5470b907c896538e6a6e1b930c81cec6))
* **birthday-list:** add CDK virtual scroll and responsive window signal ([7145fae](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7145faef666fb302932897e655de494cff45ed77))
* **birthday-list:** add confirmation dialog to delete and clear-all operations ([9546e61](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9546e61c82e09feb3ef2403b27417bb8d6f0a14f))
* **birthday-messages:** add icons, badges, and tooltips for configured and disabled messages ([d5c982c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d5c982c31e2510a91009547317d28974ec7744d0))
* **birthday:** add importBirthdays bulk action with atomic IndexedDB batch write ([8125d3e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8125d3e14f3643adcd3a01f7dc0ca2ed056a6c91))
* **calendar-sync:** lazy-load route via loadChildren with scoped effects ([c75a0ce](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c75a0ceadd5e994e5a10d79a65387b3658286f79))
* **calendar:** add CalendarIntegrationService and BirthdayCalendarSyncEffects ([5d2e33e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5d2e33ea62e7847b6c9f652dac897806e6fea0e0))
* **calendar:** gate CalendarIntegrationService behind calendarSyncEnabled flag ([463ce60](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/463ce60d4d8bf4e616d6d8c0cf54cbc5cc99865e))
* **calendar:** validate calendar list, event response and stored settings with Zod ([29cfae6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/29cfae626f67d0f301dc46fd1104701701563348))
* **categories:** add clearAll to wipe locally-cached category customizations ([1418d4d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1418d4d4323636b83ee5523e458b32e4811bf410))
* **category-dialog:** i18n and accessibility improvements ([5cf36da](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5cf36da9297daa47acacd7386f84c56469c12815))
* **category-store:** add failure actions and error state handling ([5333cb0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5333cb06b8d7dc0be9cb5467d20a42fc3ee7e82c))
* **category:** add icon support, filter and reassign dialog ([b2a947b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b2a947b8561e5d8bd977193a23fb2886c4e6a646))
* complete application modernization ( Routing & Performance, Type Safety:, Error Handling: & Tests & Validatidation ([1d6d139](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1d6d139afc9072e1037d4dd976b0338a68ad20b7))
* complete UI redesign with modern professional theme ([6a4015d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6a4015d3c2bbd270b97d07619473d9a59fba4137))
* **config:** add SW unrecoverable error logging initializer, wire PLATFORM_ID ([0e6678d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0e6678d7ee9cb511304d399a9454dc0ac4b0fadc))
* **confirm-dialog:** i18n fallback Cancel/Confirm labels ([2b38041](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2b38041694de048ecccf68942b078da7be4bbdc0))
* **core/constants:** add time constants module ([95a589c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/95a589c20059607ce72bee890e0f1ed489d7465f))
* **core:** add centralized Google API error handling service ([c98f5cb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c98f5cb0ccfc2f6ddf1f9f3a2727f871aed982f5))
* **core:** add Google Identity Services type definitions ([0d33fb2](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0d33fb221665869e7e24954fdf0189a078b91d9a))
* **core:** add robust ID generator service ([1651f5c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1651f5c1b5183bcb105d88ad59b3f2614e6df870))
* **core:** add SecureStorageService for encrypted token storage ([1029ef0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1029ef0b38a2611d99b6199d7d6aad8fa9bb6a6c))
* **core:** add sender identity settings with dialog and header integration ([c77451d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c77451db510a8ed5352fad234628d8b25d6e1707))
* **core:** extract birthday business logic into dedicated BirthdayService ([08cca0d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/08cca0d45920bf075c86d29d2a4209c90f1b64fd))
* **dashboard-facade:** i18n next-birthday label, persist category filter, fix orphaned name ([62197c6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/62197c66a6489848c6aa900a3e1d344bc4525e47))
* **dashboard:** add 'All Birthdays' aggregate card as first entry in category filter ([232fc71](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/232fc71e50ad6393ef383f03b8e4e17f759dacbd))
* **dashboard:** add Zod validation to birthday edit dialog flow ([78a2608](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/78a260823f8bb9f71ec4cf67839b0df865788123))
* **dashboard:** bypass [@defer](https://github.com/defer) in Cypress env via window.Cypress forceLoad flag ([7d04b7f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7d04b7fce315c4e9b137af3221fb3b12323b761c))
* **dashboard:** update birthday list and facade with Zod validation on edit ([911967e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/911967e9b795f8b18602c11bc38d3073bf0f161c))
* **dashboard:** update birthday list, chart, stats and edit dialog ([c746626](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c746626220b6777e5e1d5d5b082d05a44f93be79))
* **deploy:** serve Angular SSR via Firebase Cloud Functions ([b756ac9](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b756ac9a54a667a6d9adde20a07740071b2c88ff))
* **develop:** full architecture overhaul — NgRx, offline sync, Google Calendar, scheduled messages ([3e73510](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/3e7351064272157b538095a8593b36ed75f425f8))
* **edit-dialog:** add contact fields with inline validation and visual feedback ([a520d7c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a520d7cd23bb36b20e7cc30f1b5c62df5626f681))
* **edit-dialog:** add input validation for email, phone, and telegram fields ([c547443](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c547443fb7f5e64432fddcf37a8fa006328bb547))
* **edit-dialog:** i18n all labels, add field-valid/field-error visual feedback ([4ca4b9d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4ca4b9df6e0157f77b4b48364099af564547846c))
* **effects:** clean up Storage photos on birthday delete, delegate orphans to cleanup service ([ced2564](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ced2564f33d09e32428fb6d40b184bc7d946aa99))
* **effects:** show retry notification on birthday CRUD failures ([4f69c7e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4f69c7e2e4551cd5a217d4706c10cfb2bc8185d3))
* **env-init:** add .env.local parser with 3-level priority loading ([c4358b8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c4358b8644190b16a6319eb7373f80c1635f582c))
* **error-reporting:** rewrite with IndexedDB persistence and batch flush ([3db2747](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/3db27478724cbb2ec81315b4f5c52dd40983272a))
* **errors:** add AppError/IdbError typed class hierarchy for structured error handling ([65a1b26](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/65a1b26ff7a410141882a2a3320da7aadf7c42fa))
* **facades:** add Angular Signals support to facade services ([e4d6cc3](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e4d6cc360edff58d233643b5111e17fc550364df))
* **feature/scheduled-messages:** add scheduled message management with dialog and service layer ([c747aeb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c747aebc82e8e85b81d144dfda021eee1df09f57))
* **firebase:** add Storage security rules for user photo uploads ([448429e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/448429e915f2e9f1f571482bc04e6f85ef4877ad))
* **firebase:** add storageGetters accessor bag for testable Storage access ([c2768bc](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c2768bcfbcf21aa095882428624c79b7db960461))
* **firebase:** export FIREBASE_OPTIONS token and add checkFirebaseOptions guard ([f56e56d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f56e56d489f6a65e2668de9c53234a90cf582f2a))
* **firestore:** add resource-exhausted to retryable codes with jitter to avoid thundering-herd ([334757f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/334757f30c7c55ff62e861bde9fcadbd602e78d2))
* **flags:** add FeatureFlagsService kill-switches for cloud/calendar sync ([7c7f5bd](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7c7f5bd50e018d082bcbd97d3095e8573cd24c2a))
* **footer:** add smooth scroll-to-top on logo interaction ([6e38532](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6e385329ec78d1a6881f1f68f50c6a607f1550ca))
* **footer:** redesign footer with logo, social links and centered layout ([84d505e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/84d505e34e86cd56b918a929cf850d9ffbfa3777))
* **form:** add name character counter and reminderDays min/max error messages ([d2be967](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d2be967558289014cec9f7b7a5165538d05d7c89))
* **gdpr:** wipe all local data sources and fix nested photo listing on account deletion ([e9a4921](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e9a4921e9cb2b5837612703b041dda2572ef262e))
* **header:** auto-hide on scroll down, reveal on scroll up ([1660368](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/1660368826c7180626200490ddaa4d69cfe3b7fe))
* **header:** convert notification button to enable/disable toggle ([9033e6a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9033e6aedcdc681ae8602547d28778ede74fcf50))
* **header:** i18n settings menu, import/export and user-menu polish ([b2e76cb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b2e76cbea1312fee71000ad585a74a331bf83cd4))
* **header:** mobile routerLinkActive, sign-in-direct for unauthenticated nav ([bc83fae](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/bc83faed06dd19458a6e49551884f8587c3374c3))
* **home:** add name minlength/maxlength and notes maxlength validation ([a25dde0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a25dde0cc209165e13e16b883b15c20a9966e797))
* **home:** auto-collapse birthday form after successful submission ([c6c54b6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c6c54b61bffb0b2c954fd75bbb117b84cfcf4f64))
* **home:** replace height animation with translateY for snappier form expand ([55503b5](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/55503b585f4cdf373e4aa47bcabe2a05cf34b7cf))
* **i18n:** add AUTH, EDIT_DIALOG, REMEMBER_PHOTO and NOTIFICATIONS keys ([a6ec012](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a6ec012b852db459eeb64843905667f64da36267))
* **i18n:** add CRUD error keys and RETRY label (en + it) ([8162742](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8162742b45226ba23026706e0df644d5ae77e29a))
* **i18n:** add IMPORTED_WITH_SKIPPED and reminderDays error keys; drop syncMode ([e77d503](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e77d503346233c5c729f84e7818540db84f8b48b))
* **i18n:** add locale service and translation infrastructure ([58c54ff](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/58c54ffce109ed4dbdd6441bac0898680d168400))
* **i18n:** add markAsSent translation keys (en + it) ([5c48d49](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5c48d49ab51c0d7e575c439fcce375228f59582e))
* **i18n:** lazy-load Italian locale, English stays embedded ([807a20d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/807a20d121d8471ab3500fd1870682d987febc9f))
* **idb:** auto-migrate stale records on getBirthdays, stamp _dataVersion ([6d69f0c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6d69f0c9c6dfd51eb2c02ca8243e4195cbf712be))
* **import:** show warning toast for skipped rows, dispatch only valid entries ([8847a87](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8847a875c78743494ac0e0aa4b73c9ffcea5a097))
* improve data management cards layout and styling ([5d205cf](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5d205cffce5778a92935d1edaaf5c5a2cec19fc9))
* **indexeddb:** add clearAllStores for full local data wipe ([e277565](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e277565e627ee33844058ae36b520aef1af24a6c))
* **indexeddb:** replace inline onupgradeneeded handler with versioned migration map ([56c9c88](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/56c9c8887b120dbce6513837c60b774eea95fdd0))
* integrate Firebase auth and sync into app bootstrap ([0bdb3af](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0bdb3af1d9d70c7aab2ba43cff2c356b09ec2a5a))
* **legal:** add Privacy Policy, Terms, GDPR delete-account ([7d77345](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7d77345a9f2e7d17cfe9cfb21b662e1fbcf5e703))
* **message-dialog:** show contact info, sort by nearest birthday, open edit for missing contacts ([e9f636b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e9f636bae061b2b1fa9e7fa184ae7bb5c6621aa9))
* **message-schedule-dialog:** add no-birthdays alert and contact validation in birthday selector ([03d56ec](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/03d56ec7ce5b5d504053ff4ce49d7d0b1ca10862))
* **message-scheduler:** add markAsSent button and sent badge ([6455793](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6455793c30270ab33accc1387f5a33f1fb3895a0))
* **message-scheduler:** block message scheduling when birthday has no contact info ([ab88ff8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ab88ff819d7b59123f2aad132ec01b6862982908))
* **message-scheduler:** i18n test notification template key ([ddceef0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ddceef000d30c7b58cfedcc4f4aab5c15bac28a4))
* **message-scheduler:** integrate wish-link actions with DomSanitizer support ([0aa038a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0aa038a7e8a613c1396569391c87075b9ec1ec3d))
* **migration:** add IdbDataMigrationService for field-level IDB upgrades ([a5dc7ec](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a5dc7ec42387f7cc1f0150665790083229fe22ca))
* **model:** add rememberPhoto field to Birthday interface ([47c30d0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/47c30d01d9bd71c11c6e9871170e059934b69b0f))
* **model:** extend Birthday interface with email, phone and telegram contact fields ([045c5ad](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/045c5ad712a52c86bf174d429ec72241ed0b6b90))
* **nav-strip:** active-state pill, auth-gated Messages link with lock icon ([172e93b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/172e93ba8ac5eb111601dd55fb137abdd6fa53e3))
* **network:** add periodic HEAD health-check every 30s ([aa536d8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/aa536d8454aa435e028d8ed54707f4a557e73c95))
* **notification-banner:** persist dismiss state via SecureStorage ([84583da](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/84583da2f27e33586ea6090134ea7c40edf0ed2a))
* **notification:** add action button with callback to NotificationService ([dab3889](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/dab3889e32379c4d98eb6f797fca4c5cf7655319))
* **notifications:** add notificationsEnabled toggle with localStorage persistence ([8fcbd92](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8fcbd925017bdc2a0b3bc7cde3b7c0bdccec736e))
* **notifications:** guard browser notifications with enabled toggle check ([a411619](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a411619ddecf0909b1c32ff40f960871bed4e984))
* **notifications:** implement type-based auto-dismiss with configurable durations ([33859a1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/33859a1c815f4310d465fd1b50932a47a90a458f))
* **notifications:** improve push service and add message scheduling UI ([efe850d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/efe850d674e5788b82e0388cbf491d49750caded))
* **notifications:** undo on delete, retry on load/clear/test-data failures ([a493e2b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a493e2b6c0cb77a6614e6aa9c8053234cb4f1235))
* **observability:** integrate Sentry for production error reporting ([7ec8283](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7ec8283d61ff65c162f5020c7b5504ea048aba12))
* **observability:** integrate Sentry for production error reporting ([2712b62](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2712b62fca1a707b924c4345b2716c9f3b1db048))
* **photo-upload:** add disabled input, block upload/remove while saving ([5633383](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5633383772f9847b74498faf4f901d499c0d136e))
* **photo:** validate file size client-side before upload, throw if >7 MB ([ec59eb3](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ec59eb38b94b02845dc482c15988ac16716475df))
* **push:** add precise browser timeout scheduling with polling fallback ([ad20b16](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ad20b16655bdd9b8046c2a036024b293baf22010))
* **pwa:** add dark-mode theme-color meta tag ([05e1a8f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/05e1a8f8d9e041260f5108ce61055f24af1bbaa1))
* **remember-photo:** i18n tooltip key for download/share hint ([2ae090f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2ae090f2942e6f877a08f33fb2b6f05cf1aa0185))
* **router:** protect authenticated routes with authGuard ([ccc94e3](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ccc94e3a72eae1efcd3db85357bab9e575c866c6))
* **routing:** add selective preloading strategy with network-aware idle-time loading ([05b4dac](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/05b4dac9bdd93f29d8b5b42584e22fd59a1e4299))
* **scheduled-messages:** add empty state alert when no birthdays exist ([56ab8a3](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/56ab8a3da30c630c2ca08632687a257114fd31a6))
* **scheduled-messages:** add wish-link actions, update templates and sort by proximity ([734a5ca](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/734a5cacc40aecb79cd1d425914e63886646b8ad))
* **schema:** add sanitizeBirthdayData and rate-limit firestore writes ([59a4108](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/59a41085de2b7677004ce78fccdd9519a092cd94))
* **schema:** add Zod schemas and data sanitization utils ([c7bc586](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c7bc5867963a4126fe1b78e24c4595fe1b25d3f6))
* **schema:** add Zod validation schemas for Birthday, Category and ScheduledMessage ([7da952d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7da952deeaf5712e8687538b981a6a74de778036))
* **schema:** remove syncMode from GoogleCalendarSettings ([bf98a79](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/bf98a79d30d8a633b046316f18deeed7eae4662b))
* **scss:** add reusable mixins and consolidate shared styles ([4b88baf](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4b88baf2326821733c7313a54d24153f54223035))
* **scss:** extend mixins library with card and button patterns ([b4ad17b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b4ad17b45289a8bcbe5967e85db35df6930805f0))
* **security:** extend Content-Security-Policy to support full Firebase service suite ([b7ffc74](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/b7ffc746a10b7de4c3d18426e3869dc02d986d8d))
* **security:** implement CSP, security headers and input sanitization ([8970924](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8970924cd107c891d54538ea3e181571dfeefdfa))
* **selectors:** add selectOptimisticBackup and selectDashboardViewModel ([05e8f28](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/05e8f28ffc8c3dbed4cfe026b35f7b0067f70305))
* **sender-settings:** add sender full name field ([2448c98](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2448c9879809810253538d4742f770928017e806))
* **sentry:** enable hidden production source maps, document setup ([9bc3fd1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9bc3fd1ecf4e0cd801f24ca8d919d6fb51389332))
* **server:** add CSP nonce, rate limiting and helmet to SSR server ([42c0363](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/42c036313aa112dfdd55a78a7cfaa1cdfb61e905))
* **server:** apply CSP nonce to inline style tags for Material/SSR ([922a20e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/922a20eeeb7609bc21166c64220f25b6b93aa13e))
* **shared:** add reusable ConfirmDialogComponent with gradient and dark mode support ([35162fb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/35162fb81d5e139e3a167f307517cd888d8e181b))
* **shared:** i18n sync-status, network-status, notification-permission-banner ([54473e9](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/54473e965bae40b04b3e8a52c480f92b082ad695))
* **ssr:** enforce nonce-based CSP, compression and rate limiting ([7ed295b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7ed295bb18ea81aac806b7c102d5cd7978a8b89d))
* **storage:** add deletePhotoByUrl and rememberPhoto support to PhotoStorageService ([4f63092](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4f630929bbbd9ecdfa7c6a3c15ee91209dc0eeac))
* **storage:** add OrphanPhotoCleanupService — daily scan of unreferenced Storage files ([a0b3262](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a0b326280b3317be3bf4301776323b61a58d8385))
* **storage:** add retry logic with exponential backoff to IndexedDB operations ([9796a9e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9796a9e1c907dd3a174951935659f4bb5b604cbe))
* **storage:** create IndexedDBConnectionService for centralized DB access ([03b305e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/03b305e8efd603a0b8d6e6546e02ebba212cbfce))
* **storage:** integrate Firebase Storage for photo upload, CDN and deletion ([28d44a8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/28d44a816e67e34bdd87d0d7e8d9dde64fd3c964))
* **storage:** validate all read paths with Zod and add ScheduledMessage CRUD to IndexedDB ([f876d03](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/f876d03dafdaa2d076e50585439435e28eecc6d1))
* **storage:** validate birthday and scheduled message records from IndexedDB with Zod ([637f28c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/637f28c335568f1c4debea9a476a86c2907e44d6))
* **store/birthday:** add calendarEventIdSet action and reducer ([8c24dce](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8c24dce229621e2d541c5e2d882403070db0e907))
* **store/birthday:** split loading into saving, deleting, syncing ([6b252ba](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6b252ba2cc42dcffe847180a45fb3735a6f729c9))
* **store:** extract selectSortedBirthdays and add selectFilteredSortedBirthdays ([44d491a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/44d491a8ce9f8581c413eb0477c15f54c8de9594))
* **store:** implement optimistic update reducer with rollback ([499eda1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/499eda130912ca6d57b7f55ad81a4701961c4941))
* **store:** wire optimistic updates through effects ([3affeab](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/3affeabd9c4e4ea60f1cbb7d1dc12e3fc2e58c87))
* **styles:** add centralized responsive breakpoint mixin system ([e476b21](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e476b21cf10ff7705c2bc67dec5c700ca9360d22))
* **sync-effects:** show retry notification on sync and migration failures ([0f7de46](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0f7de4632a98adfeff20e764a1bbec3c897eb4f2))
* **sync:** add BatchProgress state, batchSyncProgress action and selector ([408065e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/408065ef083c964eb80720b8e3d5c413e1843c58))
* **sync:** add pending changes queue with retry and cloud listener teardown ([0689e5a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0689e5ae07c0181d622bf7d0d01276273d8de9b7))
* **sync:** add sequenceNumber to PendingChange for causal ordering ([7f3d4d9](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7f3d4d9efeb0e7240c9924ccb8990d99be36b7d5))
* **sync:** add typed overloads and Zod validation at queue boundary ([838134c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/838134ca5d06e0b23afa904ee7588472a7706e77))
* **sync:** extract BirthdayMergeService with configurable strategies ([a151bb7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a151bb75da080b1fd57650643bfd225286159c6d))
* **sync:** gate CloudSyncService methods behind cloudSyncEnabled flag ([e3bda6b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e3bda6b4fd85a10477907c4883dc199d75d240bc))
* **sync:** process pending queue in batches of 100, emit progress actions ([0788d83](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/0788d838ce1934311c883c63777cf909ab64b9af))
* **sync:** sort ops by sequenceNumber and block entity on failure ([5ade44b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5ade44b2f9a5bd00ed6801f917bdbaa579b4bb44))
* **theme:** add FAB component theming support ([4142af5](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/4142af5dc1891d9a26800f3fed1e7a05929c9a21))
* **theme:** orchestrate transition animation class in ThemeService ([3035a02](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/3035a02b17831d396c5e48aa38ca928263a7134b))
* **utils:** add parseLocalDate and toDateString for timezone-safe date handling ([ede6c77](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ede6c77f48cf33560ea245eaf80922c63dcc0583))
* **utils:** add wish-links utility for multi-channel message delivery ([5c4eb47](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5c4eb47173e78148de443045e3b64acb4ac042d7))
* UX polish, full i18n, nav active states, CSP hardening, CI fixes ([8812942](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/8812942b190c6a66fae5aae930ba95e5dd9031b0))
* **zodiac-icon:** show visible text label below zodiac symbol ([15906fc](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/15906fc41de437e381d7a42d73fc3bb5054be3c8))


### Performance Improvements

* add explicit image dimensions to prevent layout shift ([e7dc2c0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e7dc2c0ff51a39a77608b4167a0d24bfddf5fdb2))
* add lazy loading and async decoding to all images ([fb93c28](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/fb93c28fb26b9b302cf252211f56839877de2963))
* add resource hints for Google Fonts ([598ece6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/598ece67d9c99984cec713cc095d791cb0e1f5a8))
* add WebP support with picture elements ([7c23614](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7c236145c345b1597de83290c97f4125dd769c6d))
* **assets:** compress logo.png, remove logo-reminder.webp ([7a0abe2](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7a0abe27811892266acbc312b13620b83d5261fd))
* **auth:** adopt NgOptimizedImage for Google Auth avatar images ([5ffb574](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5ffb57459c7cd632f2409ae3e8f6ec9c43d9b667))
* **backup:** dynamic-import Zod schemas at import call sites ([d3c41a0](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d3c41a0a9912f030fbc36efc80c98f587007298a))
* **birthday-form:** dynamic-import birthday schema at submission ([2b784b6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2b784b677d6d2500833261c6454eca0a158f1620))
* **birthday-item:** pre-compute age, consolidate avatar @if/[@else](https://github.com/else) ([a29195f](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a29195fb655531acc90dbb1ee32586efb7f4eda2))
* **birthday-list:** eager-schedule schema import on component init ([471c7d8](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/471c7d85c9808ca0894c43532f739e7681fcad0c))
* **birthday-list:** replace CDK virtual scroll with native smooth scrolling ([938037a](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/938037a17bb0857991927e57be8889c123278752))
* **bundle:** implement lazy loading for Dashboard component ([09fc4fc](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/09fc4fca1498732d5fd05740a2ecf16ad450cf88))
* **bundle:** optimize dependencies and enhance performance budgets ([09c77db](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/09c77dba74167d4070b1674248275b0cedbfbb5d))
* **bundle:** optimize Material theme and dependencies ([528d5ee](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/528d5ee376e6a29eefd8dd0cd6725443b0c211b9))
* **bundle:** optimize production bundle size ([ec95931](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/ec9593189c150211576b0ae4ed2a7fb4bd8f5f33))
* **calendar:** implement lazy loading for Google Calendar module ([9c3d3be](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9c3d3be1a1e5e4d5f11aa4340a3bc1c2b4246265))
* **calendar:** lazy-import birthday schema in GoogleCalendarService ([25fa90e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/25fa90eda6e08c7c1ad388d9352e722c59878177))
* **dashboard:** implement virtual scrolling for birthday list ([6b88c46](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6b88c46bed0bc24cef00da72c3120f366f3a10d8))
* **effects:** lazy inject GoogleCalendarService ([314bf81](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/314bf81bc296d80d21d395f7df9b4b070f64b952))
* **effects:** replace IDB getBirthdays() scan with selectBirthdayById ([7906a2b](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/7906a2b941a123706c9a28074ec9fa4b4897f765))
* **firestore:** lazy-import Zod schema module ([3957846](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/39578466cdeab6db70b3e2cc546bb0fd1dee9cea))
* **html:** preload hero logo, switch fonts to display=swap, remove GSI script ([bb239e7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/bb239e7725afe284698c3924178fad0d63ed00e9))
* **idb:** lazy-import Zod in IndexedDBStorageService — defers schema parse cost to first IDB read ([c7b8be7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/c7b8be709f21e9d41aa3ac8fd725b054d372a55d))
* **images:** add width/height and loading=lazy on footer logo, add data-testid ([5be2d70](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5be2d704e977f022f63038fed8bd3f048f3f3fb9))
* implement OnPush change detection (Phase 1) ([5899454](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/5899454cc41a22ac4b4268728f04bc27f9230dca))
* implement OnPush change detection (Phase 2) ([d4c9f46](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d4c9f46f8aabcd9b4b5ff725dff0fd359a96d3b6))
* implement OnPush change detection (Phase 3) ([2107bd1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2107bd178f6a505f9ece8909c0db552b015484de))
* **message-indicator:** replace getters with pre-computed properties ([305e8b6](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/305e8b68ec073ab4857b5f302b38d22cd7abedce))
* **message-scheduler:** pre-compute formatted dates in enrichedMessages ([9a65354](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/9a6535475e4f930874ac59c42048f7b383ef28c8))
* **messages:** pre-compute view models to eliminate template method calls ([a4ec36c](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/a4ec36c452338619c3f7080b0a92e02ce1071b84))
* **notifications:** implement RxJS pattern for browser notification polling ([d33d1d7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/d33d1d7f73c282359a4c91d9934fc25f11f63f60))
* optimize bundle size and improve loading performance ([fc2e883](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/fc2e8832d43d0ce8aba1e1ea858ca81acbdfe5ba))
* optimize images with compression and WebP format ([2a3a3f1](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/2a3a3f14bd3e8b84f021e1243d5f40c98c84d8f9))
* reduce notification polling interval to minimize resource usage ([56674af](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/56674af27dc247acb8c9934d326ac9c9744db5e2))
* **schedule-dialog:** pre-compute hasContact/contactInfo in signal ([935b7eb](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/935b7eb509729209dbc551f26259596bbfa5c374))
* **scheduled-messages:** pre-compute priorityLabel in view model ([299912e](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/299912ed3e6796601ba893ef86eaa08257aa6bf9))
* **selectors:** memoize parameterized selectors by key, add selectOptimisticBackup ([724d916](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/724d916de033760666b18317297de99c3acba9c3))
* **styles:** scope theme-transition rules to .theme-transitioning only ([56ee635](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/56ee635110ae71cf69c1589b990e173d7ad6a67e))
* **sync-status:** convert tooltipText() method to computed signal ([6f6bab7](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/6f6bab7770a725c4092b0ec8c884967caf761f37))
* **sync:** dynamic-import Zod schema in SyncQueueProcessorService ([e4a6cb5](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/e4a6cb543be987871c4e2d2da2f7bfa6e201f3e7))
* **theme:** optimize Material core theme loading ([15cb29d](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/15cb29d707fccb5bf40a60233738835b64e52a3b))
* upgrade all components to OnPush change detection ([47f1cdf](https://github.com/MihaelaAghirculesei/birthday-reminder-pro/commit/47f1cdf5f930546d297607e7b061bf0b8c217e59))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- Dashboard stats component layout and styling refinements
- Dashboard facade service improvements and spec updates

---

## [0.6.0] - 2025-10-01

### Added
- Full internationalisation (i18n): English embedded, Italian locale lazy-loaded on demand
- Translation keys for auth, edit dialog, notifications, CRUD errors, birthday chart axes, category dialog, birthday items, remember-photo tooltip, sync/network status banners
- Cloudflare Pages deployment with `_headers`, `robots.txt`, and `cors.json`
- Lighthouse CI gate (runs against SSR server, enforces CSP-XSS and minification checks)
- OWASP Dependency-Check in CI pipeline
- Angular 19.2 upgrade with bundle budget tuning
- `preview` npm script for local SSR preview
- `kill-port.js` cross-platform script replacing fkill-cli

### Changed
- Angular upgraded from 17 to 19.2.22
- All components migrated from `CommonModule` to granular Angular standalone imports
- All services and dialogs migrated from constructor injection to `inject()` API
- Birthday form expand animation switched from height to `translateY` (snappier)
- Category filter: replaced `role="button"` div with an absolutely-positioned `<button>` overlay (a11y)
- Notification dismiss replaced with `role="status"` / `aria-live` region (a11y)
- Nav strip: active-state pill, auth-gated Messages link with lock icon
- Header: mobile `routerLinkActive`, direct sign-in for unauthenticated users
- CI serialises unit and e2e jobs; removed Firebase deploy step; port fixed to 4300

### Fixed
- `fix(auth)`: Google sign-in result dispatched directly from components (no intermediate effect)
- `fix(firestore)`: `birthDate` stored as plain string to prevent timezone shift
- `fix(auth-effects)`: observer errors fall back to `authStateChanged({ user: null })`
- `fix(csp)`: per-request nonce on SSR, font and avatar domains in `connect-src`, `frame-src` derived from `environment`
- `fix(security)`: added COOP header, removed `unsafe-hashes` from CSP
- `fix(notifications)`: `requestPermission()` moved out of service init — requires explicit user gesture
- `fix(a11y)`: promoted `h3` to `h2` in dashboard and home for correct heading hierarchy
- `fix(idb)`: write transactions resolve via `oncomplete`/`onabort` — prevents double-settle

### Performance
- Hero logo preloaded; fonts switched to `display=swap`; Google Sign-In preconnect script removed
- `logo.png` compressed; `logo-reminder.webp` removed
- Zod schemas dynamically imported at call sites (birthday form, backup, calendar, IDB, Firestore)
- Theme-transition rules scoped to `.theme-transitioning` only
- `footer logo` gets `width`/`height` and `loading=lazy`

---

## [0.5.0] - 2025-06-15

### Added — Feature #12: Automated Testing Suite (CI-runnable)

- **`cypress/e2e/indexeddb-source-of-truth.cy.ts`** — 3 tests: verifies IndexedDB write before reload and `syncStatus=local-only`
- **`cypress/e2e/network-errors.cy.ts`** — 4 tests: blocks Firestore/Auth via `cy.intercept`, verifies graceful degradation
- **`cypress/e2e/accessibility.cy.ts`** — 6 tests: axe-core (critical/serious violations only), skip-link, form, dark mode, chart
- **`cypress/e2e/chart-viewport.cy.ts`** — 9 tests: verifies deferred chart renders, ARIA structure, bars, sr-only table, current-month highlight
- `cypress-axe` and `axe-core` installed as dev dependencies
- `cy.mockDeferViewport()` command — patches `window.IntersectionObserver` before `cy.visit()` so `@defer(on viewport)` blocks render in Cypress headless/CI
- `cy.seedVisualTestData()`, `cy.enableDarkMode()`, `cy.disableDarkMode()`, `cy.disableAnimations()` commands
- `disableAnimations()` forces `opacity:1` on Material dialog containers (fixes dialog visibility in CI)
- `ARCHITECTURE.md` documenting overall system design

### Changed
- `allowCypressEnv: false` in `cypress.config.ts` to suppress Cypress 15 security warning
- Visual regression suite excluded from `e2e:headless` CI run (screenshots are local-only)

### Fixed
- **`skip-to-content.component.ts`**: replaced `top: -40px` with `clip: rect(0,0,0,0)` — axe no longer flags contrast when element is hidden
- **`birthday-chart`**: `figure`/`figcaption`, sr-only data table, and `aria-hidden` on decorative elements
- **`category-icon`**: added `role="img"` and `aria-label` to wrapper
- **`settings menu`**: `aria-label` and `aria-hidden` on all decorative icons
- **`import-export menu`**: `aria-hidden` on decorative icons

---

## [0.4.0] - 2025-05-01

### Added — Feature #11: Visual Regression Testing

- **`cypress/e2e/visual-regression.cy.ts`** — 13 snapshot suites across 7 scenarios (no external service, Percy removed)
- `cy.visualSnapshot(name)` command → `cy.screenshot(name, { overwrite: true })`
- `cy.seedVisualTestData()` — writes 4 fixed birthdays directly to IndexedDB (version 4) then reloads
- `cy.clock(new Date('2026-03-24T12:00:00.000Z').getTime())` frozen date for deterministic day-countdown counters
- `e2e:visual` and `e2e:visual:ci` npm scripts (latter uses `start-server-and-test`)

### Changed
- `clearIndexedDB()` properly awaits `deleteDatabase()` calls (was fire-and-forget)
- DB version bumped to **4** (v3→v4 added `errorReports` store)

---

## [0.3.0] - 2025-03-15

### Added — Feature #10: Firebase Storage Photo Optimisation

- **`PhotoStorageService`** — uploads photos to Firebase Storage, stores CDN URLs instead of base64 blobs in IndexedDB and Firestore
- **`OrphanPhotoCleanupService`** — daily scan of unreferenced Storage files; triggered on sign-in
- Client-side file-size validation before upload (max 7 MB)
- Firebase Storage security rules (`storage.rules`) scoped to authenticated users' own paths
- `deletePhotoByUrl` and `rememberPhoto` support in `PhotoStorageService`
- `storageGetters` accessor bag for testable Storage access
- Offline base64 fallback when Firebase Storage is unreachable
- `firebase/storage` SDK lazy-loaded alongside auth/firestore (never downloaded by anonymous users)

### Changed
- Photos in IndexedDB and Firestore migrated from base64 blobs to CDN URLs on first sign-in
- Upload/remove buttons disabled while a save is in progress
- Initial bundle remains ≤ 1.50 MB raw / 300 kB gzip — no budget warnings

### Fixed
- `base64ToFile` rewritten as async using `fetch` API
- Merged winner photo uploaded to Storage when both local and cloud records contributed to a merge conflict resolution
- `SecureStorage.getItem` handles malformed JSON gracefully

---

## [0.2.0] - 2025-01-20

### Added — Feature #9: Firebase Auth + Firestore

- Google Sign-In via Firebase Auth (`signInWithPopup`)
- Firestore bidirectional sync: local IndexedDB ↔ cloud (merge strategy on conflict)
- `AuthService` with `onAuthStateChanged` listener and `__Secure-fb_auth_hint` cookie for returning-user detection
- `SyncService` + NgRx sync store (`syncStatus`, `lastSyncAt`)
- Lazy Firebase SDK loading — anonymous users never download Firebase bundles (~510 kB)
- `isFirebaseConfigured()` guard for placeholder credentials (no runtime cost)
- `initFirebase()` idempotent initialiser shared across concurrent callers
- `getFirebaseAuthModule()` / `getFirestoreModule()` lazy accessor functions
- `APP_INITIALIZER` does **not** call `initFirebase()` — purely demand-driven
- Firestore write rate-limiting with Zod schema validation (`sanitizeBirthdayData`)
- Exponential backoff with jitter for transient Firestore errors (incl. `resource-exhausted`)
- Auth-gated UI: user avatar, sign-out button, sync-status banner, network-status indicator
- Orphan birthday cleanup on sign-in (removes local records deleted on another device)

### Changed
- `AUTH_HINT_COOKIE` stored as `__Secure-fb_auth_hint` (`Secure; SameSite=Strict; Max-Age=30d`) — JS-readable, not HttpOnly; auto-expires; CSRF-safe
- Anonymous sessions: Firebase never loads; loading spinner resolves immediately
- Returning users: Firebase loads async, then `onAuthStateChanged` fires
- Bundle budget: `maximumWarning: 1.6 MB`, `maximumError: 2 MB`

### Fixed
- `birthDate` stored as plain string in Firestore to prevent timezone shift on read-back
- Auth state observer errors fall back to `authStateChanged({ user: null })`
- `orphan-cleanup` converted from fire-and-forget to a catchError pipeline

---

## [0.1.0] - 2024-09-01

### Added — Initial Release

- Angular 17 standalone app with Angular Material design system
- Birthday CRUD: add, edit, delete with form validation (Zod schemas)
- Dashboard with statistics: monthly chart, next birthdays, age stats
- Search and filters: search by name, filter by month and category, sort options
- Category system with colour-coded filtering and overview stats
- Notification system: browser push notifications with permission prompt
- Scheduled messages: per-birthday custom message scheduling
- Undo on delete with snackbar action
- Double-click quick-edit for birthday names
- Inline editing for birthday cards with auto-save
- Photo upload and "Remember Photo" sharing feature
- Zodiac sign calculation and display
- PWA support: offline mode via IndexedDB, service worker, auto-sync queue
- Google Calendar integration: bidirectional sync, recurring age-calculation events
- Import / Export: JSON and CSV backup and restore
- Dark mode with system preference detection and manual toggle
- Responsive layout with mobile navigation strip
- Angular SSR (server-side rendering)

[Unreleased]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/releases/tag/v0.1.0
