(function safeAutoCollect() {
    // ===== Trạng thái toàn cục cho lịch collect =====
    const AutoCollectState = {
        runningTimeoutId: null,
        lastInterval: 15000,
        stopped: false,
        lastDisplay: undefined
    };

    // ===== Cookie utils =====
    function setCookie(name, value, days=1) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }
    function getCookie(name) {
        let nameEQ = name + "=";
        let ca = document.cookie.split(";").map(s => s.trim());
        for (let c of ca) if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        return null;
    }

    // ===== Tính interval động dựa trên cookie =====
    function getNextInterval() {
        let last = getCookie("lastCollectTime");
        if (last) {
            let lastTime = parseInt(last, 10);
            let diff = Date.now() - lastTime; // ms
            let minGap = 30000; // tối thiểu 30s
            if (diff < minGap) return minGap - diff;
        }
        return 15000; // mặc định 15s
    }

    // ===== Dừng lịch collect an toàn =====
    function stopAutoCollect(reason = "unknown") {
        if (AutoCollectState.stopped) return;
        AutoCollectState.stopped = true;
        if (AutoCollectState.runningTimeoutId) {
            clearTimeout(AutoCollectState.runningTimeoutId);
            AutoCollectState.runningTimeoutId = null;
        }
        console.log("[AutoCollect] Dừng lại. Lý do:", reason);
    }

    // ===== Watcher theo dõi app.reader.display =====
    function startDisplayWatcher() {
        // Khởi tạo giá trị ban đầu
        AutoCollectState.lastDisplay = app.reader.display;
        console.log("[AutoCollect] Watcher display bắt đầu, giá trị đầu:", AutoCollectState.lastDisplay);

        const watchId = setInterval(() => {
            // Nếu chưa sẵn sàng hoặc đã dừng, kết thúc watcher
            if (!window.app || !app.reader || AutoCollectState.stopped) {
                clearInterval(watchId);
                return;
            }

            const currentDisplay = app.reader.display;

            // Nếu display chuyển về null (hoặc undefined), dừng auto-collect
            if (currentDisplay == null) {
                stopAutoCollect("display trở thành null/undefined");
                clearInterval(watchId);
                return;
            }

            // Nếu có thay đổi (ví dụ view đổi sang component khác), bạn có thể reset logic tùy ý
            if (currentDisplay !== AutoCollectState.lastDisplay) {
                console.log("[AutoCollect] display thay đổi:", currentDisplay);
                AutoCollectState.lastDisplay = currentDisplay;
                // Optional: có thể dừng hoặc tiếp tục, tuỳ ý
                // stopAutoCollect("display thay đổi sang trạng thái mới");
            }
        }, 1000); // kiểm tra mỗi 1s
    }

    // ===== Polling khởi động =====
    if (!window.app || !app.reader || typeof app.reader.getPCN !== "function" || !app.net) {
        console.log("App chưa sẵn sàng, thử lại sau 1s...");
        setTimeout(safeAutoCollect, 1000);
        return;
    }

    if (!document.cookie.includes("access=")) {
        console.log("Chưa đăng nhập, thử lại sau 1s...");
        setTimeout(safeAutoCollect, 1000);
        return;
    }

    // ===== Định nghĩa collect nếu chưa có =====
    app.net.collect = app.net.collect || (async function() {
        try {
            // Nếu đã dừng, không làm gì nữa
            if (AutoCollectState.stopped) return;

            // 1) Check nhặt bảo
            let res1 = await fetch("/index.php?ngmar=iscollectable", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "ngmar=tcollect&sajax=trycollect",
                credentials: "include"
            });
            let json1 = await res1.json();
            console.log("Check collectable:", json1);
            if (json1.code != 1) {
                console.log("Không có gì để nhặt.");
                return;
            }

            // 2) Collect
            let res2 = await fetch("/index.php?ngmar=collect", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "sajax=collect",
                credentials: "include"
            });
            let json2 = await res2.json();
            console.log("Collect result:", json2);

            let itemName = json2.name || "Vật phẩm không tên";

            // 3) Chapter id
            let current = app.reader.getPCN().current;
            if (!current || !current.cid) {
                console.warn("Không lấy được chapter id, bỏ qua fcl request");
                return;
            }
            let chapterId = current.cid;

            // 4) Delay ngẫu nhiên
            let delay = Math.random() * 5000 + 5000;
            console.log("Chờ", Math.round(delay/1000), "giây trước khi gửi request fcl...");
            await new Promise(r => setTimeout(r, delay));

            // 5) FCL
            let params3 = `ajax=fcollect&c=${chapterId}`;
            let res3 = await fetch("/index.php?ngmar=fcl", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: params3,
                credentials: "include"
            });
            let json3 = await res3.json();
            console.log("FCL result:", json3);

            if (json3.code == 1) {
                console.log("Nhặt thành công!");
                let now = new Date();
                let timeStr = now.toLocaleTimeString();
                // Lưu timestamp
                setCookie("lastCollectTime", now.getTime());

                let displayDiv = document.getElementById("login-check-div");
                if (displayDiv) {
                    displayDiv.innerText = `${itemName} - Thời gian nhặt cuối: ${timeStr}`;
                    if (app.reader.nextChapter) app.reader.nextChapter();
                }
            } else {
                console.warn("Lỗi khi nhặt:", json3.err || json3);
            }

        } catch (e) {
            console.error("Lỗi app.net.collect:", e);
        }
    });

    // ===== Lập lịch động với setTimeout, có kiểm tra display mỗi lần =====
    function scheduleCollect() {
        if (AutoCollectState.stopped) return;

        // Nếu display null ngay trước khi chạy, dừng
        if (!app.reader || app.reader.display == null) {
            stopAutoCollect("display null trước lần chạy kế tiếp");
            return;
        }

        try { app.net.collect(); } catch(e){ console.error("Lỗi trong collect:", e); }

        const interval = getNextInterval();
        AutoCollectState.lastInterval = interval;
        console.log("Lên lịch nhặt sau", interval/1000, "giây");
        AutoCollectState.runningTimeoutId = setTimeout(scheduleCollect, interval);
    }

    // ===== Khởi động =====
    console.log("Bắt đầu auto collect...");
    startDisplayWatcher();    // theo dõi display liên tục
    app.net.collect();        // chạy ngay lần đầu
    scheduleCollect();        // lập lịch động

})();
