#!/user/bin/env node
'use strict';

const program = require('commander');
var path = require('path');
var fs = require('fs');
// crypto 这个库已经不更新了，md5计算内建到node中
var crypto = require('crypto');

program
    .version(require('./package.json').version)
    .option('-s, --sourcedir <path>', 'source directory.', '')
    .option('-d, --destdir <path>', 'destination directory(Must not exist!).', '')
    .option('-i, --ignore <filenames>', 'ignore rename filenames.', 'index.html:index.htm:version.json:*.map')
    .option('-r, --replace <filenames>', 'replace all filenames.', 'index.htm:*.html')
    .option('-f, --force', 'add force delete destination directory.')
    .parse(process.argv);

// 默认参数
var src_dir = "";
var dest_dir = "";
// 检查参数

// 1. sourcedir 必须存在的源目录
if (program.sourcedir) {
    var src_dir_tmp = path.resolve(program.sourcedir);
    if (fs.existsSync(src_dir_tmp) === true) {
        if (fs.statSync(src_dir_tmp).isDirectory() === true) {
            src_dir = src_dir_tmp;
        } else {
            console.error("Error: --sourcedir Must be directory![" + src_dir_tmp + "]");
        }
    } else {
        console.error("Error: --sourcedir not exist![" + src_dir_tmp + "]");
    }
} else {
    console.error("Error: Must specify parameters --sourcedir");
}

// 2. destdir 必须不存在的目标目录（带-f参数时会强制忽略，并删除目标目录）
if (program.destdir) {
    var dest_dir_tmp = path.resolve(program.destdir);
    if (fs.existsSync(dest_dir_tmp) === true) {
        if (fs.statSync(dest_dir_tmp).isDirectory() === true) {
            if (dest_dir_tmp === src_dir) {
                // 源路径与目标路径不能一样
                console.error("Error: --sourcedir --destdir Must be not Same!");
                console.error("Error: --sourcedir:" + src_dir);
                console.error("Error:   --destdir:" + dest_dir_tmp);
            } else {
                if (program.force === true) {
                    console.log("delete [" + dest_dir_tmp + "] ... ");
                    if (rm_dir(dest_dir_tmp) === true) {
                        // 删除目录成功
                        dest_dir = dest_dir_tmp;
                    } else {
                        // 删除目录失败！
                        console.error("Error: delete directory fail![" + src_dir_tmp + "]");
                    }
                } else {
                    // 没有带强制删除标记的，提示错误
                    console.error("Error: --destdir Must be not exist directory![" + src_dir_tmp + "]");
                }
            }// if
        } else {
            console.error("Error: --destdir Must be directory![" + src_dir_tmp + "]");
        }
    } else {
        // 不存在的目录就对了
        dest_dir = dest_dir_tmp;
    }
} else {
    // 没有指定目标目录，可以按源目录自动生成
    console.error("Error: Must specify parameters --destdir");
}


// ============================================================================
// 判断比较多，估计删除非常慢
function rm_dir(directory_path) {
    var result = true;
    if (fs.statSync(directory_path).isDirectory() === true) {
        var arr = fs.readdirSync(directory_path);
        for (var i in arr) {
            var curFile = path.join(directory_path, arr[i]);
            if (fs.statSync(curFile).isFile() === true) {
                fs.unlinkSync(curFile);
                result = (fs.existsSync(curFile) === false)
                if (result === false) { // 删除失败则日志一下
                    console.error("Error: delete file error![" + curFile + "]");
                    break;
                }
            } else {// 是目录则递归删除
                result = rm_dir(curFile);
                if (result === false) {
                    break;
                }
            }
        }// for
        if (result === true) {
            fs.rmdirSync(directory_path); // 这个只能删除空目录，非空的不行
            result = (fs.existsSync(directory_path) === false);
            if (result === false) { // 删除失败则日志一下
                console.error("Error: delete directory error![" + directory_path + "]");
            }
        }
    } else {
        result = false;
    }
    return result;
}

// ============================================================================
// 预处理相关函数 
function pre_cache_names(name_strs, p_names, p_exts) {
    // 将name_strs的解析结果放到 数组：p_names、p_exts
    // p_names是解析到的名字列表
    // p_exts是解析到的文件扩展名列表
    if (name_strs) {
        var cur_names = name_strs.split(":")
        for (var i = 0; i < cur_names.length; i++) {
            var cur_name_lower = cur_names[i].toLowerCase();
            if (cur_name_lower.indexOf("*") === -1) {
                p_names.push(cur_name_lower);
            } else {
                p_exts.push(path.extname(cur_name_lower));
            }
        }
    }
}

function check_is_in_caches(filename, cache_names, cache_exts) {
    var result = false;
    var cur_file_name_lower = filename.toLowerCase();
    for (var i = 0; i < cache_names.length; i++) {
        if (cur_file_name_lower === cache_names[i]) {
            result = true;
            break;
        }
    }// for i
    if (result === false) {
        var cur_ext_lower = path.extname(cur_file_name_lower);
        for (var i = 0; i < cache_exts.length; i++) {
            if (cur_ext_lower === cache_exts[i]) {
                result = true;
                break;
            }
        }// for i
    }
    return result;
}
// ============================================================================
// 检测哪些文件需要忽略处理
var ignore_names = [];
var ignore_exts = [];
// pre_cache_names(program.ignore, ignore_names, ignore_exts);
function check_is_ignore(filename) {
    return check_is_in_caches(filename, ignore_names, ignore_exts);
}
// ============================================================================
// 检测哪些文件需要替换处理
var pro_replace_names = [];
var pro_replace_exts = [];
// pre_cache_names(program.replace, pro_replace_names, pro_replace_exts);
function check_is_replace(filename) {
    return check_is_in_caches(filename, pro_replace_names, pro_replace_exts);
}

function calc_md5(curFile) {
    return new Promise((resolve, reject) => {
        var md5sum = crypto.createHash('md5');
        var stream = fs.createReadStream(curFile);
        stream.on('data', function (chunk) {
            md5sum.update(chunk);
        });
        stream.on('end', function () {
            var strmd5 = md5sum.digest('hex').toUpperCase();
            resolve(strmd5);
        });
    });
}
// ============================================================================
// 遍历源目录所有文件，复制到目标目录并计算md5
function scan_src_dir(src_path, dst_path) {
    var ver_data = {};
    // 这数组最大长度是多少？
    var wait_md5_promise_ary = new Array();
    function scan_dir(scan_src_path, scan_dst_path, base_path) {
        if (fs.statSync(scan_src_path).isDirectory() === true) {
            var arr = fs.readdirSync(scan_src_path);
            for (var i in arr) {
                var curName = arr[i];
                var curFile = path.join(scan_src_path, curName);
                if (curName.substring(0, 1) === ".") {
                    // 跳过:以点开头的文件或者目录
                    console.log("skip:" + curFile);
                    continue;
                }

                if (fs.statSync(curFile).isFile() === true) {
                    // 通过函数调用把这些参数固化，否则异步后乱了
                    if (check_is_ignore(curName) === false) {
                        pro_file(curFile, curName, scan_dst_path, base_path);
                    } else {
                        // 复制文件
                        fs.copyFileSync(curFile, path.join(scan_dst_path, curName));
                    }// if
                } else { // 这里定然是目录
                    var cur_dst_path = path.join(scan_dst_path, curName);
                    // 创建目标目录
                    fs.mkdirSync(cur_dst_path);
                    // 递归扫描下级子目录
                    scan_dir(curFile, cur_dst_path, path.join(base_path, curName));
                }
            }// for
        }
    }

    function pro_file(cur_File, cur_name, cur_dst_path, cur_base_path) {
        var cur_key = path.join(cur_base_path, cur_name);

        // 目标文件名处理
        var cur_ext_name = path.extname(cur_name);
        var cur_base_name = path.basename(cur_name, cur_ext_name);

        // 是文件则计算md5
        var p = calc_md5(cur_File);
        wait_md5_promise_ary.push(p);
        p.then((strmd5) => {
            var dst_name = cur_base_name + strmd5.substring(0, 6) + cur_ext_name;
            // 复制文件
            fs.copyFileSync(cur_File, path.join(cur_dst_path, dst_name));
            // 要把\替换为/保证在服务器上访问正确
            dst_name = path.join(cur_base_path, dst_name);
            dst_name = dst_name.replace(/\\/g, "/");
            // key要把\替换为/保证在服务器上访问正确
            var newkey = cur_key.replace(/\\/g, "/");
            ver_data[newkey] = dst_name;

            console.log("[" + newkey + "]=" + dst_name);
        });
    }

    scan_dir(src_path, dst_path, "");

    return new Promise((resolve, reject) => {
        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
        Promise.all(wait_md5_promise_ary).then(() => {
            console.log("========================");
            resolve(ver_data);
            wait_md5_promise_ary = null;
        });
    });

}

// ============================================================================
// 遍历目标目录下*.html，并替换所有能匹配到的
function replace_all_html(ver_data, dst_path) {
    function scan_dst_dir(s_path) {
        if (fs.statSync(s_path).isDirectory() === true) {
            var arr = fs.readdirSync(s_path);
            for (var i in arr) {
                var curName = arr[i];
                var curFile = path.join(s_path, curName);
                if (curName.substring(0, 1) === ".") {
                    // 跳过:以点开头的文件或者目录
                    // console.log("skip:" + curFile);
                    continue;
                }

                if (fs.statSync(curFile).isFile() === true) {
                    // 这里判断的是加了md5后的文件名称，可以再处理一下
                    if (check_is_replace(curName)) {
                        replaceFile(curFile);
                    } else {
                        // 去掉加md5的值，还原文件名再检查一遍
                        var cur_chk_ext_name = path.extname(curName);
                        var cur_chk_base_name = path.basename(curName, cur_chk_ext_name);
                        var pre_Name = cur_chk_base_name.substring(0, cur_chk_base_name.length - 6) + cur_chk_ext_name;
                        if (check_is_replace(pre_Name)) {
                            replaceFile(curFile);
                        }
                    }// if
                } else { // 这里定然是目录
                    // 递归扫描下级子目录
                    scan_dst_dir(path.join(s_path, curName));
                }
            }// for
        }
    }

    function replaceFile(fileName) {
        // 暂都按小文件简单处理
        var data = fs.readFileSync(fileName, 'utf8');
        for (var key in ver_data) {
            console.log("[" + key + "]=" + ver_data[key]);
            data = data.replace(new RegExp(`${key}`, 'g'), ver_data[key]);
        }
        fs.writeFileSync(fileName, data, 'utf8');
    }

    // 扫描目录
    scan_dst_dir(dst_path);
}

// ============================================================================
// main
if ((src_dir != "") && (dest_dir != "")) {
    console.log("program.sourcedir:", src_dir);
    console.log("program.destdir:", dest_dir);
    // 预处理参数
    pre_cache_names(program.ignore, ignore_names, ignore_exts);
    pre_cache_names(program.replace, pro_replace_names, pro_replace_exts);

    var start = new Date().getTime();
    // 前面参数检查确保dest_dir已经被删除，这里重建
    // 创建目标-目录
    fs.mkdirSync(dest_dir);

    // 参数都有了，开干吧！
    scan_src_dir(src_dir, dest_dir).then((ver_data) => {
        // 写入json文件
        var cur_ver_file = path.join(dest_dir, "version.json");
        fs.writeFileSync(cur_ver_file, JSON.stringify(ver_data));
        // 计算version.json的md5
        calc_md5(cur_ver_file).then((strmd5) => {
            var ver_md5_file_name = "version" + strmd5.substring(0, 6) + ".json";
            // 重新写入带version.json的版本号
            ver_data["version.json"] = ver_md5_file_name;
            fs.writeFileSync(path.join(dest_dir, ver_md5_file_name), JSON.stringify(ver_data));
            if (program.replace) {
                // 替换所有html中的相关文本
                replace_all_html(ver_data, dest_dir);
            }// if
            console.log("process success.[" + path.join(dest_dir, "version.json") + "]");
            console.log("time:" + (new Date().getTime() - start) / 1000.00 + "s");    
        });
    });
}