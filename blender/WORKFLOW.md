# Blender 与 Three.js 接口

## 原始模型在哪里

- `app.js / initPlant3d()`：A²O 全厂，池体、栏杆、桥架、二沉池、加药、鼓风机房、车辆、水流及气泡。
- `app.js / initOxidation3d()`：Carrousel 氧化沟、环流沟体、转碟设备、二沉池、厂区细节及动态。
- `network.js / initNetwork3d()`：B→A→污水厂主线，C/D 支路泵站、管段、泵房、流动粒子及风险区。

这三份程序就是原始三维建模源文件，旧项目原本没有 `.blend`。迁移包不会冒充已有 Blender 源文件。Three.js 全局及模块库均为 0.160.1，GLB loader/exporter 本地部署。

## 推荐流程

1. 浏览器打开需要精修的页面，展开左下角接口并导出 GLB。复杂场景可能需要几十秒，电脑较旧时逐个导出。导出保留单位标签 `extras.unit`，移除文字 Sprite、灯光和辅助线。几何导出仅包含当前可见对象，视角不会改变几何范围。
2. Blender 导入 GLB，另存 `.blend`。保留坐标、尺寸及命名，单独精修池壁/转碟/泵组/阀门/仪表/防护栏等，避免用粗大的架空管网遮挡厂区。地下管线仅在剖切模式展示。
3. 导出 GLB 到 `models/blender/`。可用命令：`blender --background myscene.blend --python blender/export_flowpilot.py -- --output models/blender/oxidation.glb`。Blender 使用自身 Python；平台不需要安装 `bpy`。
4. 修改 manifest 对应项：`enabled:true`；`file` 指向本地 GLB；`position` 米、`rotation` 弧度、`scale` 标量。Three.js Y 向上；Blender glTF 导入/导出自动处理轴变换，不要重复旋转。
5. 推荐先导出“小型细节增补模型”，保持 `hideUnits:[]`。替换单元时，只隐藏已确认替换的单位标签。整厂完整 GLB 叠在旧厂上会重叠，不能直接启用而不配置替换范围。若做整体替换，需要新电脑实现明确的 `replaceScene` 模式，同时保留动态/点击对象。

加载失败保留原模型；加载成功才隐藏指定单元。GLB 内动画 clip 自动播放，但原 JS 粒子、水面、转子控制逻辑不会自动映射到 GLB 的新节点。升级者应建立 `unit_id`、`sensor_id`、`actuator_id`、`animation_role` 的稳定绑定，再让机理结果驱动动画。不要删除原动态效果。

## 精修验收

A²O 厌氧/缺氧/好氧分区必须可辨；氧化沟要有可信的弧形沟道、转碟浸没及循环流路；泵站包括湿井、泵组、止回/隔离阀、液位仪、支路汇合与入厂终点。坚持真实设备尺度，先完善摄影式结构与材质，再加数字孪生覆盖层。

建议每个页面控制在约 10–40 MB GLB、20–40 万可见三角面内，重复设备实例化、提供低细节档、纹理尽量 1K/2K；这些是性能目标，不是当前模型已测定指标。保持桌面和移动端可展示，验证 canvas 非空、动画跨帧变化、资产零 404、标签不重叠。保留不依赖 Blender 的程序化后备版本。


## 发布版工程

源码版包含三个master.blend、vegetation-source.blend和细节GLB。Blender应用需自行安装；普通网页运行无需Blender。工程含打包纹理。打开master工程，编辑FP_DETAIL_OVERLAY集合，使用export_details.py导出细节，保持manifest坐标约定。手工修改后先备份，重建脚本会覆盖输出。

```bash
blender --background models/blender/refined/overview-master.blend --python blender/export_details.py -- --output models/blender/refined/overview-details.glb
```

先运行refine_flowpilot.py重建时，还需update_round2_materials.py同步第二轮材质。bake_vegetation.py使用打包的扫描工程生成四视角树木贴图。扫描素材来源与许可见assets/realism/SOURCES.json。
