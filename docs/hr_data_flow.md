# HR 端数据来源与多用户逻辑说明

## 一、为什么「评估邀请」和「评估结果」没有任何数据？

### 1. 评估邀请（暂无邀请数据）

- **数据来源**：`data/evaluations/invitation_*.json`
- **何时产生**：仅当 HR 在「学生简历库」对某位候选人点击「发起邀请」，填写岗位与消息并成功调用 `POST /api/v1/hr/evaluation/invite` 后，才会写入一条邀请记录。
- **列表拉取**：`GET /api/v1/hr/evaluation/invitations?hr_id=当前HR的hr_id`，只返回该 HR 发出的邀请。

**因此**：当前显示「共 0 条邀请」说明**尚未有任何人用当前账号发送过评估邀请**，属于正常空状态，不是逻辑错误。

### 2. 评估结果（暂无评估数据）

- **数据来源**：`data/evaluations/evaluation_*.json`
- **何时产生**：仅当 HR 在「评估邀请」列表中点击某条邀请的「填写评估」，填完表单并成功调用 `POST /api/v1/hr/evaluation/<evaluation_id>/submit` 后，才会生成一条评估记录（此时 `evaluation_id` 即为该邀请的 `invitation_id`）。
- **列表拉取**：`GET /api/v1/hr/evaluation/evaluations?hr_id=当前HR的hr_id`，只返回该 HR 提交的评估。

**因此**：当前显示「共 0 条评估」说明**尚未有任何人用当前账号提交过评估**。流程上需要先有邀请，再在邀请上「填写评估」并提交，才会出现评估结果。

---

## 二、是否所有用户上传的简历都被存入并可被 HR 端调用？是否支持多用户、多 HR？

### 1. 简历/档案的存储（学生侧）

| 数据类型 | 存储位置 | 写入时机 |
|---------|----------|----------|
| 已投递简历 | `data/resumes/resume_{user_id}.json` | 学生端调用 `POST /api/v1/resume/generate` 或 `submit`（见 `resume_router.py`） |
| 个人档案 | `data/profiles/profiles.json`（按 user_id） | 学生端填写/生成档案 |
| 能力画像 | `data/student_profiles/ability_profiles.json`（`profile_{user_id}`） | 学生端生成能力画像 |

每个学生一条简历文件、一条档案/画像，**按 user_id 区分，支持多用户**。

### 2. HR 端如何加载候选人（学生简历库）

`hr_router.py` 中 `_load_all_resumes()` 行为：

1. **已投递简历**：遍历 `data/resumes/` 下所有 `resume_*.json`，若该 `user_id` 的隐私设置中 `resume_visible_to_hr == True`，则加入列表。
2. **未投递简历但有档案/能力画像**：对 `profiles.json` 与 `ability_profiles.json` 中出现的所有 `user_id`，若未在步骤 1 中已加入、且该用户 `resume_visible_to_hr == True`，则用 `_build_resume_entry_from_student_sources()` 从档案/画像拼出一条「虚拟简历」加入列表。

因此：

- **所有**在系统中有简历或档案/画像、且授权「对 HR 可见」的**用户**都会被加载，不限制「一个用户对应一个 HR」。
- 多个 HR 登录后看到的都是同一套候选人池（同一批简历/档案），符合「所有用户上传的简历信息都可被 HR 端调用」的设计。

### 3. 评估邀请与评估结果（按 HR 隔离）

- 邀请与评估在保存时都会带上 **`hr_id`**（当前登录 HR 的 id，如 `hr_001`、`hr_002`）。
- 拉取邀请列表、评估列表时都会按 **`hr_id`** 过滤，因此：
  - 每个 HR 只看到自己发出的邀请、自己提交的评估；
  - 支持多个 HR 账号，彼此数据隔离。

### 4. 隐私与发起邀请

- 默认隐私（无 `data/privacy_settings/privacy_{user_id}.json` 时）：`resume_visible_to_hr: True`，`allow_hr_contact: False`。
- 即：HR 可以看到该候选人在简历库中的信息，但若学生未授权「允许 HR 联系」，发起邀请会返回 403。若希望成功发起邀请，需要该学生有隐私文件且 `allow_hr_contact: True`。

---

## 三. 小结

| 问题 | 结论 |
|------|------|
| 评估邀请/评估结果为什么没有数据？ | 当前尚未有「发送邀请」和「提交评估」操作，数据按操作生成，空状态正常。 |
| 是否所有用户上传的简历都被存入并可被 HR 端调用？ | 是。简历存于 `data/resumes/`，档案/画像存于 profiles 与 ability_profiles，HR 端通过 `_load_all_resumes()` 统一加载所有授权可见的用户。 |
| 是否仅支持一个用户对应一个 HR？ | 否。支持多用户（多学生）、多 HR；学生侧数据全局共享给所有 HR，邀请/评估按 hr_id 隔离。 |

如需在界面上看到非空数据，可：  
1）在学生简历库对某候选人点击「发起邀请」并成功发送；  
2）在「评估邀请」中对该条邀请点击「填写评估」并提交表单。完成后即可在「评估邀请」与「评估结果」中看到对应记录。
