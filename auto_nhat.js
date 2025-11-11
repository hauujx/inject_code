(function safeAutoCollect() {
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

    // Tạo app.net.collect nếu chưa có
    app.net.collect = app.net.collect || (async function() {
        try {
            // 1️⃣ Check nhặt bảo
            let url1 = "/index.php?ngmar=iscollectable";
            let body1 = "ngmar=tcollect&sajax=trycollect";

            let res1 = await fetch(url1, {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: body1,
                credentials: "include"
            });
            let json1 = await res1.json();
            console.log("Check collectable:", json1);
            if(json1.code != 1){
                console.log("Không có gì để nhặt.");
                return;
            }

            // 2️⃣ Collect item
            let url2 = "/index.php?ngmar=collect";
            let body2 = "sajax=collect";

            let res2 = await fetch(url2, {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: body2,
                credentials: "include"
            });
            let json2 = await res2.json();
            console.log("Collect result:", json2);

            let cType = json2.type;
            let itemName = json2.name || "Vật phẩm không tên";

            // 3️⃣ Lấy chapter id hiện tại
            let current = app.reader.getPCN().current;
            if(!current || !current.cid){
                console.warn("Không lấy được chapter id, bỏ qua fcl request");
                return;
            }
            let chapterId = current.cid;
            console.log("Chapter ID (c):", chapterId);

            // 4️⃣ Delay ngẫu nhiên 5–10s trước request fcl
            let delay = Math.random() * 5000 + 5000;
            console.log("Chờ", Math.round(delay/1000), "giây trước khi gửi request fcl...");
            await new Promise(r=>setTimeout(r, delay));

            // 5️⃣ Request fcl
            let url3 = "/index.php?ngmar=fcl";
            let params3 = `ajax=fcollect&c=${chapterId}`;

            if(cType === 3 || cType === 4){
                let nname = document.getElementById("cName")?.innerText || json2.name;
                let ninfo = document.getElementById("cInfo")?.innerText || json2.info;
                params3 += `&newname=${encodeURIComponent(nname)}&newinfo=${encodeURIComponent(ninfo)}`;
            }

            let res3 = await fetch(url3, {
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
                let displayDiv = document.getElementById("login-check-div");
                if(displayDiv){
                    displayDiv.innerText = `${itemName} - Thời gian nhặt cuối: ${timeStr}`;
                    if(app.reader.nextChapter) app.reader.nextChapter();
                }
            } else {
                console.warn("Lỗi khi nhặt:", json3.err || json3);
            }

        } catch(e){
            console.error("Lỗi app.net.collect:", e);
        }
    });

    // Gọi collect ngay và lặp mỗi 15s
    console.log("Bắt đầu auto collect...");
    app.net.collect();
    setInterval(() => {
        try { app.net.collect(); } catch(e){ console.error("Lỗi trong interval:", e); }
    }, 15000);

})();
