function initFloatingBot() {
    if (document.querySelector("#floatingBubble")) return;

    // 🟢 Tạo bong bóng nổi (trong suốt)
    const bubble = document.createElement("button");
    bubble.id = "floatingBubble";
    bubble.className = "btn rounded-circle position-fixed";
    bubble.style.cssText = `
        bottom: 80px;
        right: 25px;
        width: 60px;
        height: 60px;
        z-index: 1050;
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.4);
        backdrop-filter: blur(6px);
        box-shadow: 0 0 12px rgba(0,0,0,0.2);
    `;
    bubble.innerHTML = `<div style="position:relative;">

    <i class="bi bi-robot fs-3 text-primary"></i>
    <span style="font-size:28px;">✨</span>
  </div>`;
 
    document.body.appendChild(bubble);

    // 🟣 Popup
    const popup = document.createElement("div");
popup.id = "tabPopup";
popup.className = "card shadow-lg border-0 position-fixed";
popup.style.cssText = `
    bottom: 160px;
    right: 25px;
    width: min(90vw, 420px);
    height: min(80vh, 480px);
    display: none;
    z-index: 1049;
    overflow: hidden;
`;
popup.innerHTML = `
    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2 px-3">
        <span><i class="bi bi-gear"></i> Auto BOT</span>
        <button type="button" class="btn-close btn-close-white" id="closePopup"></button>
    </div>
    <div class="card-body p-0" id="popupContent">
        <div class="text-center text-muted py-5">Chưa có nội dung.</div>
    </div>
    <div class="card-footer d-flex justify-content-end gap-2 flex-wrap">
        <button class="btn btn-sm btn-outline-danger" id="btnToggleBot">
            <i class="bi bi-toggle-off"></i> Tắt BOT
        </button>
        <button class="btn btn-sm btn-outline-primary" id="btnReloadContent">
            <i class="bi bi-arrow-clockwise"></i> lịch sử
        </button>
        <button class="btn btn-sm btn-outline-primary" id="btnRender">
            <i class="bi bi-arrow-clockwise"></i> thống kê
        </button>
    </div>
`;
document.body.appendChild(popup);

// ===== Thêm style cho lịch sử =====
const stylepop = document.createElement("style");
stylepop.textContent = `
    #popupContent {
        max-height: calc(80vh - 112px); /* trừ header + footer */
        overflow-y: auto;
    }
    .history-list {
        padding: 0;
        margin: 0;
        list-style: none;
    }
    .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    font-size: 0.9rem;
    gap: 8px; /* khoảng cách giữa item-name và item-time */
}

.history-item .item-name {
    flex: 1 1 auto; /* grow + shrink */
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: red; /* chữ màu đỏ */
}


.history-item .item-time {
    flex: 0 0 auto; /* không co giãn */
    white-space: nowrap;
    color: #666;
    font-size: 0.85rem;
}

    #popupContent::-webkit-scrollbar { width: 6px; }
    #popupContent::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
    #popupContent::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 3px; }
`;
document.head.appendChild(stylepop);

    window.loadTabContent();

    // 🧩 Toggle hiển thị popup
    bubble.addEventListener("click", () => {
        popup.style.display = popup.style.display === "none" ? "block" : "none";
    });

    // 🧩 Đóng popup
    popup.querySelector("#closePopup").addEventListener("click", () => {
        popup.style.display = "none";
    });

    // ⚙️ Bật/tắt BOT + heartbeat aura
    botEnabled = false;
    const toggleBtn = popup.querySelector("#btnToggleBot");
    const btnReloadContent = popup.querySelector("#btnReloadContent");
    const btnRender = popup.querySelector('#btnRender');
    // CSS heartbeat aura
    const style = document.createElement("style");
    style.textContent = `
  @keyframes heartbeat {
    0%   { transform: scale(1); box-shadow: 0 0 15px red, 0 0 25px orange; }
    25%  { transform: scale(1.1); box-shadow: 0 0 20px yellow, 0 0 30px green; }
    50%  { transform: scale(0.95); box-shadow: 0 0 20px cyan, 0 0 30px blue; }
    75%  { transform: scale(1.05); box-shadow: 0 0 25px violet, 0 0 35px pink; }
    100% { transform: scale(1); box-shadow: 0 0 15px red, 0 0 25px orange; }
  }
  .heartbeat {
    animation: heartbeat 1.4s infinite;
  }
`;


    document.head.appendChild(style);
    btnRender.addEventListener ("click",()=>{window.renderTodayStats();});
    toggleBtn.addEventListener("click", () => {
    window.autoCollector.botEnabled = !window.autoCollector.botEnabled;
    
    if (window.autoCollector.botEnabled) {
        toggleBtn.className = "btn btn-sm btn-success";
        toggleBtn.innerHTML = `<i class="bi bi-toggle-on"></i> Đã bật`;   
        bubble.innerHTML = `<i class="bi bi-lightning fs-3 text-warning"></i>`;
        window.autoCollector.startBot();
    } else {
        toggleBtn.className = "btn btn-sm btn-outline-danger";
        toggleBtn.innerHTML = `<i class="bi bi-toggle-off"></i> Tắt BOT`;
        bubble.innerHTML = `<i class="bi bi-robot fs-3 text-primary"></i>`;
        window.autoCollector.stopBot();
    }
    updateHeartbeat();
});


    // 🔄 Tải lại nội dung
    btnReloadContent.addEventListener("click",()=>{window.loadTabContent();});
    // 🧱 Hàm hiển thị nội dung tab từ lịch sử nhặt item
    // ✋ Cho phép bong bóng kéo được
    let isDragging = false, offsetX, offsetY;

    const startDrag = (e) => {
        isDragging = true;
        const rect = bubble.getBoundingClientRect();
        offsetX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        offsetY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        bubble.style.cursor = "grabbing";
    };

    const doDrag = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - offsetX;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - offsetY;
        bubble.style.left = x + "px";
        bubble.style.top = y + "px";
        bubble.style.right = "auto";
        bubble.style.bottom = "auto";
    };

    const stopDrag = () => {
        isDragging = false;
        bubble.style.cursor = "grab";
    };

    // Desktop
    bubble.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);

    // Mobile
    bubble.addEventListener("touchstart", startDrag, { passive: true });
    document.addEventListener("touchmove", doDrag, { passive: false });
    document.addEventListener("touchend", stopDrag, { passive: true });

    console.log("✅ Floating Bot đã khởi tạo với heartbeat aura khi bật!");
}// ===== Object quản lý bot toàn cục =====
window.loadTabContent = async function() {
    const container = document.getElementById("popupContent");
    container.innerHTML = `<div class="text-center py-3">Đang tải lịch sử...</div>`;

    try {
        const history = JSON.parse(localStorage.getItem("collectedItems") || "[]");

        // Xóa bảng cũ
        container.innerHTML = "";

        if (!history.length) {
            container.innerHTML = `<div class="text-center py-5 text-muted">Chưa nhặt được vật phẩm nào.</div>`;
            return;
        }

        // Tạo wrapper scrollable
        const listWrapper = document.createElement("div");
        listWrapper.className = "history-list";
        listWrapper.style.maxHeight = "250px";
        listWrapper.style.overflowY = "auto";

        // Tạo HTML từng item
        history.forEach(h => {
            const div = document.createElement("div");
            div.className = "history-item d-flex justify-content-between align-items-center border-bottom py-1 px-2";
            div.innerHTML = `
                <div class="item-name text-truncate flex-grow-1" style="margin-right:10px">${h.item}</div>
                <div class="item-time text-secondary">${h.time}</div>
            `;
            listWrapper.appendChild(div);
        });

        container.appendChild(listWrapper);

        // Scroll xuống cuối
        listWrapper.scrollTop = listWrapper.scrollHeight;

        // Scroll bar đẹp hơn (thêm style nếu chưa có)
        if (!document.getElementById("history-list-style")) {
            const style = document.createElement("style");
            style.id = "history-list-style";
            style.textContent = `
                .history-list::-webkit-scrollbar { width: 6px; }
                .history-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
                .history-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 3px; }
                .history-item { font-size: 0.9rem; }
            `;
            document.head.appendChild(style);
        }

    } catch (e) {
        container.innerHTML = `<div class="text-danger text-center py-3">❌ Lỗi đọc lịch sử</div>`;
        console.error(e);
    }
};

window.renderTodayStats = function() {
    const container = document.getElementById("popupContent");
    container.innerHTML = `<div class="text-center py-3">Đang tải thống kê hôm nay...</div>`;

    try {
        const history = JSON.parse(localStorage.getItem("collectedItems") || "[]");

        // Xóa bảng cũ
        container.innerHTML = "";

        if (!history.length) {
            container.innerHTML = `<div class="text-center py-5 text-muted">Chưa nhặt được vật phẩm nào.</div>`;
            return;
        }

        // Lấy ngày hôm nay dạng dd/mm/yyyy
        const todayStr = new Date().toLocaleDateString();

        // Lọc item hôm nay
        const todayItems = history.filter(h => h.time.includes(todayStr));

        if (!todayItems.length) {
            container.innerHTML = `<div class="text-center py-5 text-muted">Hôm nay chưa nhặt được vật phẩm nào.</div>`;
            return;
        }

        // Thống kê số lần nhặt từng item
        const stats = {};
        todayItems.forEach(h => {
            stats[h.item] = (stats[h.item] || 0) + 1;
        });

        // Tính tổng số item hôm nay
        const totalItems = todayItems.length;

        // Render vào bảng
        const listWrapper = document.createElement("div");
        listWrapper.className = "history-list";
        listWrapper.style.maxHeight = "250px";
        listWrapper.style.overflowY = "auto";

        Object.entries(stats).forEach(([itemName, count]) => {
            const div = document.createElement("div");
            div.className = "history-item d-flex justify-content-between align-items-center border-bottom py-1 px-2";
            div.innerHTML = `
                <div class="item-name text-truncate flex-grow-1" style="margin-right:10px">${itemName}</div>
                <div class="item-time text-secondary">Nhặt ${count} lần</div>
            `;
            listWrapper.appendChild(div);
        });

        // Thêm tổng số item hôm nay
        const totalDiv = document.createElement("div");
        totalDiv.className = "history-item d-flex justify-content-between align-items-center border-bottom py-1 px-2 fw-bold";
        totalDiv.innerHTML = `
            <div class="item-name flex-grow-1">Tổng số item hôm nay</div>
            <div class="item-time text-secondary">${totalItems}</div>
        `;
        listWrapper.appendChild(totalDiv);

        container.appendChild(listWrapper);

        // Scroll xuống cuối
        listWrapper.scrollTop = listWrapper.scrollHeight;

        // Scroll bar đẹp hơn
        if (!document.getElementById("history-list-style")) {
            const style = document.createElement("style");
            style.id = "history-list-style";
            style.textContent = `
                .history-list::-webkit-scrollbar { width: 6px; }
                .history-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
                .history-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 3px; }
                .history-item { font-size: 0.9rem; }
            `;
            document.head.appendChild(style);
        }

    } catch (e) {
        container.innerHTML = `<div class="text-danger text-center py-3">❌ Lỗi thống kê hôm nay</div>`;
        console.error(e);
    }
};


window.autoCollector = {
            state: {
                timeoutId: null,
                watcherId: null,
                stopped: false,
                lastRead: true,
                lastBotEnabled: null
            },
            chapters: null,   // lưu danh sách chapter
            currentChapid : null,
            book: null           // lưu luôn thông tin sách
        ,

    botEnabled: false, // mặc định bật

    // ===== Lấy level người dùng =====
    getUserLevel() {
        try {
            return parseInt(app?.user?.profile?.level || 1);
        } catch {
            return 1;
        }
    },

    // ===== Xác định interval theo level =====
    getIntervalByLevel() {
        const level = this.getUserLevel();
        switch (level) {
            case 1: return 2 * 60 * 1000;
            case 2: return 5 * 60 * 1000;
            case 3: return 7 * 60 * 1000;
            default: return 12 * 60 * 1000;
        }
    },

    // ===== Stop / Restart =====
    stop(reason = "unknown") {
        if (this.state.stopped) return;
        this.state.stopped = true;
        if (this.state.timeoutId) {
            clearTimeout(this.state.timeoutId);
            this.state.timeoutId = null;
        }
        console.log("[AutoCollect] Dừng lại:", reason);
    },

    restart(reason = "unknown") {
        if (!this.state.stopped) return;
        console.log("[AutoCollect] Restart do:", reason);
        this.state.stopped = false;
        this.scheduleNext();
    },

    // ===== Watcher display =====
    startDisplayWatcher() {
        if (this.state.watcherId) clearInterval(this.state.watcherId);
        if (!app?.reader) return console.warn("[AutoCollect] app.reader chưa sẵn sàng");
        showNotification('Bot đang khởi động');
        this.state.lastDisplay = app.reader.display;
        this.state.lastBotEnabled = this.botEnabled;
        console.log("[AutoCollect] Watcher khởi động, display =", this.state.lastDisplay);

        this.state.watcherId = setInterval(() => {
    const display = app.reader.display;

    // 1️⃣ Display null → chưa đọc truyện → stop
    if (display == null && this.state.lastDisplay != null) {
        this.stop("display null");
        showNotification("Bạn chưa đọc truyện, bot tạm dừng");
  
    }

    // 2️⃣ Display trở lại → restart
    if (display != null && this.state.lastDisplay == null) {
        this.restart("display trở lại");
        showNotification(" bot tiếp tục hoạt động");
    }

    this.state.lastDisplay = display;

    // 3️⃣ Theo dõi bật/tắt bot thủ công
    if (this.botEnabled !== this.state.lastBotEnabled) {
        if (!this.botEnabled) {
            this.stop("botEnabled = false");
            showNotification("Bot đã bị tắt");
 
        } else {
            this.restart("botEnabled = true");
            showNotification(" Bot đã được bật ");

        }
        this.state.lastBotEnabled = this.botEnabled;
    }
    updateHeartbeat();
}, 1000);

    },

    // ===== Lưu lịch sử nhặt =====
    saveCollectedItem(itemName,book,chapterId) {
        const history = JSON.parse(localStorage.getItem("collectedItems") || "[]");
        history.push({
            item: itemName,
            time: new Date().toLocaleString()
        });
        localStorage.setItem("collectedItems", JSON.stringify(history));
        if (book && chapterId) {
        const lastCollect = {
            host: book.host,
            bookId: book.bookId,
            chapterId: chapterId
        };
        localStorage.setItem("lastcollectbook", JSON.stringify(lastCollect));
    };
        window.loadTabContent();
    },

   
    async collect() {
        if (this.state.stopped || !this.botEnabled) return;
        if (this.state.lastRead) {
        await app.reader.loadKeyFromServer(this.book.host, this.book.bookId);
        try {
            const chapter = await app.reader.getContent2(this.book.host, this.book.bookId, this.currentChapid);
            
        } catch (error) {
            console.error("Lỗi khi lấy nội dung chương:", error);
            // Đảo trạng thái bot khi có lỗi
            window.autoCollector.botEnabled = !window.autoCollector.botEnabled;
        }

        
        }
        try {
            // 1️⃣ Check nhặt
            const res1 = await fetch("/index.php?ngmar=iscollectable", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "ngmar=tcollect&sajax=trycollect",
                credentials: "include"
            });
            const check = await res1.json();
            if (check.code !== 1) {
                console.log("[AutoCollect] Không có item để nhặt.");
                this.state.lastRead =false;
                return;
            }

            // 2️⃣ Collect item
            const res2 = await fetch("/index.php?ngmar=collect", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "sajax=collect",
                credentials: "include"
            });
            const result = await res2.json();
            console.log("[AutoCollect] Collect result:", result);

            const cType = result.type;
            const itemName = result.name || "Vật phẩm không tên";    

            // 4️⃣ Delay ngẫu nhiên 5–10s
            const delay = 5000 + Math.random() * 5000;
            console.log(`[AutoCollect] Đợi ${(delay/1000).toFixed(1)}s trước khi gửi request fcl...`);
            await new Promise(r => setTimeout(r, delay));

            // 5️⃣ Request FCL
            let params3 = `ajax=fcollect&c=${ this.currentChapid}`;
            console.log(params3);
            if (cType === 3 || cType === 4) {
                const nname = document.getElementById("cName")?.innerText || result.name;
                const ninfo = document.getElementById("cInfo")?.innerText || result.info;
                params3 += `&newname=${encodeURIComponent(nname)}&newinfo=${encodeURIComponent(ninfo)}`;
            }
            const res3 = await fetch("/index.php?ngmar=fcl", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: params3,
                credentials: "include"
            });
            const fcl = await res3.json();

            if (fcl.code === 1) {
                this.saveCollectedItem(itemName,this.book,this.currentChapid);
                console.log(`[AutoCollect] Nhặt ${itemName} thành công lúc ${new Date().toLocaleString()}`);
                showNotification('bot lụm được'+ itemName );
                updateNextChapter();
                this.lastRead = true;
            } else {
                console.warn("[AutoCollect] FCL lỗi:", fcl.err || fcl);
            }

        } catch (err) {
            console.error("[AutoCollect] Lỗi collect:", err);
        }
    },

    // ===== Lên lịch lần kế tiếp =====
    async scheduleNext() {
        if (this.state.stopped || !this.botEnabled) return;
        
        

        this.collect().finally(() => {
            const interval = this.getIntervalByLevel();
            console.log(`[AutoCollect] Lên lịch chạy lại sau ${(interval / 60000).toFixed(1)} phút (level ${this.getUserLevel()})`);
            this.state.timeoutId = setTimeout(() => this.scheduleNext(), interval);
        });
    },

    // ===== Khởi động ban đầu =====
    async init() {
    if (!this.botEnabled) return;

    // chờ cookie access
    while (!document.cookie.includes("access=")) {
        console.log("[AutoCollect] Chưa đăng nhập, chờ 1s...");
        await new Promise(r => setTimeout(r, 1000));
    }

    // chờ fetch chapters
    let ok = false;
    while (!ok) {
        ok = await fetchLastBookChapters();
        if (!ok) {
            console.log("[AutoCollect] Fetch chapters lỗi, thử lại sau 1s...");
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    updateNextChapter();

    console.log("[AutoCollect] Bắt đầu hoạt động...");
    this.startDisplayWatcher();
    this.scheduleNext();
}
,

    // ===== Bật/tắt bot thủ công =====
    async startBot() {
    this.botEnabled = true;
    console.log("[AutoCollect] Bật bot thủ công");

    this.state.stopped = false;

    // Nếu chưa có current chapter → fetch chapters trước
    if (!window.autoCollector.currentChapid) {
        let ok = false;
        while (!ok) {
            ok = await fetchLastBookChapters();
            if (!ok) {
                console.log("[AutoCollect] Fetch chapters lỗi, thử lại sau 1s...");
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        updateNextChapter();
    }

    this.scheduleNext();
    startBotNotification();
}
,

    stopBot() {
        this.botEnabled = false;
        console.log("[AutoCollect] Tắt bot thủ công");
        this.state.stopped = true;
        if (this.state.timeoutId) {
            clearTimeout(this.state.timeoutId);
            this.state.timeoutId = null;
        }
    }
};
function showNotification(message) {
    // Nếu đã có thông báo cũ thì remove
    let oldToast = document.getElementById("notification-toast");
    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");
    toast.id = "notification-toast";
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 25px;
        min-width: 220px;
        max-width: 300px;
        background: rgba(0,0,0,0.85);
        color: #fff;
        padding: 10px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 0.95rem;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;

    // Icon + message
    toast.innerHTML = `<i class="bi bi-gift-fill text-warning fs-5"></i> ${message}`;

    document.body.appendChild(toast);

    // Hiển thị
    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    // Ẩn sau 3.5 giây
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};
function updateHeartbeat() {
    const bubble = document.querySelector("#floatingBubble");
    if (!bubble) return;

    if (window.autoCollector.botEnabled ) {
        bubble.classList.add("heartbeat");
        bubble.innerHTML = `<i class="bi bi-lightning fs-3 text-warning"></i>`;
    } else {
        bubble.classList.remove("heartbeat");
        bubble.innerHTML = `<i class="bi bi-robot fs-3 text-primary"></i>`;
    }
}
function startBotNotification() {
    if (!app.tts.mediaSession.isRunning) {
        // Ép trạng thái bot đang chạy
        app.tts.mediaSession.getCurrentState = () => ({
            playState: true,
            title: "Bot đang chạy",
            progress: 100,
            icon: null,
            novel: "Auto BOT"
        });

        // Cập nhật ngay
        app.tts.mediaSession.update(true);
        console.log("✅ Bot notification đã bật");
    }
}
function getLastReadBook() {
    try {
        // Không có lịch sử đọc
        if (!app.history || !app.history.readhistory || app.history.readhistory.length === 0) {
            showNotification("Không tìm thấy lịch sử đọc, vui lòng đọc truyện trước");
            return null;
        }

        const firstBook = app.history.readhistory[0];

        let last = null;
        try {
            last = JSON.parse(localStorage.getItem("lastcollectbook") || "null");
        } catch (e) {
            // JSON lỗi thì bỏ qua và xử lý như null
        }

        // lastcollectbook rỗng → tạo mới
        if (!last) {
            localStorage.setItem("lastcollectbook", JSON.stringify({}));

            return {
                host: firstBook.host,
                bookId: firstBook.id,
                chapterId: null
            };
        }

        // lastcollectbook hợp lệ
        if (last.host && last.bookId) {
            return {
                host: last.host,
                bookId: last.bookId,
                chapterId: last.chapterId 
            };
        }

        // Sai → fallback về sách đầu tiên
        return {
            host: firstBook.host,
            bookId: firstBook.id,
            chapterId: null
        };

    } catch (e) {
        return null;
    }
}

async function fetchLastBookChapters() {
    const book = await getLastReadBook();

    if (!book) return false;

    try {
        const chapters = await getChapterListOnline(book.host, book.bookId, false);

        // 👉 Log kiểm tra chapters
        console.log("📘 Tổng số chương nhận được:", chapters?.length || 0);
        console.log("📘 3 chương đầu tiên:", chapters?.slice(0, 3));

        if (!window.autoCollector) {
            window.autoCollector = {
                state: {
                    timeoutId: null,
                    watcherId: null,
                    stopped: false,
                    lastDisplay: null,
                    lastBotEnabled: null
                },
                botEnabled: true
            };
        }

        window.autoCollector.book = book;
        window.autoCollector.chapters = chapters;

        return true;

    } catch (e) {
        console.error(e);
        showNotification("Không thể tải danh sách chương từ server");
        return false;
    }
}

function updateNextChapter() {
    const last = JSON.parse(localStorage.getItem("lastcollectbook") || "null");
    const chapters = window.autoCollector?.chapters || [];
    if (!chapters.length) {
        window.autoCollector.currentChapid = null;
        return;
    }

    let nextChapter = null;

    // Nếu lastcollectbook không tồn tại hoặc thiếu thông tin → lấy chapter đầu tiên
    if (!last || !last.host || !last.bookId || !last.chapterId) {
        nextChapter = chapters[0];
    }
    // Nếu lastCollect tồn tại và thuộc sách hiện tại → lấy chapter tiếp theo
    else if (last.host === window.autoCollector.book.host && last.bookId === window.autoCollector.book.bookId) {
        const idx = chapters.findIndex(c => c.cid === last.chapterId);
        const nextIndex = (idx >= 0 ? idx + 1 : 0) % chapters.length; // nếu cuối → quay lại đầu
        nextChapter = chapters[nextIndex] || chapters[0];
    }
    // Nếu lastCollect không thuộc sách này → trả về chapter đầu
    else {
        nextChapter = chapters[0];
    }

    // Cập nhật currentChapid
    window.autoCollector.currentChapid = nextChapter.cid;
    console.log("[AutoCollect] Chapter tiếp theo được đặt:", window.autoCollector.currentChapid);
}



// ===== Khởi động bot =====
initFloatingBot()
window.autoCollector.init();
