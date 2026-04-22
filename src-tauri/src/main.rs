// 防止 Windows release 构建弹出额外的命令行窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    mindloom_lib::run()
}
