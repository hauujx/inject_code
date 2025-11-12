(function autoCollector() {
    const state = {
        timeoutId: null,
        watcherId: null,
        stopped: false,
        lastDisplay: null
    };

    // ===== Cookie tiện ích =====
    const Cookie = {
        set(name, value, days = 1) {
            const expires = new Date(Date.now() + days * 86400000).toUTCString();
            document.cookie = `${name}=${value}; expires=${expires}; path=/`;
        },
        get(name) {
            const prefix = name + "=";
            return document.cookie.split(";").map(s => s.trim())
                .find(c => c.startsWith(prefix))?.substring(prefix.length) || null;
        }
    };

    // ===== Lấy level người dùng =====
    function getUserLevel() {
        // Có thể tuỳ chỉnh nếu app lưu ở chỗ khác
        try {
            return parseInt(app?.user?.profile?.level || 1);
        } catch {
            return 1;
        }
    }

    // ===== Xác định interval theo level =====
    function getIntervalByLevel() {
        const level = getUserLevel();
        switch (level) {
            case 1: return 2 * 60 * 1000;  // 2 phút
            case 2: return 5 * 60 * 1000;  // 5 phút
            case 3: return 7 * 60 * 1000;  // 7 phút
            default: return 12 * 60 * 1000; // tối đa 12 phút
        }
    }

    // ===== Stop / Restart =====
    function stop(reason = "unknown") {
        if (state.stopped) return;
        state.stopped = true;
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        console.log("[AutoCollect] Dừng lại:", reason);
    }

    function restart() {
        if (!state.stopped) return;
        console.log("[AutoCollect] Restart do display có giá trị trở lại");
        state.stopped = false;
        scheduleNext();
    }

    // ===== Watcher display =====
    function startDisplayWatcher() {
        if (state.watcherId) clearInterval(state.watcherId);
        if (!app?.reader) return console.warn("[AutoCollect] app.reader chưa sẵn sàng");

        state.lastDisplay = app.reader.display;
        console.log("[AutoCollect] Watcher khởi động, display =", state.lastDisplay);

        state.watcherId = setInterval(() => {
            const display = app.reader.display;
            if (display == null && state.lastDisplay != null) stop("display null");
            if (display != null && state.lastDisplay == null) restart();
            state.lastDisplay = display;
        }, 1000);
    }

    // ===== Thực hiện collect =====
    async function collect() {
        if (state.stopped) return;

        try {
            console.log("[AutoCollect] Kiểm tra nhặt...");
            const check = await fetch("/index.php?ngmar=iscollectable", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "ngmar=tcollect&sajax=trycollect",
                credentials: "include"
            }).then(r => r.json());

            if (check.code !== 1) {
                console.log("[AutoCollect] Không có gì để nhặt.");
                return;
            }

            console.log("[AutoCollect] Tiến hành nhặt...");
            const result = await fetch("/index.php?ngmar=collect", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "sajax=collect",
                credentials: "include"
            }).then(r => r.json());

            const itemName = result.name || "Vật phẩm không tên";
            const chapterId = app?.reader?.getPCN?.().current?.cid;
            if (!chapterId) return console.warn("Không có chapter id.");

            // delay ngẫu nhiên 5-10s
            const delay = 5000 + Math.random() * 5000;
            console.log(`[AutoCollect] Đợi ${(delay / 1000).toFixed(1)}s rồi fcl...`);
            await new Promise(r => setTimeout(r, delay));

            const fcl = await fetch("/index.php?ngmar=fcl", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `ajax=fcollect&c=${chapterId}`,
                credentials: "include"
            }).then(r => r.json());

            if (fcl.code === 1) {
                const now = new Date();
                Cookie.set("lastCollectTime", now.getTime());
                Cookie.set("lastCollectItem", itemName);

                console.log(`[AutoCollect] Nhặt ${itemName} thành công lúc ${now.toLocaleTimeString()}`);

                const el = document.getElementById("login-check-div");
                if (el) el.innerText = `${itemName} - ${now.toLocaleTimeString()}`;

                app?.reader?.nextChapter?.();
            } else {
                console.warn("[AutoCollect] FCL lỗi:", fcl.err || fcl);
            }

        } catch (err) {
            console.error("[AutoCollect] Lỗi:", err);
        }
    }

    // ===== Lên lịch lần kế tiếp =====
    function scheduleNext() {
        if (state.stopped) return;
        if (!app?.reader?.display) return stop("display null trước khi lên lịch");

        collect().finally(() => {
            const interval = getIntervalByLevel();
            console.log(`[AutoCollect] Lên lịch chạy lại sau ${(interval / 60000).toFixed(1)} phút (level ${getUserLevel()})`);
            state.timeoutId = setTimeout(scheduleNext, interval);
        });
    }

    // ===== Khởi động ban đầu =====
    function init() {
        if (!window.app?.reader || typeof app.reader.getPCN !== "function") {
            console.log("[AutoCollect] App chưa sẵn sàng, thử lại sau 1s...");
            return setTimeout(init, 1000);
        }
        if (!document.cookie.includes("access=")) {
            console.log("[AutoCollect] Chưa đăng nhập, thử lại sau 1s...");
            return setTimeout(init, 1000);
        }

        console.log("[AutoCollect] Bắt đầu hoạt động...");
        startDisplayWatcher();
        scheduleNext();
    }

    init();
})();
