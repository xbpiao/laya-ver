# 按文件的md5值重新命名文件的工具

## 使用步骤：

* 当前目录下npm install -g laya-ver
* 命令行：laya-ver -s c:\mydata -d c:\mydata_release -f

```
Usage: index [options]

  Options:

    -V, --version              output the version number
    -s, --sourcedir <path>     source directory. (default: )
    -d, --destdir <path>       destination directory(Must not exist!). (default: )
    -i, --ignore <filenames>   ignore rename filenames. (default: index.html:index.htm:version.json:*.map)
    -r, --replace <filenames>  replace all filenames. (default: index.htm:*.html)
    -f, --force                add force delete destination directory.
    -h, --help                 output usage information
```
### 参数说明：

* --sourcedir 指定需要转换的源目录
* --destdir 指定输出的目标目录（没带--force参数时，指定的输出目录必须不存在）
* --ignore 忽略转换自动改名的文件名列表以冒号分隔
* --replace 指定查找替换的文件列表文件名列表以冒号分隔
* --force 带本参数时如果--destdir指定的目录存在则会强制删除（不可恢复，慎用）

## 当前状态

* 完成基础功能
* 更新index.html中的默认js引用
* 生成version.json文件 （参考： https://ldc.layabox.com/doc/?nav=zh-ts-2-0-5）

## 待处理

* [ ] 更严谨的异常处理（没权限写入失败，磁盘空间满等）
* [ ] 性能测试！
