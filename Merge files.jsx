#target illustrator

(function () {

    // =============================
    // UI 加速
    // =============================
    var oldLevel = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    try {

        if (app.documents.length > 0) {
            alert("请先关闭所有已打开的文档。");
            return;
        }

        var folder = Folder.selectDialog("请选择包含 AI 或 PDF 文件的文件夹");
        if (!folder) return;

        var files = folder.getFiles(function (f) {
            return f instanceof File && /\.(ai|pdf)$/i.test(f.name);
        });

        if (files.length === 0) {
            alert("未找到 AI 或 PDF 文件。");
            return;
        }

        // =============================
        // 配置
        // =============================
        var GAP_X = 20;
        var GAP_Y = 20;
        var MAX_PER_ROW = 4;
        var startX = 0;
        var startY = 0;

        // =============================
        // 创建目标文档
        // =============================
        var targetDoc = app.documents.add(
            DocumentColorSpace.RGB,
            1000,
            1000
        );
        app.activeDocument = targetDoc;

        var baseLayer = targetDoc.layers[0];
        baseLayer.locked = false;
        baseLayer.visible = true;
        targetDoc.activeLayer = baseLayer;

        // =============================
        // 排版变量
        // =============================
        var row = 0;
        var col = 0;
        var rowHeight = [];
        var rowWidths = [];

        // =============================
        // 主循环
        // =============================
        for (var i = 0; i < files.length; i++) {

            var srcFile = files[i];
            var srcDoc = app.open(srcFile);

            srcDoc.selectObjectsOnActiveArtboard();
            var sel = srcDoc.selection;

            if (!sel || sel.length === 0) {
                srcDoc.close(SaveOptions.DONOTSAVECHANGES);
                continue;
            }

            // =============================
            // 🚀 源文档中先 group
            // =============================
            var group = srcDoc.groupItems.add();
            for (var s = sel.length - 1; s >= 0; s--) {
                sel[s].move(group, ElementPlacement.PLACEATEND);
            }

            // =============================
            // 只 duplicate 一次
            // =============================
            app.activeDocument = targetDoc;
            var pastedGroup = group.duplicate(
                targetDoc,
                ElementPlacement.PLACEATEND
            );

            // 清理源文档 group
            app.activeDocument = srcDoc;
            group.remove();
            srcDoc.close(SaveOptions.DONOTSAVECHANGES);

            app.activeDocument = targetDoc;

            var pastedItems = pastedGroup.pageItems;

            // =============================
            // 计算 bounds
            // =============================
            var left = Infinity, top = -Infinity, right = -Infinity, bottom = Infinity;
            for (var j = 0; j < pastedItems.length; j++) {
                var b = pastedItems[j].visibleBounds;
                left   = Math.min(left, b[0]);
                top    = Math.max(top, b[1]);
                right  = Math.max(right, b[2]);
                bottom = Math.min(bottom, b[3]);
            }

            var width = right - left;
            var height = top - bottom;
            if (width <= 0 || height <= 0) {
                pastedGroup.remove();
                continue;
            }

            if (!rowWidths[row]) rowWidths[row] = [];
            if (!rowHeight[row]) rowHeight[row] = 0;

            rowWidths[row][col] = width;
            rowHeight[row] = Math.max(rowHeight[row], height);

            // =============================
            // 计算画板位置
            // =============================
            var targetLeft = startX;
            for (var k = 0; k < col; k++) {
                targetLeft += rowWidths[row][k] + GAP_X;
            }

            var targetTop = startY;
            for (var r = 0; r < row; r++) {
                targetTop -= rowHeight[r] + GAP_Y;
            }

            // =============================
            // 创建画板
            // =============================
            var artboard;
            if (i === 0) {
                artboard = targetDoc.artboards[0];
                artboard.artboardRect = [
                    targetLeft,
                    targetTop,
                    targetLeft + width,
                    targetTop - height
                ];
            } else {
                artboard = targetDoc.artboards.add([
                    targetLeft,
                    targetTop,
                    targetLeft + width,
                    targetTop - height
                ]);
            }

            artboard.name = srcFile.name.replace(/\.(ai|pdf)$/i, "");
            targetDoc.artboards.setActiveArtboardIndex(
                targetDoc.artboards.length - 1
            );

            // =============================
            // 移动物件（整体移动 group）
            // =============================
            var gb = pastedGroup.visibleBounds;
            var dx = targetLeft - gb[0];
            var dy = targetTop - gb[1];
            pastedGroup.translate(dx, dy);

            col++;
            if (col >= MAX_PER_ROW) {
                col = 0;
                row++;
            }
        }

        alert("完成！共生成 " + targetDoc.artboards.length + " 个画板。");

    } finally {
        // =============================
        // 恢复 UI 状态
        // =============================
        app.userInteractionLevel = oldLevel;
    }

})();
