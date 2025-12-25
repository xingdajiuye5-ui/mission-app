// --- 安全装置: HTMLの読み込みとFirebaseの存在を確認してから実行 ---
document.addEventListener('DOMContentLoaded', function() {
    
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDKが読み込まれていません。HTMLの順序を確認してください。");
        return;
    }

    // --- 1. Firebase 設定 & 初期化 ---
    const firebaseConfig = {
        apiKey: "AIzaSyBTGOywRW3eJQ1HuFkLq370ZN_K2Jvk1N0",
        authDomain: "project-2484640073329297929.firebaseapp.com",
        databaseURL: "https://project-2484640073329297929-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "project-2484640073329297929",
        storageBucket: "project-2484640073329297929.firebasestorage.app",
        messagingSenderId: "389887087574",
        appId: "1:389887087574:web:8087bc2c289b2ecbee4a77",
        measurementId: "G-JDEJRY94MW"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const dbRef = firebase.database().ref('studentTasks');

    // --- 2. リアルタイムデータ同期 ---
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const lists = ["list-un-1", "list-un-2", "list-cp-1", "list-cp-2"];
        lists.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = "";
        });

        if (data) {
            Object.keys(data).forEach(key => createItemUI(data[key], key));
        }
        updateProgress();
        filter();
    });

    // --- 3. UI生成関数 ---
    function createItemUI(item, key) {
        const status = item.status || "un-1";
        const targetList = document.getElementById(`list-${status}`);
        if (!targetList) return;

        const isDone = status.startsWith('cp');
        const li = document.createElement('li');
        li.setAttribute('data-cat', item.category);
        li.setAttribute('data-status', status);

        li.innerHTML = `
            <div style="display:flex; align-items:center; flex:1;">
                <input type="checkbox" class="task-check" data-key="${key}" ${isDone ? 'checked disabled' : ''}>
                <div>
                    <div class="name-text" style="${isDone ? 'text-decoration:line-through; color:#cbd5e1;' : ''}">${item.name}</div>
                    <span class="tag">${item.category}</span>
                </div>
            </div>
            <button class="delete-btn">削除</button>
        `;

        li.querySelector('.delete-btn').onclick = () => {
            if(confirm('削除しますか？')) dbRef.child(key).remove();
        };

        targetList.appendChild(li);
    }

    // --- 4. ボタン等のイベント設定 ---

    // 追加ボタン
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.onclick = () => {
            const nameEl = document.getElementById('nameInput');
            const catEl = document.getElementById('categorySelect');
            const statEl = document.getElementById('initialStatusSelect');
            if (!nameEl || !nameEl.value) return;

            dbRef.push({
                name: nameEl.value,
                category: catEl.value,
                status: statEl.value
            }).then(() => {
                alert("登録しました");
                nameEl.value = "";
            });
        };
    }

    // まとめて移動ボタン
    const bulkBtn = document.getElementById('bulkDoneBtn');
    if (bulkBtn) {
        bulkBtn.onclick = () => {
            const selected = document.querySelectorAll('.task-list:not(.finished) .task-check:checked');
            if (selected.length === 0) return alert("項目を選択してください");
            if (confirm(`${selected.length}件を完了にしますか？`)) {
                selected.forEach(cb => {
                    const key = cb.getAttribute('data-key');
                    const li = cb.closest('li');
                    const nextStatus = li.getAttribute('data-status').replace('un', 'cp');
                    dbRef.child(key).update({ status: nextStatus });
                });
            }
        };
    }

    // 全削除
    const clearBtn = document.getElementById('clearAll');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('全データを消去しますか？') && prompt("パスワードを入力") === "0724") {
                dbRef.remove();
            }
        };
    }

    // フィルタ関連
    ['searchInput', 'filterCategory', 'filterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = filter;
    });

});

// --- 5. ページ切り替え (この関数はHTMLのonclickから呼ばれるためスコープ外に配置) ---
function switchPage(pageId) {
    const pages = document.querySelectorAll('.page');
    const tabs = document.querySelectorAll('.tab-btn');
    const fab = document.getElementById('bulkActionWrapper');

    pages.forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    tabs.forEach(t => {
        const isTarget = (pageId === 'add-page' && t.id === 'tab-add') || (pageId === 'list-page' && t.id === 'tab-list');
        t.classList.toggle('active', isTarget);
    });

    if (fab) {
        fab.style.display = (pageId === 'list-page') ? 'block' : 'none';
    }
}

// --- 6. 補助関数 (進捗・フィルタ) ---
function updateProgress() {
    const n = (id) => {
        const el = document.getElementById(id);
        return el ? el.querySelectorAll('li').length : 0;
    };
    const total = n('list-un-1') + n('list-un-2') + n('list-cp-1') + n('list-cp-2');
    const done = n('list-cp-1') + n('list-cp-2');
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    
    const bar = document.getElementById('progressBar');
    const txt = document.getElementById('progressPercent');
    if (bar) bar.style.width = percent + "%";
    if (txt) txt.innerText = percent + "%";
}

function filter() {
    const searchInput = document.getElementById('searchInput');
    const filterCat = document.getElementById('filterCategory');
    const filterStat = document.getElementById('filterStatus');
    if (!searchInput || !filterCat || !filterStat) return;

    const q = searchInput.value.toLowerCase();
    const cat = filterCat.value;
    const stat = filterStat.value;

    document.querySelectorAll('.task-list li').forEach(li => {
        const nameText = li.querySelector('.name-text');
        if (!nameText) return;
        
        const name = nameText.innerText.toLowerCase();
        const itemCat = li.getAttribute('data-cat');
        const itemStat = li.getAttribute('data-status');

        const mName = name.includes(q);
        const mCat = (cat === 'all' || itemCat === cat);
        const mStat = (stat === 'all' || itemStat.endsWith(stat));
        li.style.display = (mName && mCat && mStat) ? 'flex' : 'none';
    });
}
