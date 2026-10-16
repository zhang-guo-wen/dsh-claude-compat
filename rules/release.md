覆盖什么、何时读：发版流程——改版本号 → `npm run build` → 提交源码与 `lib/` → 打带注释 tag → 验证安装。要发版、或核对 tag 与 `package.json` 版本号是否一致时读我。

# 发版(Release)

`lib/` 是提交进仓库的,所以**发版 = 改版本号 + 构建 + 提交产物 + 打 tag**。别人按 tag 安装,
`master` 上的临时提交不会被他们拿到。

1. 改根 `package.json` 的 `version`。
2. `npm run build`,确认 `lib/index.mjs` 与 `lib/client.js` 是最新。
3. 提交源码与 `lib/`(不要把 `lib/` 落在外面的工作区)。
4. 打带注释的 tag 并推送:

   ```sh
   git tag -a v<version> -m "dsh-claude-compat <version>"
   git push dsh-claude-compat master --follow-tags
   ```

5. 验证安装(仓库根即包,不再需要 `path:` 参数):

   ```sh
   dsh plugin --profile web add \
     "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v<version>"
   ```
