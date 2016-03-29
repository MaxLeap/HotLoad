# HotLoad management CLI

## Installation

* Install [Node.js](https://nodejs.org/)
* Install the Hotload CLI: `npm install -g maxleap-hotload-cli`

## Quick Start

1. Create a [HotLoad account](#account-creation) push using the HotLoad CLI
2. Register your [app](#app-management) with the service, and optionally create any additional [deployments](#deployment-management)
3. [Deploy](#releasing-app-updates) an update for your registered app

## Account creation

Before you can begin releasing app updates, you need to create a Hotload account. You can do this by simply running the following command once you've installed the CLI:

```
hotload register
```

This will launch a browser, asking you to authenticate with either your GitHub account. Once authenticated, it will create a Hotload account "linked" to your GitHub identity, and generate an access token you can copy/paste into the CLI in order to login.

*Note: After registering, you are automatically logged-in with the CLI, so until you explicitly log out, you don't need to login again from the same machine.*

## Authentication

Every command within the Hotload CLI requires authentication, and therefore, before you can begin managing your account, you need to login using the Github account you used when registering. You can do this by running the following command:

```
hotload login
```

This will launch a browser, asking you to authenticate with either your GitHub account. This will generate an access token that you need to copy/paste into the CLI (it will prompt you for it). You are now succesfully authenticated and can safely close your browser window.

When you login from the CLI, your access token (kind of like a cookie) is persisted to disk so that you don't have to login everytime you attempt to access your account. In order to delete this file from your computer, simply run the following command:

```
hotload logout
```

## App management

Before you can deploy any updates, you need to register an app with the Hotload service using the following command:

```
hotload app add <appName>
```

If your app targets both iOS and Android, we recommend creating separate apps with Hotload. One for each platform. This way, you can manage and release updates to them seperately, which in the long run, tends to make things simpler. The naming convention that most folks use is to suffix the app name with `-iOS` and `-Android`. For example:

```
hotload app add MyApp-Android
hotload app add MyApp-iOS
```

All new apps automatically come with two deployments (`Staging` and `Production`) so that you can begin distributing updates to multiple channels without needing to do anything extra (see deployment instructions below). After you create an app, the CLI will output the deployment keys for the `Staging` and `Production` deployments, which you can begin using to configure your mobile clients via their respective SDKs.

If you decide that you don't like the name you gave to an app, you can rename it at any time using the following command:

```
hotload app rename <appName> <newAppName>
```

The app's name is only meant to be recognizeable from the management side, and therefore, you can feel free to rename it as neccessary. It won't actually impact the running app, since update queries are made via deployment keys.

If at some point you no longer need an app, you can remove it from the server using the following command:

```
hotload app rm <appName>
```

Do this with caution since any apps that have been configured to use it will obviously stop receiving updates.

Finally, if you want to list all apps that you've registered with the Hotload server,
you can run the following command:

```
hotload app ls
```

## Deployment management

From the Hotload perspective, an app is simply a named grouping for one or more things called "deployments". While the app represents a conceptual "namespace" or "scope" for a platform-specific version of an app (e.g. the iOS port of Foo app), it's deployments represent the actual target for releasing updates (for developers) and synchronizing updates (for end-users). Deployments allow you to have multiple "environments" for each app in-flight at any given time, and help model the reality that apps typically move from a dev's personal environment to a testing/QA/staging environment, before finally making their way into production.

*NOTE: As you'll see below, the `release`, `promote` and `rollback` commands require both an app name and a deployment name is order to work, because it is the combination of the two that uniquely identifies a point of distribution (e.g. I want to release an update of my iOS app to my beta testers).*

Whenever an app is registered with the Hotload service, it includes two deployments by default: `Staging` and `Production`. This allows you to immediately begin releasing updates to an internal environment, where you can thoroughly test each update before pushing them out to your end-users. This workflow is critical for ensuring your releases are ready for mass-consumption, and is a practice that has been established in the web for a long time.

If having a staging and production version of your app is enough to meet your needs, then you don't need to do anything else. However, if you want an alpha, dev, etc. deployment, you can easily create them using the following command:

```
hotload deployment add <appName> <deploymentName>
```

Just like with apps, you can remove and rename deployments as well, using the following commands respectively:

```
hotload deployment rename <appName> <deploymentName> <newDeploymentName>
hotload deployment rm <appName> <deploymentName>
```

If at any time you'd like to view the list of deployments that a specific app includes, you can simply run the following command:

```
hotload deployment ls <appName> [--displayKeys|-k]
```

This will display not only the list of deployments, but also the update metadata (e.g. mandatory, description) and installation metrics for their latest release:

![Deployment lis](https://cloud.githubusercontent.com/assets/116461/12526883/7730991c-c127-11e5-9196-98e9ceec758f.png)

*NOTE: Due to their infrequent use and needed screen real estate, deployment keys aren't displayed by default. If you need to view them, simply make sure to pass the `-k` flag to the `deployment ls` command.*

The install metrics have the following meaning:

* **Active** - The number of successful installs that are currently running this release. This number will increase and decrease as end-users upgrade to and away from this release, respectively.

* **Total** - The total number of successful installations that this update has received overall. This number only ever increases as new users/devices install it, and therefore, this is always a superset of the active count.

* **Pending** - The number of times this release has been downloaded, but not yet installed. This would only apply to updates that aren't installed immediately, and helps provide the broader picture of release adoption for apps that rely on app resume and restart to apply an update.

* **Rollbacks** - The number of times that this release has been automatically rolled back on the client. Ideally this number should be zero, and in that case, this metric isn't even shown. However, if you released an update that includes a crash as part of the installation process, the Hotload plugin will roll the end-user back to the previous release, and report that issue back to the server. This allows your end-users to remain unblocked in the event of broken releases, and by being able to see this telemtry in the CLI, you can identify erroneous releases and respond to them by [rolling it back](#rolling-back-undesired-updates) on the server.

When the metrics cell reports `No installs recorded`, that indicates that the server hasn't seen any activity for this release. This could either be because it precluded the plugin versions that included telemtry support, or no end-users have synchronized with the Hotload server yet. As soon as an install happens, you will begin to see metrics populate in the CLI for the release.

## Releasing app updates

*NOTE: If your app is built using React Native, we have a different command that automates generating the update contents and inferring some of the parameters (e.g. `targetBinaryVersion`) from the project's metadata. Check out the section: [Releasing updates to a React Native app](#releasing-updates-to-a-react-native-app).*

Once your app has been configured to query for updates against the Hotload service--using your desired deployment--you can begin pushing updates to it using the following command:

```
hotload release <appName> <updateContents> <targetBinaryVersion>
[--deploymentName <deploymentName>]
[--description <description>]
[--mandatory]
```

### Update contents parameter

This specifies the location of the code and assets you want to release. You can provide either a single file (e.g. a JS bundle for a React Native app), or a path to a directory (e.g. the `/platforms/ios/www` folder for a Cordova app). You don't need to zip up multiple files or directories in order to deploy those changes, since the CLI will automatically zip them for you.

It's important that the path you specify refers to the platform-specific, prepared/bundled version of your app. The following table outlines which command you should run before releasing, as well as the location you can subsequently point at using the `updateContents` parameter:

| Platform                         | Prepare command                                                                                                                                            | Package path (relative to project root)                                                                     |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Cordova (Android)                | `cordova prepare android`                                                                                                                                  | `./platforms/android/assets/www` directory 																 |
| Cordova (iOS)                    | `cordova prepare ios`                                                                                                                                      | `./platforms/ios/www ` directory          															|
| React Native wo/assets (Android) | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`                                               | Value of the `--bundle-output` option      																 |
| React Native w/assets (Android)  | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` | Value of the `--assets-dest` option, which should represent a newly created directory that includes your assets and JS bundle |
| React Native wo/assets (iOS)     | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`                                                   | Value of the `--bundle-output` option                                                                 |
| React Native w/assets (iOS)      | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` | Value of the `--assets-dest` option, which should represent a newly created directory that includes your assets and JS bundle |

### Target binary version parameter

This specifies the semver-compliant (e.g. `1.0.0` not `1.0`) store/binary version of the application you are releasing the update for. Only users running this **exact version** will receive the update. Users running an older and/or newer version of the app binary will not receive this update, for the following reasons:

1. If a user is running an older binary version, it's possible that there are breaking changes in the Hotload update that wouldn't be compatible with what they're running.

2. If a user is running a newer binary version, then it's presumed that what they are running is newer (and potentially imcompatible) with the Hotload update.  

The following table outlines the value that Hotload expects you to provide for each respective app type:

| Platform               | Source of app store version                                                  |
|------------------------|------------------------------------------------------------------------------|
| Cordova                | The `<widget version>` attribute in the `config.xml` file                    |
| React Native (Android) | The `android.defaultConfig.versionName` property in your `build.gradle` file |
| React Native (iOS)     | The `CFBundleShortVersionString` key in the `Info.plist` file                |

### Deployment name parameter

This specifies which deployment you want to release the update to. This defaults to `Staging`, but when you're ready to deploy to `Production`, or one of your own custom deployments, just explicitly set this argument.

*NOTE: The parameter can be set using either "--deploymentName" or "-d".*

### Description parameter

This provides an optional "change log" for the deployment. The value is simply roundtripped to the client so that when the update is detected, your app can choose to display it to the end-user (e.g. via a "What's new?" dialog). This string accepts control characters such as `\n` and `\t` so that you can include whitespace formatting within your descriptions for improved readability.

*NOTE: This parameter can be set using either "--description" or "-desc"*

### Mandatory parameter

This specifies whether the update should be considered mandatory or not (e.g. it includes a critical security fix). This attribute is simply roundtripped to the client, who can then decide if and how they would like to enforce it.

*NOTE: This parameter is simply a "flag", and therefore, it's absence indicates that the release is optional, and it's presence indicates that it's mandatory. You can provide a value to it (e.g. `--mandatory true`), however, simply specifying `--mandatory` is sufficient for marking a release as mandatory.*

The mandatory attribute is unique because the server will dynamically modify it as neccessary in order to ensure that the semantics of your releases are maintained for your end-users. For example, imagine that you released the following three updates to your app:

| Release | Mandatory? |
|---------|------------|
| v1      | No         |
| v2      | Yes        |
| v3      | No         |

If an end-user is currently running `v1`, and they query the server for an update, it wil respond with `v3` (since that is the latest), but it will dynamically convert the release to mandatory, since a mandatory update was released in between. This behavior is important since the code contained in `v3` is incremental to that included in `v2`, and therefore, whatever made `v2` mandatory, continues to make `v3` mandatory for anyone that didn't already acquire `v2`.

If an end-user is currently running `v2`, and they query the server for an update, it will respond with `v3`, but leave the release as optional. This is because they already received the mandatory update, and therefore, there isn't a need to modify the policy of `v3`. This behavior is why we say that the server will "dynamically convert" the mandatory flag, because as far as the release goes, it's mandatory attribute will always be stored using the value you specified when releasing it. It is only changed on-the-fly as neccesary when responding to an update check from an end-user.

If you never release an update that is marked as mandatory, then the above behavior doesn't apply to you, since the server will never change an optional release to mandatory unless there were intermingled mandatory updates as illustrated above. Additionally, if a release is marked as mandatory, it will never be converted to optional, since that wouldn't make any sense. The server will only change an optional release to mandatory in order to respect the semantics described above.

*NOTE: This parameter can be set using either "--mandatory" or "-m"*

## Releasing updates to a React Native app

After configuring your React Native app to query for updates against the Hotload service--using your desired deployment--you can begin pushing updates to it using the following command:

```
hotload release-react <appName> <platform>
[--deploymentName <deploymentName>]
[--description <description>]
[--entryFile <entryFile>]
[--mandatory]
[--sourcemapOutput <sourcemapOutput>]
```

This `release-react` command does two things in addition to running the vanilla `release` command described in the [previous section](#releasing-app-updates):

1. It runs the [`react-native bundle` command](#update-contents-parameter) to generate the update contents in a temporary folder
2. It infers the [`targetBinaryVersion` of this release](#target-binary-version-parameter) by reading the contents of the project's metadata (`Info.plist` if this update is for iOS clients, and `build.gradle` for Android clients).

It then calls the vanilla `release` command by supplying the values for the required parameters using the above information. Doing this helps you avoid the manual step of generating the update contents yourself using the `react-native bundle` command and also avoid common pitfalls such as supplying a wrong `targetBinaryVersion` parameter.

### Platform parameter

This specifies which platform the current update is targeting, and can be either `ios` or `android` (case-insensitive).

### Deployment name parameter

This is the same parameter as the one described in the [above section](#deployment-name-parameter).

### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter).

### Entry file parameter

This specifies the relative path to the root JavaScript file of the app. If left unspecified, the command will first assume the entry file to be `index.ios.js` or `index.android.js` depending on the `platform` parameter supplied, following which it will use `index.js` if the previous file does not exist.

### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter).

### Sourcemap output parameter

This specifies the relative path to where the sourcemap file for resulting update's JS bundle should be generated. If left unspecified, sourcemaps will not be generated.

## Promoting updates across deployments

Once you've tested an update against a specific deployment (e.g. `Staging`), and you want to promote it "downstream" (e.g. dev->staging, staging->production), you can simply use the following command to copy the release from one deployment to another:

```
hotload promote <appName> <sourceDeploymentName> <destDeploymentName>
hotload promote MyApp Staging Production
```

The `promote` command will create a new release for the destination deployment, which includes the **exact code and metadata** (description, mandatory and app store version) from the latest release of the source deployment. While you could use the `release` command to "manually" migrate an update from one environment to another, the `promote` command has the following benefits:

1. It's quicker, since you don't need to re-assemble the release assets you want to publish or remember the description/app store version that are associated with the source deployment's release.

2. It's less error-prone, since the promote operartion ensures that the exact thing that you already tested in the source deployment (e.g. `Staging`) will become active in the destination deployment (e.g. `Production`).

We recommend that all users take advantage of the automatically created `Staging` and `Production` environments, and do all releases directly to `Staging`, and then perform a `promote` from `Staging` to `Production` after performing the appropriate testing.

*NOTE: The release produced by a promotion will be annotated in the output of the `deployment history` command to help identify them more easily.*

## Rolling back undesired updates

A deployment's release history is immutable, so you cannot delete or remove an update once it has been released. However, if you release an update that is broken or contains unintended features, it is easy to roll it back using the `rollback` command:

```
hotload rollback <appName> <deploymentName>
hotload rollback MyApp Production
```

This has the effect of creating a new release for the deployment that includes the **exact same code and metadata** as the version prior to the latest one. For example, imagine that you released the following updates to your app:

| Release | Description       | Mandatory |
|---------|-------------------|-----------|
| v1      | Initial release!  | Yes       |
| v2      | Added new feature | No        |
| v3      | Bug fixes         | Yes       |

If you ran the `rollback` command on that deployment, a new release (`v4`) would be created that included the contents of the `v2` release.

| Release                     | Description       | Mandatory |
|-----------------------------|-------------------|-----------|
| v1                          | Initial release!  | Yes       |
| v2                          | Added new feature | No        |
| v3                          | Bug fixes         | Yes       |
| v4 (Rollback from v3 to v2) | Added new feature | No        |

End-users that had already acquired `v3` would now be "moved back" to `v2` when the app performs an update check. Additionally, any users that were still running `v2`, and therefore, had never acquired `v3`, wouldn't receive an update since they are already running the latest release (this is why our update check uses the package hash in addition to the release label).

If you would like to rollback a deployment to a release other than the previous (e.g. `v3` -> `v2`), you can specify the optional `--targetRelease` parameter:

```
hotload rollback MyApp Production --targetRelease v34
```

*NOTE: The release produced by a rollback will be annotated in the output of the `deployment history` command to help identify them more easily.*

## Viewing release history

You can view a history of the 50 most recent releases for a specific app deployment using the following command:

```
hotload deployment history <appName> <deploymentName>
```

The history will display all attributes about each release (e.g. label, mandatory) as well as indicate if any releases were made due to a promotion or a rollback operation.

![Deployment History](https://cloud.githubusercontent.com/assets/696206/11605068/14e440d0-9aab-11e5-8837-69ab09bfb66c.PNG)

Additionally, the history displays the install metrics for each release. You can view the details about how to interpret the metric data in the documentation for the `deployment ls` command above.

By default, the history doesn't display the author of each release, but if you are collaborating on an app with other developers, and want to view who released each update, you can pass the additional `--displayAuthor` (or `-a`) flag to the history command.

*NOTE: The history command can also be run using the "h" alias*
