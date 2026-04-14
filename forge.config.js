import * as fs from 'node:fs'
import * as path from 'node:path'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'

export default {
  packagerConfig: {
    packageManager: 'npm',
    icon: 'src/assets/icon.ico',
    asar: true,
    overwrite: true,
    ignore: [/^\/(?!node_modules|src|package\.json|forge\.config\.js)/]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {}
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ],
  hooks: {
    packageAfterExtract: (config, buildPath) => {
      // 移除部分用不到的文件，优化生成包大小
      let localeDir = path.join(buildPath, 'locales')
      let licensePath = path.join(buildPath, 'LICENSES.chromium.html')
      fs.existsSync(licensePath) && fs.unlinkSync(licensePath)
      fs.existsSync(localeDir) && fs.readdir(localeDir, (err, files) => {
        if (!(files && files.length)) return
        for (let i = 0, l = files.length; i < l; i++) {
          if (!files[i].startsWith('en-US') && !files[i].startsWith('zh-CN')) {
            fs.unlinkSync(path.join(localeDir, files[i]))
          }
        }
      })
    }
  }
}
