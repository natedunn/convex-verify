## [1.2.2](https://github.com/natedunn/convex-verify/compare/v1.2.1...v1.2.2) (2026-04-07)


### Bug Fixes

* **ci:** restore oidc npm publishing ([ba874d0](https://github.com/natedunn/convex-verify/commit/ba874d0c435bf5def707ac6d78649518be6b4522))

## [1.2.1](https://github.com/natedunn/convex-verify/compare/v1.2.0...v1.2.1) (2026-04-07)


### Bug Fixes

* **ci:** pass NPM token to release step ([61f0fbd](https://github.com/natedunn/convex-verify/commit/61f0fbde6317971eee52787a96a61c09671a51b6))

# [1.2.0](https://github.com/natedunn/convex-verify/compare/v1.1.0...v1.2.0) (2026-04-07)


### Bug Fixes

* **ci:** remove broken npm upgrade step ([77bc7c3](https://github.com/natedunn/convex-verify/commit/77bc7c3ca6b68a724d86813add4d88c29ce3a358))
* correct uniqueRow field-count guard to use fields.length < 2 ([45ee055](https://github.com/natedunn/convex-verify/commit/45ee0554b9d1d9eb76ebcadf7393e54ed15c2c84))


### Features

* rewrite verifyConfig inline API ([6b456ef](https://github.com/natedunn/convex-verify/commit/6b456ef6169fd0076b249d6c956549f84426fe85))


### Performance Improvements

* avoid duplicate map(String) in stripProtectedPatchColumns ([38b53da](https://github.com/natedunn/convex-verify/commit/38b53da5a723eb5976325a2061e710cce6f7ec2d))
* precompute Set for stripProtectedPatchColumns filter ([2576156](https://github.com/natedunn/convex-verify/commit/257615699d307e650d69b9d6daf1b59061873560))

# [1.1.0](https://github.com/natedunn/convex-verify/compare/v1.0.5...v1.1.0) (2026-04-03)


### Bug Fixes

* apply review comments — terminology, types, and timestamp bug ([eb97710](https://github.com/natedunn/convex-verify/commit/eb97710c2cab68e85257d816721c9c2c74512e88))
* use function form for per-insert createdAt default in example app ([43e46c4](https://github.com/natedunn/convex-verify/commit/43e46c462c5bb30a002d9eea8ca11b5223f00ee9))


### Features

* allow plugins to transform/mutate data, not just validate ([652ccdb](https://github.com/natedunn/convex-verify/commit/652ccdb8aaad0967d9d4cb6237f82065c0700013))

## [1.0.5](https://github.com/natedunn/convex-verify/compare/v1.0.4...v1.0.5) (2026-01-20)


### Bug Fixes

* **ci:** changes for pnpm ([1363f60](https://github.com/natedunn/convex-verify/commit/1363f600902347169f8461e767bfea7c4b4a45ef))
* **ci:** lets handcraft these fixes ([760978b](https://github.com/natedunn/convex-verify/commit/760978b56b94d823e2f77dfba34bc4ebcbb2b6ca))

## [1.0.4](https://github.com/natedunn/convex-verify/compare/v1.0.3...v1.0.4) (2026-01-19)


### Bug Fixes

* **ci:** fix repository URL and add trusted publish setup action ([c9ae516](https://github.com/natedunn/convex-verify/commit/c9ae5162b5d81fbef39d84a50c2bbb78796293b4))
* **ci:** simplify release workflow to official semantic-release pattern ([66b42d1](https://github.com/natedunn/convex-verify/commit/66b42d1b3860c0a4471ec2c82558fc286ce38534))

## [1.0.3](https://github.com/natedunn/convex-verify/compare/v1.0.2...v1.0.3) (2026-01-19)


### Bug Fixes

* **ci:** simplify npm publish step for OIDC ([34c42d5](https://github.com/natedunn/convex-verify/commit/34c42d5db1432cf4a4f03420ee038870414840e8))

## [1.0.2](https://github.com/natedunn/convex-verify/compare/v1.0.1...v1.0.2) (2026-01-19)


### Bug Fixes

* **ci:** use native npm publish with OIDC instead of semantic-release ([8037d48](https://github.com/natedunn/convex-verify/commit/8037d4897beb48540b5ec634a7403d5a495f9f6f))

## [1.0.1](https://github.com/natedunn/convex-verify/compare/v1.0.0...v1.0.1) (2026-01-19)


### Bug Fixes

* **ci:** remove registry-url to fix OIDC authentication ([41fbdd1](https://github.com/natedunn/convex-verify/commit/41fbdd1f664b898f4d5c27bcb0d52d8f8ffcb0a2))

# 1.0.0 (2026-01-19)


### Bug Fixes

* **ci:** add packageManager field for pnpm version ([6a8e34d](https://github.com/natedunn/convex-verify/commit/6a8e34d6ccba5cae5dc0293cad71e314ba9df811))
* **ci:** update Node.js version to 22 for semantic-release ([396009e](https://github.com/natedunn/convex-verify/commit/396009ee7e7f992fbe01ce55bd62699dc22ae8f1))


### Features

* add semantic-release workflow for automated releases ([d95cea0](https://github.com/natedunn/convex-verify/commit/d95cea0e56d7f74bf809c9fe5d083e49dffd4636))
