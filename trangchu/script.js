/* ==========================================================================
   SCRIPT DÙNG CHUNG CHO TẤT CẢ CÁC TRANG (index.html, trang2.html, trang3.html...)
   File này CHỈ CẦN 1 BẢN DUY NHẤT trong thư mục trang/, mọi trang cùng include:

       <script>
       var CURRENT_PAGE = 1; // đổi số này riêng cho từng trang
       var TOTAL_PAGES = 3;  // tăng lên khi thêm trang mới, sửa Ở TẤT CẢ các trang
       </script>
       <script src="script.js"></script>

   Sửa gì trong file này thì mọi trang đều tự động được cập nhật, khỏi copy tay.
   ========================================================================== */

var MAX_VISIBLE_PAGES = 3; /* tối đa hiện bao nhiêu số trang cùng lúc trong thanh chuyển trang */

function pageHref(n) {
    return n === 1 ? "1.html" : " + .html ";
}

function renderPageNav() {
    var nav = document.getElementById("pageNav");
    if (!nav) return;
    nav.innerHTML = "";

    if (TOTAL_PAGES <= 1) return;

    function addItem(label, page, opts) {
        opts = opts || {};
        var el = document.createElement(opts.disabled ? "span" : "a");
        if (!opts.disabled) el.href = pageHref(page);
        if (opts.active) el.classList.add("active");
        if (opts.disabled) el.classList.add("disabled");
        el.textContent = label;
        nav.appendChild(el);
    }

    var half = Math.floor(MAX_VISIBLE_PAGES / 2);
    var start = Math.max(1, CURRENT_PAGE - half);
    var end = start + MAX_VISIBLE_PAGES - 1;
    if (end > TOTAL_PAGES) {
        end = TOTAL_PAGES;
        start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
    }

    addItem("«", 1, { disabled: CURRENT_PAGE === 1 });
    addItem("‹", CURRENT_PAGE - 1, { disabled: CURRENT_PAGE === 1 });

    for (var i = start; i <= end; i++) {
        addItem(String(i), i, { active: i === CURRENT_PAGE });
    }

    addItem("›", CURRENT_PAGE + 1, { disabled: CURRENT_PAGE === TOTAL_PAGES });
    addItem("»", TOTAL_PAGES, { disabled: CURRENT_PAGE === TOTAL_PAGES });
}

renderPageNav();

/* ====== MENU NGĂN KÉO ====== */
var menuToggle = document.getElementById("menuToggle");
var drawer = document.getElementById("drawer");
var drawerOverlay = document.getElementById("drawerOverlay");

function openDrawer() {
    drawer.classList.add("open");
    drawerOverlay.classList.add("open");
    menuToggle.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
    drawer.classList.remove("open");
    drawerOverlay.classList.remove("open");
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
}

menuToggle.addEventListener("click", function () {
    if (drawer.classList.contains("open")) {
        closeDrawer();
    } else {
        openDrawer();
    }
});

drawerOverlay.addEventListener("click", closeDrawer);

/* ====== CÔNG TẮC GIAO DIỆN SÁNG / TỐI ====== */
var themeButtons = document.querySelectorAll("#themeSwitch button");

function refreshThemeButtons() {
    var current = document.documentElement.getAttribute("data-theme") || "dark";
    themeButtons.forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.themeChoice === current);
    });
}

themeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
        var choice = btn.dataset.themeChoice;
        document.documentElement.setAttribute("data-theme", choice);
        localStorage.setItem("site-theme", choice);
        refreshThemeButtons();
    });
});

refreshThemeButtons();

/* ====== TÌM KIẾM + LỌC THEO THỂ LOẠI (CHỌN NHIỀU) / NĂM ====== */
var searchInput = document.getElementById("searchInput");
var searchButton = document.getElementById("searchButton");
var genreDropdown = document.getElementById("genreDropdown");
var genreDropdownBtn = document.getElementById("genreDropdownBtn");
var genreDropdownLabel = document.getElementById("genreDropdownLabel");
var genreCount = document.getElementById("genreCount");
var genrePanel = document.getElementById("genrePanel");
var yearDropdown = document.getElementById("yearDropdown");
var yearDropdownBtn = document.getElementById("yearDropdownBtn");
var yearDropdownLabel = document.getElementById("yearDropdownLabel");
var yearCount = document.getElementById("yearCount");
var yearPanel = document.getElementById("yearPanel");
var filterReset = document.getElementById("filterReset");
var movieListEl = document.querySelector(".movie-list");
var movies = Array.from(document.querySelectorAll(".movie")); /* phim CỦA RIÊNG trang này */
var noResults = document.getElementById("noResults");
var pageNavEl = document.getElementById("pageNav");
var selectedGenres = new Set();
var selectedYears = new Set();

/* ---- Dữ liệu phim TOÀN BỘ các trang, tải bằng fetch khi cần tìm kiếm/lọc ----
   Yêu cầu: phải mở trang qua server (http://localhost:...), không mở trực tiếp file:// */
var allMoviesCache = null;
var allMoviesLoading = null;

function getAllPageFiles() {
    var files = [];
    for (var i = 1; i <= TOTAL_PAGES; i++) files.push(pageHref(i));
    return files;
}

function loadAllMovies() {
    if (allMoviesCache) return Promise.resolve(allMoviesCache);
    if (allMoviesLoading) return allMoviesLoading;

    var ownFile = pageHref(CURRENT_PAGE);

    allMoviesLoading = Promise.all(getAllPageFiles().map(function (file) {
        if (file === ownFile) return Promise.resolve(movies.slice());

        return fetch(file)
            .then(function (res) { return res.text(); })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, "text/html");
                return Array.from(doc.querySelectorAll(".movie")).map(function (node) {
                    return document.importNode(node, true);
                });
            })
            .catch(function () {
                return []; /* trang chưa tồn tại hoặc lỗi tải thì bỏ qua, không chặn cả trang */
            });
    })).then(function (groups) {
        var combined = [];
        groups.forEach(function (g) { combined = combined.concat(g); });
        allMoviesCache = combined;
        allMoviesLoading = null;
        return combined;
    });

    return allMoviesLoading;
}

function populateFilters(movieList) {
    var genreSet = new Set();
    var yearSet = new Set();

    movieList.forEach(function (movie) {
        var genres = (movie.dataset.genres || "").split(",");
        genres.forEach(function (g) {
            var trimmed = g.trim();
            if (trimmed) genreSet.add(trimmed);
        });
        if (movie.dataset.year) yearSet.add(movie.dataset.year);
    });

    genrePanel.innerHTML = "";
    yearPanel.innerHTML = "";

    Array.from(genreSet).sort().forEach(function (g) {
        var row = document.createElement("label");
        row.className = "filter-checkbox-row";

        var input = document.createElement("input");
        input.type = "checkbox";
        input.value = g;
        input.checked = selectedGenres.has(g);
        input.addEventListener("change", function () {
            if (input.checked) {
                selectedGenres.add(g);
            } else {
                selectedGenres.delete(g);
            }
            updateGenreLabel();
            applyFilters();
        });

        var span = document.createElement("span");
        span.textContent = g;

        row.appendChild(input);
        row.appendChild(span);
        genrePanel.appendChild(row);
    });

    Array.from(yearSet).sort().reverse().forEach(function (y) {
        yearPanel.appendChild(createYearOption(y, y));
    });
    updateYearLabel();
}

function createYearOption(value, label) {
    var row = document.createElement("label");
    row.className = "filter-checkbox-row";

    var input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.checked = selectedYears.has(value);
    input.addEventListener("change", function () {
        if (input.checked) {
            selectedYears.add(value);
        } else {
            selectedYears.delete(value);
        }
        updateYearLabel();
        applyFilters();
    });

    var span = document.createElement("span");
    span.textContent = label;

    row.appendChild(input);
    row.appendChild(span);
    return row;
}

function updateYearLabel() {
    var count = selectedYears.size;
    if (count === 0) {
        yearDropdownLabel.textContent = "Năm";
        yearCount.hidden = true;
        yearCount.textContent = "0";
    } else {
        yearDropdownLabel.textContent = "Năm";
        yearCount.hidden = false;
        yearCount.textContent = String(count);
    }
    yearDropdownBtn.classList.toggle("has-selection", count > 0);
}

function toggleYearPanel(forceState) {
    var open = typeof forceState === "boolean" ? forceState : !yearDropdown.classList.contains("open");
    yearDropdown.classList.toggle("open", open);
    yearDropdownBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function updateGenreLabel() {
    var count = selectedGenres.size;
    if (count === 0) {
        genreDropdownLabel.textContent = "Thể loại";
        genreCount.hidden = true;
        genreCount.textContent = "0";
    } else {
        genreDropdownLabel.textContent = "Thể loại";
        genreCount.hidden = false;
        genreCount.textContent = String(count);
    }
    genreDropdownBtn.classList.toggle("has-selection", count > 0);
}

function toggleGenrePanel(forceState) {
    var open = typeof forceState === "boolean" ? forceState : !genreDropdown.classList.contains("open");
    genreDropdown.classList.toggle("open", open);
    genreDropdownBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

genreDropdownBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleGenrePanel();
    toggleYearPanel(false);
});

yearDropdownBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleYearPanel();
    toggleGenrePanel(false);
});

document.addEventListener("click", function (e) {
    if (!genreDropdown.contains(e.target)) {
        toggleGenrePanel(false);
    }
    if (!yearDropdown.contains(e.target)) {
        toggleYearPanel(false);
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        toggleGenrePanel(false);
        toggleYearPanel(false);
    }
});

function isFilterActive() {
    return !!searchInput.value.trim() || selectedGenres.size > 0 || selectedYears.size > 0;
}

function getMatchedMovies(sourceList) {
    var keyword = searchInput.value.trim().toLowerCase();

    return sourceList.filter(function (movie) {
        var title = (movie.dataset.title || movie.querySelector("h3")?.textContent || "").toLowerCase();
        var type = (movie.dataset.type || "").toLowerCase();
        var genreList = (movie.dataset.genres || "").split(",").map(function (g) { return g.trim(); }).filter(Boolean);
        var genresLower = genreList.map(function (g) { return g.toLowerCase(); });
        var movieYear = movie.dataset.year || "";

        var matchesKeyword = !keyword || title.includes(keyword) || type.includes(keyword) || genresLower.join(",").includes(keyword);
        var matchesGenre = selectedGenres.size === 0 || genreList.some(function (g) { return selectedGenres.has(g); });
        var matchesYear = selectedYears.size === 0 || selectedYears.has(movieYear);

        return matchesKeyword && matchesGenre && matchesYear;
    });
}

/* Quay về chế độ xem bình thường: đúng những phim có sẵn trên trang tĩnh này + thanh chuyển trang */
function showOwnPage() {
    if (pageNavEl) pageNavEl.style.display = "";

    if (movieListEl.dataset.mode === "search") {
        movieListEl.innerHTML = "";
        movies.forEach(function (m) { movieListEl.appendChild(m); });
        movieListEl.dataset.mode = "own";
    }

    noResults.hidden = true;
}

var renderToken = 0; /* để bỏ qua kết quả tải chậm nếu người dùng đã gõ tiếp/xoá lọc */

function renderPage() {
    if (!isFilterActive()) {
        renderToken++;
        showOwnPage();
        return;
    }

    var myToken = ++renderToken;
    if (pageNavEl) pageNavEl.style.display = "none";

    loadAllMovies().then(function (all) {
        if (myToken !== renderToken) return; /* đã có yêu cầu lọc mới hơn, bỏ kết quả này */

        var matched = getMatchedMovies(all);

        movieListEl.innerHTML = "";
        movieListEl.dataset.mode = "search";

        matched.forEach(function (movie) {
            var clone = movie.cloneNode(true);
            attachMovieEvents(clone);
            movieListEl.appendChild(clone);
        });

        noResults.hidden = matched.length !== 0;
    });
}

function applyFilters() {
    renderPage();
}

/* Hiện ngay danh sách/lọc theo trang này trước cho nhanh, rồi âm thầm tải các trang còn lại
   để bổ sung đầy đủ Thể loại/Năm và phục vụ tìm kiếm xuyên trang */
populateFilters(movies);
updateGenreLabel();
searchInput.addEventListener("input", applyFilters);
searchButton.addEventListener("click", applyFilters);
filterReset.addEventListener("click", function () {
    searchInput.value = "";
    selectedGenres.clear();
    selectedYears.clear();
    genrePanel.querySelectorAll("input[type=checkbox]").forEach(function (cb) { cb.checked = false; });
    yearPanel.querySelectorAll("input[type=checkbox]").forEach(function (cb) { cb.checked = false; });
    updateGenreLabel();
    updateYearLabel();
    applyFilters();
});

renderPage();

loadAllMovies().then(function (all) {
    populateFilters(all); /* cập nhật đầy đủ Thể loại/Năm từ TẤT CẢ các trang */
});

/* ====== BẤM VÀO POSTER: CHUYỂN SANG TRANG GIỚI THIỆU PHIM ====== */
function goToMovieDetail(movie) {
    var seasons = [];
    try {
        seasons = JSON.parse(movie.dataset.seasons || "[]");
    } catch (e) {
        seasons = [];
    }

    var viNameEl = movie.querySelector(".ten-anime");

    var detail = {
        title: movie.dataset.title || "",
        vi: movie.dataset.vi || (viNameEl ? viNameEl.textContent : ""),
        poster: movie.dataset.poster || "",
        year: movie.dataset.year || "",
        genres: movie.dataset.genres || "",
        desc: movie.dataset.desc || "",
        rating: movie.dataset.rating || "",
        votes: movie.dataset.votes || "",
        views: movie.dataset.views || "",
        duration: movie.dataset.duration || "",
        quality: movie.dataset.quality || "",
        ageRating: movie.dataset.ageRating || "",
        status: movie.dataset.status || "",
        language: movie.dataset.language || "",
        studio: movie.dataset.studio || "",
        director: movie.dataset.director || "",
        country: movie.dataset.country || "",
        seasonNote: movie.dataset.seasonNote || "",
        seasons: seasons
    };

    sessionStorage.setItem("movie-detail", JSON.stringify(detail));
    window.location.href = "thong-tin-phim.html";
}

function attachMovieEvents(movie) {
    movie.addEventListener("click", function () {
        goToMovieDetail(movie);
    });
    movie.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToMovieDetail(movie);
        }
    });
}

movies.forEach(attachMovieEvents);

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        closeDrawer();
    }
});
