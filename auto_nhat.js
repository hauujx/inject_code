(function safeAutoCollect() {
    // Hàm tiện ích cookie
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
        let ca = document.cookie.split(';');
        for(let i=0;i < ca.length;i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length);
        }
        return null;
    }

    // Hàm tính khoảng cách lần nhặt
    function getNextInterval() {
        let last = getCookie("lastCollectTime");
        if(last){
            let lastTime = parseInt(last, 10);
            let now = Date.now();
            let diff = now - lastTime; // ms từ lần nhặt trước
            let minGap = 30000; // tối thiểu 30 giây
            if(diff < minGap){
                return minGap - diff;
            }
        }
        return 15000; // mặc định 15s nếu chưa có cookie
    }

    // Polling để chắc chắn app đã load xong
    if (!window.app || !app.reader || typeof app.reader.getPCN !== "function" || !app.net) {
        console.log("App chưa sẵn sàng, thử lại sau 1s...");
        setTimeout(safeAutoCollect, 1000);
        return;
    }

    // Chỉ chạy khi đã login
    if (!document.cookie.includes("access=")) {
        console.log("Chưa đăng nhập, thử lại sau 1s...");
        setTimeout(safeAutoCollect, 1000);
        return;
    }

    // Nếu display null thì không chạy
    if (app.reader.display == null) {
        console.log("Display null, dừng auto collect.");
        return;
    }

    // Tạo app.net.collect nếu chưa có
    app.net.collect = app.net.collect || (async function() {
        try {
            // 1️⃣ Check nhặt bảo
            let res1 = await fetch("/index.php?ngmar=iscollectable", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "ngmar=tcollect&sajax=trycollect",
                credentials: "include"
            });
            let json1 = await res1.json();
            console.log("Check collectable:", json1);
            if(json1.code != 1){
                console.log("Không có gì để nhặt.");
                return;
            }

            // 2️⃣ Collect item
            let res2 = await fetch("/index.php?ngmar=collect", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "sajax=collect",
                credentials: "include"
            });
            let json2 = await res2.json();
            console.log("Collect result:", json2);

            let itemName = json2.name || "Vật phẩm không tên";

            // 3️⃣ Lấy chapter id hiện tại
            let current = app.reader.getPCN().current;
            if(!current || !current.cid){
                console.warn("Không lấy được chapter id, bỏ qua fcl request");
                return;
            }
            let chapterId = current.cid;

            // 4️⃣ Request fcl sau delay ngẫu nhiên
            let delay = Math.random() * 5000 + 5000;
            console.log("Chờ", Math.round(delay/1000), "giây trước khi gửi request fcl...");
            await new Promise(r=>setTimeout(r, delay));

            let params3 = `ajax=fcollect&c=${chapterId}`;
            let res3 = await fetch("/index.php?ngmar=fcl", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: params3,
                credentials: "include"
            });
            let json3 = await res3.json();
            console.log("FCL result:", json3);

            if(json3.code==1){
                console.log("Nhặt thành công!");
                let now = new Date();
                let timeStr = now.toLocaleTimeString();
                // Lưu timestamp vào cookie
                setCookie("lastCollectTime", now.getTime());

                let displayDiv = document.getElementById("login-check-div");
                if(displayDiv){
                    displayDiv.innerText = `${itemName} - lần nhặt cuối: ${timeStr}`;
                    if(app.reader.nextChapter) app.reader.nextChapter();
                }
            } else {
                console.warn("Lỗi khi nhặt:", json3.err || json3);
            }

        } catch(e){
            console.error("Lỗi app.net.collect:", e);
        }
    });

    // Hàm lặp động
    function scheduleCollect() {
        if (app.reader.display == null) {
            console.log("Display null, dừng scheduleCollect.");
            return;
        }
        try { app.net.collect(); } catch(e){ console.error("Lỗi trong collect:", e); }
        let interval = getNextInterval();
        console.log("Lên lịch nhặt sau", interval/1000, "giây");
        setTimeout(scheduleCollect, interval);
    }

    // Bắt đầu
    console.log("Bắt đầu auto collect...");
    app.net.collect();
    scheduleCollect();

})();
