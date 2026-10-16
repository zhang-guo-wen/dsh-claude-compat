覆盖什么、何时读：五个安装变体（npm / HTTPS / SSH / 锁发布 tag / 本地目录）、卸载与部署，以及 `lib/` 重建后的生效语义。给别人装这个插件、或要解释「改了源码为什么没生效」时读我。

# 安装与部署

## 安装

四个变体,全部走官方命令;它把参数转发给 profile 目录里的 pnpm,**并自行维护 profile 清单**(依赖与 `dsh.profile.bundles` 一起加,不要手写):

```sh
# npm 官方源
npx @deepseek-ai/dsh plugin --profile web add @guowenzhang/dsh-claude-compat

# HTTPS
npx @deepseek-ai/dsh plugin --profile web add git+https://github.com/zhang-guo-wen/dsh-claude-compat.git

# SSH
npx @deepseek-ai/dsh plugin --profile web add git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git

# 锁定发布 tag,默认分支上后续的临时提交不会被拉到
npx @deepseek-ai/dsh plugin --profile web add "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v1.0.0"

# 本地目录开发安装,pnpm 建 symlink,重建 lib/ 后重启即生效,无需重装
npx @deepseek-ai/dsh plugin --profile web add /absolute/path/to/dsh-claude-compat
```

`lib/` 已提交进仓库,所以装完即可运行,**使用者不需要构建**。

卸载时依赖条目与 bundle 层一起移除:

```sh
npx @deepseek-ai/dsh plugin --profile web remove @guowenzhang/dsh-claude-compat
```

装完重启宿主,再打开设置页:

```sh
npx @deepseek-ai/dsh web
```

## 部署

用官方命令安装,它把参数转发给 profile 目录里的 pnpm,**并自行维护 profile 清单**(依赖与 `dsh.profile.bundles` 一起加):

```sh
dsh plugin --profile web add C:/02-codespace/deepseek-harness/dsh-claude-compat   # 本地开发
dsh plugin --profile web add github:zhang-guo-wen/dsh-claude-compat               # git 源
```

本地目录安装时 pnpm 建的是 **symlink(记作 `link:`)** —— 所以重建 `lib/` 后**重启即生效,无需重装**。
`file:` 依赖则可能退化成物理拷贝,那时改源码不会影响正在跑的 dsh,要重装或手动同步 `lib/`。
client 产物变了硬刷新页面即可(不要改 `HANDOFF_ID`:它必须等于包名,见「插件契约」)。

生效语义分两半。**host 半边是进程内模块**:重建 `lib/` 不会替换正在运行的代码,必须重启宿主才会加载新产物。**client 半边按内容 revision 提供**:重建 `lib/` 后刷新页面即可拿到新 bundle;`HANDOFF_ID` 始终等于包名(不是 revision),浏览器仍跑到旧代码时硬刷新页面。

四个设置页开关是插件行的 `Volatile` 字段,所以它们不属于上面这条重启规则:设置页写入的值不经过重挂载就到达运行中的插件。
