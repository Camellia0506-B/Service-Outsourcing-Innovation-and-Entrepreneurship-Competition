# AI职业规划智能体 - 前端项目

这是一个完整的、可运行的前端应用，基于纯HTML/CSS/JavaScript开发，无需Node.js和npm依赖。

## 项目结构

```
career-planning-app/
├── index.html          # 主HTML文件
├── styles.css          # 样式文件
├── api.js             # API交互模块
├── app.js             # 主应用逻辑
└── README.md          # 项目说明文档
```

## 功能模块

### 1. 身份认证模块
- ✅ 用户注册（支持头像上传）
- ✅ 用户登录
- ✅ 退出登录

### 2. 个人档案模块
- ✅ 查看个人档案
- ✅ 编辑基本信息
- ✅ 编辑教育信息
- ✅ 管理技能列表
- ✅ 上传简历（AI自动解析）

### 3. 职业测评模块
- ✅ 获取职业测评问卷
- ✅ 完成测评答题
- ✅ 提交测评结果
- ✅ 查看测评报告

### 4. 岗位匹配模块
- ✅ 查看推荐岗位
- ✅ 搜索岗位
- ✅ 人岗匹配分析
- ✅ 查看匹配详情

### 5. 职业规划报告模块
- ✅ 生成职业规划报告
- ✅ 查看报告内容
- ✅ 查看历史报告

## 如何运行

### 方法1: 直接打开（推荐）

1. 将所有文件放在同一个文件夹中
2. 双击打开 `index.html` 文件
3. 或者在浏览器中打开该文件

### 方法2: 使用本地服务器

如果你需要测试文件上传等功能，建议使用本地服务器：

#### 使用Python（推荐）
```bash
# Python 3
cd career-planning-app
python -m http.server 8000

# 然后在浏览器访问: http://localhost:8000
```

#### 使用PHP
```bash
cd career-planning-app
php -S localhost:8000

# 然后在浏览器访问: http://localhost:8000
```

#### 使用Node.js (需要先安装http-server)
```bash
npx http-server career-planning-app -p 8000

# 然后在浏览器访问: http://localhost:8000
```

## 配置后端API

在 `api.js` 文件中修改API基础URL:

```javascript
const API_CONFIG = {
    baseURL: '/api/v1',  // 修改为你的后端API地址
    timeout: 30000
};
```

例如：
- 本地开发: `http://localhost:8000/api/v1`
- 测试环境: `http://test.example.com/api/v1`
- 生产环境: `https://api.example.com/api/v1`

## 功能演示

### 1. 登录/注册
- 打开应用后会显示登录页面
- 点击"立即注册"可以切换到注册页面
- 注册时可以上传头像（可选）
- 注册成功后会自动跳转到登录页面

### 2. 仪表板
- 登录后进入仪表板
- 显示档案完整度、测评状态、匹配岗位数量
- 提供快捷操作卡片

### 3. 个人档案
- 填写基本信息和教育信息
- 添加技能（支持多个技能分类）
- 上传PDF简历，AI自动解析并填充信息
- 保存档案后会更新完整度

### 4. 职业测评
- 系统会加载测评问卷
- 回答所有问题后提交
- 可以查看测评报告

### 5. 岗位匹配
- **推荐岗位**: 查看AI推荐的岗位列表
- **搜索岗位**: 搜索特定岗位
- **匹配分析**: 选择岗位进行深度匹配分析

### 6. 职业规划报告
- 点击"生成新报告"开始生成
- 系统会显示生成进度
- 生成完成后自动显示报告内容
- 可以查看历史报告

## 技术特点

### 1. 纯前端实现
- 不依赖任何构建工具
- 不需要Node.js和npm
- 可以直接在浏览器中运行

### 2. 现代化设计
- 响应式布局，支持移动端
- 流畅的动画效果
- 现代化的UI设计
- 良好的用户体验

### 3. 完整的功能
- 实现了API文档中的所有主要功能
- 完整的错误处理
- 友好的提示信息
- 实时数据更新

### 4. 易于扩展
- 模块化的代码结构
- 清晰的函数命名
- 详细的注释
- 易于维护和扩展

## API集成说明

项目已经实现了与后端API的完整集成，包括：

### 认证相关
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/logout` - 退出登录

### 个人档案
- `POST /profile/info` - 获取个人档案
- `POST /profile/update` - 更新个人档案
- `POST /profile/upload-resume` - 上传简历
- `POST /profile/resume-parse-result` - 获取简历解析结果

### 职业测评
- `POST /assessment/questionnaire` - 获取测评问卷
- `POST /assessment/submit` - 提交测评答案
- `POST /assessment/report` - 获取测评报告

### 岗位相关
- `POST /job/list` - 获取岗位列表
- `POST /job/detail` - 获取岗位详情
- `POST /job/search` - 搜索岗位

### 人岗匹配
- `POST /matching/recommend-jobs` - 获取推荐岗位
- `POST /matching/analyze` - 人岗匹配分析

### 职业规划报告
- `POST /career/generate-report` - 生成职业规划报告
- `POST /career/report-status` - 获取报告生成状态
- `POST /career/view-report` - 查看报告内容
- `POST /career/report-history` - 获取历史报告列表

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge
- 其他现代浏览器

## 注意事项

1. **API地址配置**: 确保在 `api.js` 中正确配置了后端API地址
2. **CORS问题**: 如果遇到跨域问题，需要在后端配置CORS
3. **文件上传**: 某些浏览器在直接打开HTML文件时可能限制文件上传，建议使用本地服务器
4. **本地存储**: 应用使用localStorage存储token和用户信息，清除浏览器数据会导致需要重新登录

## 开发建议

### 添加新功能
1. 在 `api.js` 中添加对应的API调用函数
2. 在 `app.js` 中添加业务逻辑处理函数
3. 在 `index.html` 中添加对应的UI元素
4. 在 `styles.css` 中添加样式

### 自定义样式
所有CSS变量定义在 `styles.css` 的 `:root` 选择器中，可以轻松修改主题颜色：

```css
:root {
    --primary-color: #2563eb;  /* 主色调 */
    --secondary-color: #10b981; /* 辅助色 */
    --bg-color: #f8fafc;        /* 背景色 */
    /* ... 更多变量 */
}
```

## 故障排除

### 1. API请求失败
- 检查 `api.js` 中的 `baseURL` 配置
- 确认后端服务正常运行
- 查看浏览器控制台的错误信息

### 2. 登录后立即退出
- 检查后端返回的token格式
- 确认localStorage可以正常使用

### 3. 文件上传不工作
- 使用本地服务器运行项目
- 检查文件大小和格式限制

## 联系方式

如有问题或建议，请联系开发团队：
- 前端开发: 李嘉鑫、王雨姗
- 后端开发: 古媛媛
- 算法模型: 孙于婷

## 许可证

本项目仅供学习和开发使用。
