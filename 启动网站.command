#!/bin/bash
# macOS 启动脚本：在本地启动服务并用默认浏览器打开网站。
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js。请先安装 Node.js LTS（https://nodejs.org/）。"
  read -n 1 -s -r -p "按任意键关闭..."
  exit 1
fi

node server.js &
SERVER_PID=$!
sleep 1
open "http://127.0.0.1:3210"

echo "背书计划正在运行。关闭此窗口即可停止服务。"
wait "$SERVER_PID"
