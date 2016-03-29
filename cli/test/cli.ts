﻿import * as assert from "assert";
import * as sinon from "sinon";
import Q = require("q");
import * as path from "path";
import Promise = Q.Promise;
import * as HotLoad from "maxleap-hotload";
import * as cli from "../definitions/cli";
import * as cmdexec from "../script/command-executor";
import * as os from "os";

var process = require("process");

function assertJsonDescribesObject(json: string, object: Object): void {
    // Make sure JSON is indented correctly
    assert.equal(json, JSON.stringify(object, /*replacer=*/ null, /*spacing=*/ 2));
}

function ensureInTestAppDirectory(): void {
    if (!~__dirname.indexOf("/resources/TestApp")) {
        process.chdir(__dirname + "/resources/TestApp");
    }
}

export class SdkStub {
    public addAccessKey(machine: string, description?: string): Promise<HotLoad.AccessKey> {
        return Q(<HotLoad.AccessKey>{
            id: "accessKeyId",
            name: "key123",
            createdTime: new Date().getTime(),
            createdBy: os.hostname(),
            description: description
        });
    }

    public addApp(name: string): Promise<HotLoad.App> {
        return Q(<HotLoad.App>{
            id: "appId",
            name: name
        });
    }

    public addCollaborator(name: string, email: string): Promise<void> {
        return Q(<void>null);
    }

    public addDeployment(appId: string, name: string): Promise<HotLoad.Deployment> {
        return Q(<HotLoad.Deployment>{
            id: "deploymentId",
            name: name
        });
    }

    public getAccessKeys(): Promise<HotLoad.AccessKey[]> {
        return Q([<HotLoad.AccessKey>{
            id: "7",
            name: "8",
            createdTime: 0,
            createdBy: os.hostname(),
            description: "Test Description"
        }]);
    }

    public getApps(): Promise<HotLoad.App[]> {
        return Q([<HotLoad.App>{
            id: "1",
            name: "a",
            collaborators: { "a@a.com": { permission: "Owner", isCurrentAccount: true } }
        }, <HotLoad.App>{
            id: "2",
            name: "b",
            collaborators: { "a@a.com": { permission: "Owner", isCurrentAccount: true } }
        }]);
    }

    public getDeploymentKeys(appId: string, deploymentId: string): Promise<HotLoad.DeploymentKey[]> {
        return Q([<HotLoad.DeploymentKey>{
            description: null,
            id: "5",
            isPrimary: true,
            key: "6",
            name: "Primary"
        }]);
    }

    public getDeployments(appId: string): Promise<HotLoad.Deployment[]> {
        return Q([<HotLoad.Deployment>{
            id: "3",
            name: "Production"
        }, <HotLoad.Deployment>{
            id: "4",
            name: "Staging",
            package: {
                appVersion: "1.0.0",
                description: "fgh",
                label: "v2",
                packageHash: "jkl",
                isMandatory: true,
                size: 10,
                blobUrl: "http://mno.pqr",
                uploadTime: 1000
            }
        }]);
    }

    public getPackageHistory(appId: string, deploymentId: string): Promise<HotLoad.Package[]> {
        return Q([
            <HotLoad.Package>{
                description: null,
                appVersion: "1.0.0",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://fakeblobstorage.net/storagev2/blobid1",
                uploadTime: 1447113596270,
                size: 1,
                label: "v1"
            },
            <HotLoad.Package>{
                description: "New update - this update does a whole bunch of things, including testing linewrapping",
                appVersion: "1.0.1",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://fakeblobstorage.net/storagev2/blobid2",
                uploadTime: 1447118476669,
                size: 2,
                label: "v2"
            }
        ]);
    }

    public getDeploymentMetrics(appId: string, deploymentId: string): Promise<any> {
        return Q({
            "1.0.0": {
                active: 123
            },
            "v1": {
                active: 789,
                downloaded: 456,
                failed: 654,
                installed: 987
            },
            "v2": {
                active: 123,
                downloaded: 321,
                failed: 789,
                installed: 456
            }
        });
    }

    public getCollaboratorsList(app: HotLoad.App): Promise<any> {
        return Q({
            "a@a.com": {
                permission: "Owner",
                isCurrentAccount: true
            },
            "b@b.com": {
                permission: "Collaborator",
                isCurrentAccount: false
            }
        });
    }

    public release(appId: string, deploymentId: string): Promise<string> {
        return Q("Successfully released");
    }

    public removeAccessKey(accessKeyId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeApp(appId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeCollaborator(name: string, email: string): Promise<void> {
        return Q(<void>null);
    }

    public removeDeployment(appId: string, deployment: string): Promise<void> {
        return Q(<void>null);
    }

    public updateApp(app: HotLoad.App): Promise<void> {
        return Q(<void>null);
    }

    public transferApp(app: HotLoad.App): Promise<void> {
        return Q(<void>null);
    }

    public updateDeployment(appId: string, deployment: HotLoad.Deployment): Promise<void> {
        return Q(<void>null);
    }
}

describe("CLI", () => {
    var log: Sinon.SinonStub;
    var sandbox: Sinon.SinonSandbox;
    var spawn: Sinon.SinonStub;
    var wasConfirmed = true;
    const RELEASE_FAILED_ERROR_MESSAGE: string = "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).";

    beforeEach((): void => {
        wasConfirmed = true;

        sandbox = sinon.sandbox.create();

        sandbox.stub(cmdexec, "confirm", (): Promise<boolean> => Q(wasConfirmed));
        sandbox.stub(cmdexec, "createEmptyTempReleaseFolder", (): Promise<void> => Q(<void>null));
        log = sandbox.stub(cmdexec, "log", (message: string): void => { });
        sandbox.stub(cmdexec, "loginWithAccessToken", (): Promise<void> => Q(<void>null));
        spawn = sandbox.stub(cmdexec, "spawn", (command: string, commandArgs: string[]): any => {
            return {
                stdout: { on: () => { } },
                stderr: { on: () => { } },
                on: (event: string, callback: () => void) => {
                    callback();
                }
            };
        });
        cmdexec.sdk = <any>new SdkStub();
    });

    afterEach((): void => {
        sandbox.restore();
    });

    it("appAdd reports new app name and ID", (done: MochaDone): void => {
        var command: cli.IAppAddCommand = {
            type: cli.CommandType.appAdd,
            appName: "a"
        };

        var addApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addApp");
        var deploymentList: Sinon.SinonSpy = sandbox.spy(cmdexec, "deploymentList");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addApp);
                sinon.assert.calledTwice(log);
                sinon.assert.calledWithExactly(log, "Successfully added the \"a\" app, along with the following default deployments:");
                sinon.assert.calledOnce(deploymentList);
                done();
            });
    });

    it("appList lists app names and ID's", (done: MochaDone): void => {
        var command: cli.IAppListCommand = {
            type: cli.CommandType.appList,
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    { name: "a", deployments: ["Production", "Staging"]},
                    { name: "b", deployments: ["Production", "Staging"]}
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("appRemove removes app", (done: MochaDone): void => {
        var command: cli.IAppRemoveCommand = {
            type: cli.CommandType.appRemove,
            appName: "a"
        };

        var removeApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeApp);
                sinon.assert.calledWithExactly(removeApp, "1");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"a\" app.");

                done();
            });
    });

    it("appRemove does not remove app if cancelled", (done: MochaDone): void => {
        var command: cli.IAppRemoveCommand = {
            type: cli.CommandType.appRemove,
            appName: "a"
        };

        var removeApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeApp");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "App removal cancelled.");

                done();
            });
    });

    it("appRename renames app", (done: MochaDone): void => {
        var command: cli.IAppRenameCommand = {
            type: cli.CommandType.appRename,
            currentAppName: "a",
            newAppName: "c"
        };

        var updateApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "updateApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(updateApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully renamed the \"a\" app to \"c\".");

                done();
            });
    });

    it("deploymentAdd reports new app name and ID", (done: MochaDone): void => {
        var command: cli.IDeploymentAddCommand = {
            type: cli.CommandType.deploymentAdd,
            appName: "a",
            deploymentName: "b"
        };

        var addDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addDeployment");
        var getDeploymentKeys: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "getDeploymentKeys");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addDeployment);
                sinon.assert.calledOnce(getDeploymentKeys);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully added the \"b\" deployment with key \"6\" to the \"a\" app.");
                done();
            });
    });

    it("deploymentList lists deployment names, deployment keys, and package information", (done: MochaDone): void => {
        var command: cli.IDeploymentListCommand = {
            type: cli.CommandType.deploymentList,
            appName: "a",
            format: "json",
            displayKeys: true
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        name: "Production",
                        deploymentKey: "6"
                    },
                    {
                        name: "Staging",
                        package: {
                            appVersion: "1.0.0",
                            description: "fgh",
                            label: "v2",
                            packageHash: "jkl",
                            isMandatory: true,
                            size: 10,
                            blobUrl: "http://mno.pqr",
                            uploadTime: 1000,
                            metrics: {
                                active: 123,
                                downloaded: 321,
                                failed: 789,
                                installed: 456
                            }
                        },
                        deploymentKey: "6"
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("deploymentRemove removes deployment", (done: MochaDone): void => {
        var command: cli.IDeploymentRemoveCommand = {
            type: cli.CommandType.deploymentRemove,
            appName: "a",
            deploymentName: "Staging"
        };

        var removeDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeDeployment");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeDeployment);
                sinon.assert.calledWithExactly(removeDeployment, "1", "4");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"Staging\" deployment from the \"a\" app.");

                done();
            });
    });

    it("deploymentRemove does not remove deployment if cancelled", (done: MochaDone): void => {
        var command: cli.IDeploymentRemoveCommand = {
            type: cli.CommandType.deploymentRemove,
            appName: "a",
            deploymentName: "Staging"
        };

        var removeDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeDeployment");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Deployment removal cancelled.");

                done();
            });
    });

    it("deploymentRename renames deployment", (done: MochaDone): void => {
        var command: cli.IDeploymentRenameCommand = {
            type: cli.CommandType.deploymentRename,
            appName: "a",
            currentDeploymentName: "Staging",
            newDeploymentName: "c"
        };

        var updateDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "updateDeployment");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(updateDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully renamed the \"Staging\" deployment to \"c\" for the \"a\" app.");

                done();
            });
    });

    it("deploymentHistory lists package history information", (done: MochaDone): void => {
        var command: cli.IDeploymentHistoryCommand = {
            type: cli.CommandType.deploymentHistory,
            appName: "a",
            deploymentName: "Staging",
            format: "json",
            displayAuthor: false
        };

        var getPackageHistory: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "getPackageHistory");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(getPackageHistory);
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected: HotLoad.Package[] = [
                    {
                        description: null,
                        appVersion: "1.0.0",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://fakeblobstorage.net/storagev2/blobid1",
                        uploadTime: 1447113596270,
                        size: 1,
                        label: "v1",
                        metrics: {
                            active: 789,
                            downloaded: 456,
                            failed: 654,
                            installed: 987
                        }
                    },
                    {
                        description: "New update - this update does a whole bunch of things, including testing linewrapping",
                        appVersion: "1.0.1",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://fakeblobstorage.net/storagev2/blobid2",
                        uploadTime: 1447118476669,
                        size: 2,
                        label: "v2",
                        metrics: {
                            active: 123,
                            downloaded: 321,
                            failed: 789,
                            installed: 456
                        }
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("release doesn't allow releasing .zip file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing zip file",
            mandatory: false,
            appStoreVersion: "1.0.0",
            package: "/fake/path/test/file.zip"
        };

        releaseHelperFunction(command, done);
    });

    it("release doesn't allow releasing .ipa file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing ipa file",
            mandatory: false,
            appStoreVersion: "1.0.0",
            package: "/fake/path/test/file.ipa"
        };

        releaseHelperFunction(command, done);
    });

    it("release doesn't allow releasing .apk file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing apk file",
            mandatory: false,
            appStoreVersion: "1.0.0",
            package: "/fake/path/test/file.apk"
        };

        releaseHelperFunction(command, done);
    });


    function releaseHelperFunction(command: cli.IReleaseCommand, done: MochaDone): void {
        var release: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "release");
        cmdexec.execute(command)
            .done((): void => {
                throw "Error Expected";
            }, (error: any): void => {
                assert (!!error);
                assert.equal(error.message, RELEASE_FAILED_ERROR_MESSAGE);
                done();
            });
    }
});
