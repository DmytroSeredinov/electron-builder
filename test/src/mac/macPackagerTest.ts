import { copyOrLinkFile } from "builder-util/out/fs"
import { createTargets, DIR_TARGET, Platform } from "electron-builder"
import { readdir, readJson } from "fs-extra-p"
import * as path from "path"
import { assertThat } from "../helpers/fileAssert"
import { app, appThrows, assertPack, convertUpdateInfo, platform } from "../helpers/packTester"

test.ifMac.ifAll("two-package", () => assertPack("test-app", {
  targets: createTargets([Platform.MAC], null, "all"),
  config: {
    extraMetadata: {
      repository: "foo/bar"
    },
    mac: {
      electronUpdaterCompatibility: ">=2.16",
      electronLanguages: ["bn", "en"]
    },
    //tslint:disable-next-line:no-invalid-template-strings
    artifactName: "${name}-${version}-${os}.${ext}",
  },
}, {
  signed: true,
  checkMacApp: async appDir => {
    expect((await readdir(path.join(appDir, "Contents", "Resources")))
      .filter(it => !it.startsWith("."))
      .sort()).toMatchSnapshot()
  },
}))

test.ifMac("one-package", app({
  targets: Platform.MAC.createTarget(),
  config: {
    publish: {
      provider: "generic",
      //tslint:disable-next-line:no-invalid-template-strings
      url: "https://develar.s3.amazonaws.com/test/${os}/${arch}",
    },
    mac: {
      electronUpdaterCompatibility: ">=1.0.0",
      extendInfo: {
        LSUIElement: true,
      },
      minimumSystemVersion: "10.12.0",
      fileAssociations: [
        {
          ext: "foo",
          name: "Foo",
          role: "Viewer",
        },
        {
          ext: "boo",
          name: "Boo",
          role: "Shell",
          isPackage: true,
        },
        {
          ext: "bar",
          name: "Bar",
          role: "Shell",
          // If I specify `fileAssociations.icon` as `build/foo.icns` will it know to use `build/foo.ico` for Windows?
          icon: "someFoo.ico"
        },
      ]
    }
  }
}, {
  signed: true,
  projectDirCreated: projectDir => Promise.all([
    copyOrLinkFile(path.join(projectDir, "build", "icon.icns"), path.join(projectDir, "build", "foo.icns")),
    copyOrLinkFile(path.join(projectDir, "build", "icon.icns"), path.join(projectDir, "build", "someFoo.icns")),
  ]),
  checkMacApp: async (appDir, info) => {
    expect(info).toMatchSnapshot()
    await assertThat(path.join(appDir, "Contents", "Resources", "foo.icns")).isFile()
    await assertThat(path.join(appDir, "Contents", "Resources", "someFoo.icns")).isFile()
  },
  packed: async context => {
    expect(convertUpdateInfo(await readJson(path.join(context.outDir, "latest-mac.json")))).toMatchSnapshot()
  },
}))

test.ifMac.ifAll("electronDist", appThrows({
  targets: Platform.MAC.createTarget(DIR_TARGET),
  config: {
    electronDist: "foo",
  }
}))

test.ifWinCi("Build macOS on Windows is not supported", appThrows(platform(Platform.MAC)))