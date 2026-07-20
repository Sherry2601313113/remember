# remember
一个离线优先的中文背诵辅助网站，结合遗忘曲线、错题记录与随机抽查，让每一次复习都更有针对性。
# 背书计划 · Recall Studio

> 一个离线优先的中文背诵辅助网站，结合遗忘曲线、错题记录与随机抽查，让每一次复习都更有针对性。

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-2863EB)
![Runtime](https://img.shields.io/badge/runtime-Node.js-339933)
![Language](https://img.shields.io/badge/language-中文-F05A3C)

## 功能

- **遗忘曲线复习**：记住后按 1、3、7、15、30 天安排下一次复习；遗忘后次日重新巩固。
- **三本书题库**：题库从本地 JSON 文件读取，书名、简介、题目与答案均可自行维护。
- **题型分类**：每本书按「简答」「论述」「名词解释」分类，可选择整本或单一分类背诵。
- **学习范围锁定**：从某本书进入背诵后，换题与判定结果都会保留在当前书本／分类中，不会跳到其他书。
- **错题优先抽查**：随机抽查会综合遗忘次数与复习次数，为薄弱内容提高出现概率。
- **本地持久化**：学习进度、遗忘记录、连续学习天数保存在本机硬盘，不依赖账号或网络。
- **学习统计**：查看已学习数量、正确率、重点巩固内容与最近学习记录。

## 预览

启动后访问 `http://127.0.0.1:3210`。如需为仓库添加截图，建议将图片放入 `docs/images/`，并在此处替换为：

```md
![今日复习界面](docs/images/today.png)
```

## 快速开始

### 环境要求

安装 [Node.js LTS](https://nodejs.org/)。在终端运行以下命令，能看到版本号即表示安装成功：

```bash
node -v
```

### Windows

双击 `启动网站.cmd`。它会启动本地服务并自动打开浏览器。

若双击后提示 Node.js 未安装，或窗口显示端口占用，请按提示处理后重新启动。

### macOS

首次使用，在项目目录执行：

```bash
chmod +x 启动网站.command
```

之后双击 `启动网站.command` 即可。若 macOS 阻止打开，请在 Finder 中右键该文件并选择“打开”。

### 通用启动方式

也可以在项目根目录运行：

```bash
node server.js
```

然后在浏览器访问 <http://127.0.0.1:3210>。服务运行期间请保持终端窗口开启，按 `Ctrl + C` 可停止服务。

## 添加题库

题库文件位于 `data/` 目录：

```text
data/
├── book-1.json
├── book-2.json
└── book-3.json
```

每本书的标题、简介与题目都从对应 JSON 读取。编辑后刷新网页即可生效；也可以在网站的“我的书本”页面导入 JSON。

```json
{
  "title": "书名",
  "description": "章节/类型",
  "categories": ["简答", "论述", "名词解释"],
  "items": [
    {
      "id": "1",
      "category": "名词解释",
      "question": "什么是体育?",
      "answer": "体育是以身体练习为基本手段……"
    }
  ]
}
```

### 题库规则

- `id`：每题的唯一标识；同一题库内不可重复。
- `category`：只能为 `简答`、`论述` 或 `名词解释`。
- `question`：展示给用户回忆的题目。
- `answer`：点击“显示答案”后展示的内容，支持用 `\n` 换行。

## 数据存储与备份

所有学习数据实时保存到：

```text
data/learning-progress.json
```

## 项目结构

```text
.
├── index.html              # 页面结构
├── style.css               # 主样式
├── category.css            # 题型分类样式
├── app.js                  # 学习、复习与统计逻辑
├── server.js               # 本地 HTTP 服务与硬盘读写
├── 启动网站.cmd             # Windows 启动脚本
├── 启动网站.command         # macOS 启动脚本
└── data/                   # 题库与个人学习数据
```


## License

 [MIT License](https://choosealicense.com/licenses/mit/) 
