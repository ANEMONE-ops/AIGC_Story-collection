(function () {
  "use strict";

  const STORAGE_KEY = "yuan-yu-archive-v2";
  const PROJECTS_KEY = "yuan-yu-studio-v1";
  const stories = window.STORIES;
  const storyIds = ["moon", "harbor", "whales"];
  const storyPages = { moon: "moon.html", harbor: "harbor.html", whales: "whales.html" };
  const readerPages = { moon: "read-moon.html", harbor: "read-harbor.html", whales: "read-whales.html" };
  const chapterLabels = { moon: ["退件柜的灯", "穿过无声海", "寄出与回信"], harbor: ["空白十七秒", "灯塔的回声", "留白的记忆"], whales: ["云河断口", "跟着回声走", "雨回到高原"] };
  const icons = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 5l7 7-7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h12v16l-6-3.8-6 3.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M2 12h2m16 0h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.1A8.7 8.7 0 0 1 8.9 3.8 8.8 8.8 0 1 0 20.2 15.1Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M17 9a5 5 0 0 1 0 6m2.5-9a9 9 0 0 1 0 12"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5v9a1.5 1.5 0 0 0 1.5 1.5H8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };
  let store = readStore();
  let lightboxItems = [];
  let lightboxIndex = 0;
  let slideshowTimer = 0;
  let toastTimer = 0;
  let galleryState = { query: "", story: "all", favorites: false, view: "grid", sort: "story" };
  let atlasStory = "moon";

  function readStore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { favorites: Array.isArray(saved.favorites) ? saved.favorites : [], recent: Array.isArray(saved.recent) ? saved.recent : [], theme: saved.theme === "day" ? "day" : "night", draft: saved.draft || null };
    } catch (error) {
      return { favorites: [], recent: [], theme: "night", draft: null };
    }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (error) {}
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function icon(name, extra) {
    return '<span class="icon ' + (extra || "") + '">' + (icons[name] || "") + "</span>";
  }
  function entryId(storyId, index) { return storyId + ":" + index; }
  function isFavorite(storyId, index) { return store.favorites.indexOf(entryId(storyId, index)) >= 0; }
  function getScene(storyId, index) { return stories[storyId].scenes[index]; }
  function allEntries() {
    const result = [];
    storyIds.forEach(function (id) {
      stories[id].scenes.forEach(function (scene, index) {
        result.push({ storyId: id, story: stories[id], scene: scene, index: index, id: entryId(id, index) });
      });
    });
    return result;
  }
  function storyHref(id) { return storyPages[id] || "index.html"; }
  function readerHref(id, index) { return (readerPages[id] || "index.html") + (typeof index === "number" ? "?scene=" + (index + 1) : ""); }
  function saveRead(storyId, index) {
    const item = { storyId: storyId, index: index, title: getScene(storyId, index).title, visited: Date.now() };
    store.recent = [item].concat(store.recent.filter(function (entry) { return entry.storyId !== storyId || entry.index !== index; })).slice(0, 30);
    store.draft = { storyId: storyId, index: index };
    persist();
  }
  function toggleFavorite(storyId, index) {
    const id = entryId(storyId, index);
    store.favorites = isFavorite(storyId, index) ? store.favorites.filter(function (item) { return item !== id; }) : [id].concat(store.favorites);
    persist();
  }
  function showToast(message) {
    const node = document.getElementById("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.classList.remove("is-visible"); }, 2600);
  }
  function header(active) {
    const links = [
      ["home", "index.html", "首页"],
      ["gallery", "gallery.html", "插画图鉴"],
      ["atlas", "atlas.html", "世界地图"],
      ["characters", "characters.html", "人物档案"],
      ["studio", "studio.html", "创作实验室"]
    ];
    const nav = links.map(function (item) {
      return '<a class="nav-link ' + (active === item[0] ? "is-active" : "") + '" href="' + item[1] + '">' + item[2] + "</a>";
    }).join("");
    return '<a class="skip-link" href="#main-content">跳到主要内容</a>' +
      '<header class="site-header"><a class="brand" href="index.html" aria-label="远雨来信首页"><span class="brand-seal">YU</span><span class="brand-copy"><strong>远雨来信</strong><small>ILLUSTRATED STORY ARCHIVE</small></span></a>' +
      '<nav class="site-nav" id="site-nav" aria-label="主要页面">' + nav + '</nav><div class="header-actions">' +
      '<a class="header-action shelf-action" href="shelf.html" aria-label="打开个人书架">' + icon("bookmark") + '<span>书架</span><b id="header-favorite-count">' + store.favorites.length + "</b></a>" +
      '<a class="header-action search-action" href="gallery.html#search" aria-label="搜索插画">' + icon("search") + '<span>搜索</span></a>' +
      '<button class="header-action theme-action" type="button" data-action="theme" aria-label="切换明暗主题">' + icon(store.theme === "night" ? "sun" : "moon") + '<span>' + (store.theme === "night" ? "日间" : "夜间") + "</span></button>" +
      '<button class="mobile-menu" type="button" data-action="menu" aria-label="打开导航" aria-expanded="false">' + icon("menu") + "</button></div></header>";
  }
  function footer() {
    return '<footer class="site-footer"><a class="footer-brand" href="index.html">远雨来信<span>原创故事 · AIGC插画 · 纯静态作品</span></a><div class="footer-links"><a href="about.html">创作档案</a><a href="shelf.html">我的书架</a><a href="gallery.html">全部插画</a></div><p>故事、角色、图像均为本项目原创创作。浏览记录与收藏仅保存在本机浏览器。</p></footer>';
  }
  function shell(active, content, pageClass) {
    document.documentElement.dataset.theme = store.theme;
    return header(active) + '<main id="main-content" class="' + (pageClass || "") + '">' + content + "</main>" + footer() +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +
      '<dialog class="lightbox" id="art-lightbox" aria-label="插画大图"><button class="lightbox-close" type="button" data-action="lightbox-close" aria-label="关闭大图">' + icon("close") + '</button><button class="lightbox-step lightbox-prev" type="button" data-action="lightbox-prev" aria-label="上一幅插画">上一幅</button><figure><img id="lightbox-image" alt=""><figcaption id="lightbox-caption"></figcaption></figure><button class="lightbox-step lightbox-next" type="button" data-action="lightbox-next" aria-label="下一幅插画">下一幅</button><div class="lightbox-tools"><button type="button" data-action="lightbox-favorite">' + icon("bookmark") + '<span>收藏插画</span></button><a id="lightbox-download" download>' + icon("download") + '<span>下载原图</span></a><button type="button" data-action="lightbox-full">' + icon("expand") + '<span>全屏查看</span></button></div></dialog>';
  }
  function storyCard(id, featured) {
    const story = stories[id];
    return '<article class="story-card ' + (featured ? "story-card-featured " : "") + "theme-" + id + '">' +
      '<a class="story-card-art" href="' + storyHref(id) + '"><img src="' + story.cover + '" alt="' + esc(story.title) + '封面插画" loading="lazy"><span class="art-index">' + story.genre + "</span></a>" +
      '<div class="story-card-copy"><p class="story-byline">' + story.setting + "</p><h3>" + story.title + '</h3><p class="story-card-deck">' + story.subtitle + '</p><a class="text-link" href="' + storyHref(id) + '">进入故事档案 ' + icon("arrow") + "</a></div></article>";
  }
  function renderHome() {
    const last = store.draft && stories[store.draft.storyId] ? store.draft : { storyId: "moon", index: 0 };
    const resume = '<section class="resume-panel"><div><span class="panel-label">你的阅读桌</span><h2>' + (store.draft ? "上次停在这里" : "从任意一封信开始") + '</h2><p>' + stories[last.storyId].shortTitle + " · " + getScene(last.storyId, last.index).title + '</p></div><a class="button button-light" href="' + readerHref(last.storyId, last.index) + '">继续阅读 ' + icon("arrow") + "</a></section>";
    return '<section class="home-hero"><div class="home-hero-copy"><p class="edition-label">原创绘本档案 · 人与生成式AI共同创作</p><h1>三段独立旅程，<br><em>各自抵达一封回信。</em></h1><p class="home-intro">去月球背面送信，走进一座雨港修复记忆，或跟随云鲸穿过迁徙季风。三本故事各有主角、世界与结局，等你挑一条路开始。</p><div class="hero-buttons"><a class="button button-light" href="moon.html">先看月背邮差 ' + icon("arrow") + '</a><a class="button button-outline-light" href="#story-collection">挑选一本故事</a></div><p class="home-note">36格完整分镜 · 36幅原创AI插画 · 13个独立页面</p></div><a class="home-hero-art" href="moon.html" aria-label="打开月背邮差故事"><img src="assets/moon-01-cover.webp" alt="林予在月面邮局发现一封旧信"><span class="hero-art-caption"><b>月背邮差：第十三封信</b><span>开启独立故事档案 ' + icon("arrow") + "</span></span></a></section>" +
      '<div class="home-quickbar"><span>浏览方式</span><a href="gallery.html">按画面翻阅图鉴</a><a href="atlas.html">在地图上选一条路</a><a href="characters.html">从角色认识故事</a><a href="studio.html">自己编一组分镜</a></div>' + resume +
      '<section class="collection-section" id="story-collection"><div class="section-heading"><div><p class="section-overline">三本独立故事</p><h2>选一本开始。</h2></div><a class="text-link" href="gallery.html">浏览全部36幅插画 ' + icon("arrow") + "</a></div>" +
      '<div class="story-collection-grid">' + storyCard("moon", true) + storyCard("harbor", false) + storyCard("whales", false) + "</div></section>" +
      '<section class="home-gallery-section"><div class="section-heading"><div><p class="section-overline">视觉片段</p><h2>先看几格，再决定往哪走。</h2></div><a class="text-link" href="gallery.html">打开完整图鉴 ' + icon("arrow") + "</a></div><div class=\"home-image-ribbon\">" +
      ["moon:4", "harbor:4", "whales:7", "moon:9", "harbor:10", "whales:10"].map(function (ref) { const p = ref.split(":"); return imageTile(p[0], Number(p[1]), "ribbon-tile"); }).join("") +
      "</div></section>";
  }
  function imageTile(storyId, index, extra) {
    const scene = getScene(storyId, index);
    return '<button class="image-tile ' + (extra || "") + '" type="button" data-action="lightbox-open" data-story="' + storyId + '" data-index="' + index + '" aria-label="查看插画：' + esc(scene.title) + '"><img src="' + scene.image + '" alt="' + esc(scene.title) + '" loading="lazy"><span>' + esc(scene.title) + "</span></button>";
  }
  function renderStory(id) {
    const story = stories[id];
    const read = readerHref(id, 0);
    const sections = chapterLabels[id].map(function (label, chapter) {
      const start = chapter * 4;
      const scene = story.scenes[start];
      return '<button class="chapter-entry" type="button" data-action="read-scene" data-story="' + id + '" data-index="' + start + '"><span class="chapter-image"><img src="' + scene.image + '" alt="" loading="lazy"></span><span class="chapter-text"><small>章节 ' + (chapter + 1) + " · 四格分镜</small><b>" + label + '</b><span>' + esc(story.scenes[start].body.slice(0, 64)) + "…</span></span><span class=\"chapter-open\">" + icon("arrow") + "</span></button>";
    }).join("");
    const frames = story.scenes.map(function (scene, index) { return imageTile(id, index, "story-frame-tile"); }).join("");
    const cast = story.cast.map(function (person) {
      return '<article class="cast-row"><span class="cast-initial">' + esc(person.name.slice(0, 1)) + '</span><div><h3>' + esc(person.name) + '</h3><p class="cast-role">' + esc(person.role) + '</p><p>' + esc(person.bio) + "</p></div></article>";
    }).join("");
    return '<section class="story-detail-hero theme-' + id + '"><a class="back-link" href="index.html">' + icon("arrow") + ' 故事选集</a><div class="story-detail-layout"><div class="story-cover-wrap"><img src="' + story.cover + '" alt="' + esc(story.title) + '封面" fetchpriority="high"><div class="cover-stamp">' + story.genre + '</div></div><div class="story-detail-copy"><p class="section-overline">' + story.setting + '</p><h1>' + story.title + '</h1><p class="story-subtitle">' + story.subtitle + '</p><p class="story-synopsis">' + story.synopsis + '</p><div class="story-meta"><span>十二格主线</span><span>独立完整结局</span><span>本地原创插画</span></div><div class="hero-buttons"><a class="button button-light" href="' + read + '">从第一格阅读 ' + icon("arrow") + '</a><a class="button button-outline-light" href="gallery.html?story=' + id + '">查看本篇图鉴</a></div></div></div></section>' +
      '<section class="story-structure content-width"><div class="section-heading"><div><p class="section-overline">故事结构</p><h2>十二格，走完整条主线。</h2></div><p>每格都有一幅对应插画。你可以顺序阅读，也可以直接跳到喜欢的章节或画面。</p></div><div class="chapter-list">' + sections + "</div></section>" +
      '<section class="story-frames-section"><div class="section-heading"><div><p class="section-overline">分镜索引</p><h2>这一篇的全部画面。</h2></div><a class="text-link" href="' + read + '">进入分镜阅读器 ' + icon("arrow") + "</a></div><div class=\"story-frames-grid\">" + frames + "</div></section>" +
      '<section class="cast-section content-width"><div class="section-heading"><div><p class="section-overline">人物档案</p><h2>故事里的同行者。</h2></div><a class="text-link" href=\"characters.html\">查看完整角色档案 ' + icon("arrow") + "</a></div><div class=\"cast-list\">" + cast + "</div></section>" +
      '<section class="story-end-cta"><img src="' + story.scenes[11].image + '" alt="" loading="lazy"><div><p class="section-overline">故事的最后一格</p><h2>' + esc(story.scenes[11].title) + '</h2><p>' + esc(story.scenes[11].line) + '</p><a class="button button-light" href="' + readerHref(id, 11) + '">读到结尾 ' + icon("arrow") + "</a></div></section>";
  }
  function renderReader(id) {
    const story = stories[id];
    const params = new URLSearchParams(location.search);
    const stored = store.draft && store.draft.storyId === id ? store.draft.index : 0;
    const index = Math.max(0, Math.min(11, Number(params.get("scene") || stored + 1) - 1));
    const scene = story.scenes[index];
    const chapter = Math.floor(index / 4);
    saveRead(id, index);
    const rail = story.scenes.map(function (frame, i) {
      return '<button class="reader-thumb ' + (i === index ? "is-current" : "") + '" type="button" data-action="read-scene" data-story="' + id + '" data-index="' + i + '" aria-label="阅读第' + (i + 1) + "格 " + esc(frame.title) + '" aria-current="' + (i === index ? "step" : "false") + '"><img src="' + frame.image + '" alt="" loading="lazy"><span><small>' + String(i + 1).padStart(2, "0") + '</small><b>' + esc(frame.title) + "</b></span></button>";
    }).join("");
    const chapterTabs = chapterLabels[id].map(function (label, i) {
      return '<button type="button" class="reader-chapter ' + (chapter === i ? "is-current" : "") + '" data-action="read-scene" data-story="' + id + '" data-index="' + (i * 4) + '" aria-current="' + (chapter === i ? "true" : "false") + '"><span>' + (i + 1) + '</span>' + label + "</button>";
    }).join("");
    const progress = Math.round(((index + 1) / 12) * 100);
    const bodySize = Number(safeGet("yuan-yu-text-size", "18"));
    return '<section class="reader-page theme-' + id + '" data-reader-story="' + id + '"><div class="reader-topline"><a class="back-link" href="' + storyHref(id) + '">' + icon("arrow") + " 返回故事档案</a><span>" + story.shortTitle + " · " + story.genre + "</span><a class=\"reader-collection-link\" href=\"gallery.html?story=" + id + '">本篇全部插画</a></div>' +
      '<div class="reader-title-row"><div><p class="section-overline">独立分镜阅读器</p><h1>' + story.title + '</h1></div><div class="reader-position"><strong>' + String(index + 1).padStart(2, "0") + '</strong><span> / 12<br>分镜</span></div></div>' +
      '<div class="chapter-tabs" role="group" aria-label="故事章节">' + chapterTabs + "</div>" +
      '<div class="reader-layout"><div class="reader-art-column"><button class="reader-art-button" type="button" data-action="lightbox-open" data-story="' + id + '" data-index="' + index + '" aria-label="放大当前插画"><img src="' + scene.image + '" alt="' + esc(scene.title) + '：' + esc(scene.place) + '" fetchpriority="high"><span class="art-view-label">查看原尺寸 ' + icon("expand") + '</span></button><div class="reader-art-credit"><span>' + esc(scene.place) + '</span><span>原创AI插画 · ' + (index + 1) + ' / 12</span></div></div>' +
      '<article class="reader-copy"><p class="scene-location">' + esc(scene.place) + '</p><h2>' + esc(scene.title) + '</h2><p class="reader-story-text" style="font-size:' + bodySize + 'px">' + esc(scene.body) + '</p><blockquote>' + esc(scene.line) + '</blockquote><div class="reading-progress"><div><span>阅读进度</span><b>' + (index + 1) + ' / 12</b></div><span class="progress-track"><span style="width:' + progress + '%"></span></span></div>' +
      '<div class="reader-controls"><button class="button button-outline-light" type="button" data-action="previous" ' + (index === 0 ? "disabled" : "") + '>上一格</button><button class="button button-light" type="button" data-action="next">' + (index === 11 ? "回到故事首页" : "下一格") + " " + icon("arrow") + '</button></div>' +
      '<div class="reader-tool-row"><button type="button" data-action="speak">' + icon("volume") + '<span>朗读</span></button><button type="button" data-action="font-down" aria-label="减小字号">A−</button><button type="button" data-action="font-up" aria-label="增大字号">A＋</button><button type="button" data-action="favorite" data-story="' + id + '" data-index="' + index + '" aria-pressed="' + isFavorite(id, index) + '">' + icon("bookmark") + "<span>" + (isFavorite(id, index) ? "已收藏" : "收藏此格") + "</span></button><button type=\"button\" data-action=\"share-scene\" data-story=\"" + id + '" data-index="' + index + '">分享这一格</button><button type="button" data-action="focus">' + icon("expand") + "<span>专注模式</span></button></div></article></div>" +
      '<div class="reader-rail-heading"><div><h2>分镜导航</h2><p>点击缩略图可跳转到任意一格</p></div><button class="reader-auto" type="button" data-action="autoplay" aria-pressed="false">' + icon("play") + "<span>自动播放</span></button></div>" +
      '<div class="reader-rail" aria-label="十二格分镜导航">' + rail + "</div></section>" +
      '<div class="focus-exit" id="focus-exit" hidden><button class="button button-light" type="button" data-action="focus">退出专注模式 ' + icon("close") + "</button></div>";
  }
  function renderGalleryCard(entry) {
    const saved = isFavorite(entry.storyId, entry.index);
    return '<article class="gallery-card ' + (galleryState.view === "list" ? "is-list" : "") + '"><button class="gallery-image" type="button" data-action="lightbox-open" data-story="' + entry.storyId + '" data-index="' + entry.index + '" aria-label="查看插画：' + esc(entry.scene.title) + '"><img src="' + entry.scene.image + '" alt="' + esc(entry.scene.title) + '" loading="lazy"><span>' + entry.story.shortTitle + " · " + String(entry.index + 1).padStart(2, "0") + '</span></button><div class="gallery-card-copy"><a href="' + storyHref(entry.storyId) + '">' + entry.story.shortTitle + "</a><h2>" + esc(entry.scene.title) + '</h2><p>' + esc(entry.scene.place) + '</p></div><button class="gallery-favorite" type="button" data-action="favorite" data-story="' + entry.storyId + '" data-index="' + entry.index + '" aria-label="' + (saved ? "取消收藏" : "收藏") + "：" + esc(entry.scene.title) + '" aria-pressed="' + saved + '">' + icon("bookmark") + "</button></article>";
  }
  function filteredEntries() {
    const query = galleryState.query.trim().toLocaleLowerCase();
    let items = allEntries().filter(function (entry) {
      if (galleryState.story !== "all" && entry.storyId !== galleryState.story) return false;
      if (galleryState.favorites && !isFavorite(entry.storyId, entry.index)) return false;
      if (!query) return true;
      const scene = entry.scene;
      const haystack = [entry.story.title, scene.title, scene.place, scene.body, scene.line, entry.story.genre].join(" ").toLocaleLowerCase();
      return haystack.indexOf(query) >= 0;
    });
    if (galleryState.sort === "title") items.sort(function (a, b) { return a.scene.title.localeCompare(b.scene.title, "zh-CN"); });
    if (galleryState.sort === "recent") items = items.reverse();
    return items;
  }
  function renderGalleryGrid() {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;
    const items = filteredEntries();
    grid.className = "gallery-grid view-" + galleryState.view;
    grid.innerHTML = items.map(renderGalleryCard).join("");
    const count = document.getElementById("gallery-result-count");
    const empty = document.getElementById("gallery-empty");
    if (count) count.textContent = "显示 " + items.length + " / 36 幅插画";
    if (empty) empty.hidden = items.length > 0;
    document.querySelectorAll("[data-action='gallery-filter']").forEach(function (button) {
      const active = button.dataset.filter === galleryState.story;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const favoriteButton = document.querySelector("[data-action='gallery-favorites']");
    if (favoriteButton) {
      favoriteButton.classList.toggle("is-active", galleryState.favorites);
      favoriteButton.setAttribute("aria-pressed", String(galleryState.favorites));
    }
  }
  function renderGallery() {
    const counts = storyIds.map(function (id) {
      return '<button class="filter-chip ' + (galleryState.story === id ? "is-active" : "") + '" type="button" data-action="gallery-filter" data-filter="' + id + '" aria-pressed="' + (galleryState.story === id) + '">' + stories[id].shortTitle + ' <span>12</span></button>';
    }).join("");
    const query = new URLSearchParams(location.search).get("story");
    if (query && stories[query]) galleryState.story = query;
    return '<section class="gallery-page"><div class="page-heading"><div><p class="section-overline">36幅本地原创插画</p><h1>插画图鉴</h1><p>按故事、场景与关键词查找。点开任意画面可放大、收藏或下载。</p></div><a class="button button-dark" href="studio.html">去编排新分镜 ' + icon("arrow") + "</a></div>" +
      '<div class="gallery-toolbar"><div class="filter-list"><button class="filter-chip ' + (galleryState.story === "all" ? "is-active" : "") + '" type="button" data-action="gallery-filter" data-filter="all" aria-pressed="' + (galleryState.story === "all") + '">全部故事 <span>36</span></button>' + counts + '<button class="filter-chip" type="button" data-action="gallery-favorites" aria-pressed="false">' + icon("bookmark") + " 只看收藏 <span>" + store.favorites.length + "</span></button></div>" +
      '<div class="gallery-tools"><label class="search-field">' + icon("search") + '<input id="gallery-search" type="search" placeholder="搜标题、地点或画面描述" value="' + esc(galleryState.query) + '" autocomplete="off"></label><label class="select-wrap"><span class="visually-hidden">排序</span><select id="gallery-sort"><option value="story">按故事顺序</option><option value="title">按标题</option><option value="recent">倒序浏览</option></select></label><button class="square-button" type="button" data-action="gallery-view" aria-label="切换网格与列表视图">' + (galleryState.view === "grid" ? "列表视图" : "网格视图") + "</button></div></div>" +
      '<div class="gallery-status"><span id="gallery-result-count">显示 36 / 36 幅插画</span><button class="text-link" type="button" data-action="gallery-reset">清除筛选</button></div><div class="gallery-grid view-grid" id="gallery-grid"></div><p class="empty-state" id="gallery-empty" hidden>没有找到匹配的插画。试试更短的关键词，或切换到其他故事。</p></section>';
  }
  const mapLayouts = {
    moon: [{ x: 13, y: 56 }, { x: 37, y: 33 }, { x: 65, y: 64 }, { x: 88, y: 28 }],
    harbor: [{ x: 14, y: 27 }, { x: 39, y: 58 }, { x: 65, y: 34 }, { x: 86, y: 64 }],
    whales: [{ x: 13, y: 63 }, { x: 36, y: 35 }, { x: 63, y: 62 }, { x: 87, y: 29 }]
  };
  function renderAtlas(id) {
    const story = stories[id];
    const points = mapLayouts[id];
    const linePath = "M " + points[0].x + " " + points[0].y + " Q 25 18 " + points[1].x + " " + points[1].y + " T " + points[2].x + " " + points[2].y + " T " + points[3].x + " " + points[3].y;
    const mapStops = story.map.map(function (stop, i) {
      return '<button class="map-pin ' + (i === 0 ? "is-first" : "") + '" style="left:' + points[i].x + "%;top:" + points[i].y + '%" type="button" data-action="atlas-stop" data-story="' + id + '" data-index="' + stop.index + '" aria-label="打开' + esc(stop.name) + '：' + esc(stop.detail) + '"><span class="pin-dot"></span><span class="pin-label"><b>' + esc(stop.name) + '</b><small>' + esc(stop.detail) + "</small></span></button>";
    }).join("");
    const choices = storyIds.map(function (storyId) {
      return '<button class="atlas-choice ' + (id === storyId ? "is-active" : "") + '" type="button" data-action="atlas-story" data-story="' + storyId + '" aria-pressed="' + (id === storyId) + '"><span class="choice-dot choice-' + storyId + '"></span>' + stories[storyId].shortTitle + "</button>";
    }).join("");
    return '<section class="atlas-page"><div class="page-heading"><div><p class="section-overline">互动世界地图</p><h1>沿着故事的路线走。</h1><p>每个标记都是一处关键场景。选一条独立航线，再点地名跳到对应分镜。</p></div><a class="button button-dark" href="' + storyHref(id) + '">阅读这本故事 ' + icon("arrow") + "</a></div>" +
      '<div class="atlas-toolbar"><div class="atlas-choices" role="group" aria-label="选择故事航线">' + choices + "</div><span>" + story.title + "</span></div>" +
      '<div class="atlas-canvas theme-' + id + '"><svg class="route-drawing" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="route-shadow" d="M 0 0"></path><path class="route-line" d="' + linePath + '"></path></svg>' +
      '<div class="atlas-atmosphere">' + (id === "moon" ? '<span class="atlas-orb"></span><span class="atlas-crater crater-one"></span><span class="atlas-crater crater-two"></span>' : id === "harbor" ? '<span class="atlas-rain"></span><span class="atlas-lighthouse"></span><span class="atlas-waterline"></span>' : '<span class="atlas-cloud cloud-one"></span><span class="atlas-cloud cloud-two"></span><span class="atlas-cloud cloud-three"></span>') + "</div>" + mapStops +
      '<div class="atlas-compass"><span>N</span><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 25 18 37 20 25 22 20 37 15 22 3 20 15 18z"/></svg></div><div class="atlas-map-legend"><span>绘制于故事场景</span><b>' + story.setting + "</b><small>点地图上的标记可直接阅读相应分镜</small></div></div>" +
      '<div class="atlas-stop-list">' + story.map.map(function (stop, i) {
        const scene = story.scenes[stop.index];
        return '<button class="atlas-stop-row" type="button" data-action="atlas-stop" data-story="' + id + '" data-index="' + stop.index + '"><img src="' + scene.image + '" alt="" loading="lazy"><span><small>地点 ' + (i + 1) + " · " + esc(scene.place) + '</small><b>' + esc(stop.name) + '</b><span>' + esc(stop.detail) + "</span></span>" + icon("arrow") + "</button>";
      }).join("") + "</div></section>";
  }
  function renderAtlasPage() { return renderAtlas(atlasStory); }
  function renderCharacters() {
    return '<section class="characters-page"><div class="page-heading"><div><p class="section-overline">三本故事 · 三位主角</p><h1>人物档案</h1><p>他们生活在各自独立的世界里。选择人物，查看人物背景与对应插画。</p></div></div><div class="character-grid">' +
      storyIds.map(function (id) {
        const story = stories[id];
        return '<article class="character-profile theme-' + id + '"><a class="character-portrait" href="' + storyHref(id) + '"><img src="' + story.cover + '" alt="' + story.protagonist + '，' + story.protagonistBio + '" loading="lazy"><span>' + story.genre + "</span></a><div class=\"character-copy\"><p class=\"section-overline\">" + story.shortTitle + '</p><h2>' + story.protagonist + '</h2><p>' + story.protagonistBio + '</p><div class="character-side-cast">' + story.cast.slice(1).map(function (person) { return '<div><b>' + esc(person.name) + '</b><span>' + esc(person.role) + '</span><small>' + esc(person.bio) + "</small></div>"; }).join("") + '</div><a class="text-link" href="' + readerHref(id, 0) + '">从人物视角开始阅读 ' + icon("arrow") + "</a></div><div class=\"character-art-strip\">" + [1, 5, 9].map(function (index) { return imageTile(id, index, "character-tile"); }).join("") + "</div></article>";
      }).join("") + "</div></section>";
  }
  function buildPromptFromForm() {
    const form = document.getElementById("studio-form");
    if (!form) return "";
    const storyId = form.elements.story.value;
    const index = Number(form.elements.scene.value);
    const scene = stories[storyId].scenes[index];
    const subject = form.elements.subject.value.trim();
    const palette = form.elements.palette.value;
    const framing = form.elements.framing.value;
    const mood = form.elements.mood.value;
    return ["为原创故事《" + stories[storyId].title + "》绘制第" + (index + 1) + "格分镜。", "场景：" + scene.place + "；" + scene.body, subject ? "补充创作意图：" + subject : "", "画面情绪：" + mood + "。色彩方向：" + palette + "。构图：" + framing + "。", "宽幅16:9电影感绘本插画，保持角色设定与本篇画风一致，画面内不生成文字、签名或水印。"].filter(Boolean).join("\n");
  }
  function renderStudio() {
    const draft = store.draft && stories[store.draft.storyId] ? store.draft : { storyId: "moon", index: 0 };
    const storyOptions = storyIds.map(function (id) { return '<option value="' + id + '" ' + (id === draft.storyId ? "selected" : "") + ">" + stories[id].title + "</option>"; }).join("");
    const sceneOptions = stories[draft.storyId].scenes.map(function (scene, index) { return '<option value="' + index + '" ' + (index === draft.index ? "selected" : "") + ">第" + (index + 1) + "格 · " + esc(scene.title) + "</option>"; }).join("");
    const samples = ["雨停后的港口倒影", "月面邮路的安静远景", "鲸群越过云层山脊"];
    return '<section class="studio-page"><div class="page-heading"><div><p class="section-overline">纯本地分镜编排工具</p><h1>把想法写成画面。</h1><p>选择故事、分镜、色调和构图，整理出可复制到任意图像生成工具的提示词。输入内容只留在你的浏览器。</p></div><button class="button button-dark" type="button" data-action="random-idea">给我一个灵感 ' + icon("arrow") + "</button></div>" +
      '<div class="studio-layout"><form class="studio-form" id="studio-form"><div class="form-title"><span>A</span><div><h2>分镜设定</h2><p>选好故事和画面方向，右侧实时生成提示词。</p></div></div><label>故事<select name="story" id="studio-story">' + storyOptions + "</select></label><label>分镜<select name=\"scene\" id=\"studio-scene\">" + sceneOptions + "</select></label><label>你想额外强调什么<textarea name=\"subject\" rows=\"3\" placeholder=\"例如：突出旧信封的纸张纹理；画面里不要出现现代设备\"></textarea></label>" +
      '<div class="form-pair"><label>画面情绪<select name="mood"><option>宁静而有悬念</option><option>温暖、克制</option><option>辽阔、充满敬畏</option><option>紧张后逐渐释然</option></select></label><label>色彩方向<select name="palette"><option>深蓝与琥珀灯光</option><option>青绿、雨灰与旧金色</option><option>云白与日出暖金</option><option>沿用故事本身的配色</option></select></label></div><label>取景构图<select name="framing"><option>环境全景，人物处于画面一侧</option><option>中景人物与关键道具</option><option>细节特写，浅景深</option><option>俯视视角，突出路线关系</option></select></label><button class="button button-dark button-wide" type="button" data-action="prompt-reset">重置分镜设定</button></form>' +
      '<div class="prompt-board"><div class="form-title"><span>B</span><div><h2>提示词预览</h2><p>文字会根据左侧选项自动更新。</p></div></div><label class="prompt-label" for="prompt-output">可自行修改，也可以直接复制</label><textarea id="prompt-output" rows="13"></textarea><div class="prompt-actions"><button class="button button-light" type="button" data-action="copy-prompt">' + icon("copy") + "复制提示词</button><button class=\"button button-outline-light\" type=\"button\" data-action=\"save-project\">" + icon("bookmark") + "保存到本地草稿</button><button class=\"text-button light-text-button\" type=\"button\" data-action=\"export-prompt\">" + icon("download") + "导出 .txt</button></div><p class=\"studio-honesty\">这个实验室负责分镜策划与提示词整理；实际图像生成由你选择的AIGC工具完成。</p></div></div>" +
      '<section class="prompt-notes"><div><p class="section-overline">可从这些描述开始</p><h2>给画面一个具体动作。</h2><p>提示词先写主体正在做什么，再补充地点、天气、光线和画面距离。具体动作比堆砌风格词更能帮助模型把分镜画清楚。</p></div><div class="idea-list">' + samples.map(function (sample, i) { return '<button type="button" data-action="use-idea" data-idea="' + esc(sample) + '"><span>' + (i + 1) + '</span>' + sample + "</button>"; }).join("") + "</div></section>" +
      '<section class="drafts-panel"><div class="section-heading"><div><p class="section-overline">仅保存在本机</p><h2>最近保存的草稿</h2></div><button class="text-link" type="button" data-action="export-drafts">导出草稿清单 ' + icon("download") + "</button></div><div id=\"studio-drafts\"></div></section></section>";
  }
  function getProjects() {
    try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]"); } catch (error) { return []; }
  }
  function renderDrafts() {
    const target = document.getElementById("studio-drafts");
    if (!target) return;
    const drafts = getProjects();
    if (!drafts.length) {
      target.innerHTML = '<p class="empty-state compact">还没有保存的草稿。完成左侧设置后，点击“保存到本地草稿”。</p>';
      return;
    }
    target.innerHTML = '<div class="saved-draft-list">' + drafts.slice(0, 8).map(function (draft, index) {
      return '<article><span class="draft-index">' + String(index + 1).padStart(2, "0") + '</span><div><b>' + esc(draft.title) + '</b><small>' + esc(draft.storyTitle) + " · " + new Date(draft.created).toLocaleDateString("zh-CN") + '</small></div><button type="button" data-action="delete-draft" data-draft-id="' + esc(draft.id) + '">移除</button><button type="button" data-action="copy-draft" data-draft-id="' + esc(draft.id) + '">复制提示词</button></article>';
    }).join("") + "</div>";
  }
  function renderShelf() {
    const favoriteEntries = allEntries().filter(function (entry) { return isFavorite(entry.storyId, entry.index); });
    const recent = store.recent.filter(function (entry) { return stories[entry.storyId] && stories[entry.storyId].scenes[entry.index]; });
    const favoriteMarkup = favoriteEntries.length ? '<div class="shelf-grid">' + favoriteEntries.map(renderGalleryCard).join("") + "</div>" : '<div class="empty-library"><h2>书架还空着。</h2><p>阅读时收藏的分镜会出现在这里，方便你继续整理和回看。</p><a class="button button-dark" href="gallery.html">去图鉴挑选插画 ' + icon("arrow") + "</a></div>";
    const recentMarkup = recent.length ? '<div class="recent-list">' + recent.map(function (entry) {
      const scene = getScene(entry.storyId, entry.index);
      return '<a class="recent-row" href="' + readerHref(entry.storyId, entry.index) + '"><img src="' + scene.image + '" alt="" loading="lazy"><span><small>' + stories[entry.storyId].shortTitle + " · " + new Date(entry.visited).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) + '</small><b>' + esc(scene.title) + '</b><span>' + esc(scene.place) + "</span></span>" + icon("arrow") + "</a>";
    }).join("") + "</div>" : '<p class="empty-state compact">读过的分镜会显示在这里。</p>';
    return '<section class="shelf-page"><div class="page-heading"><div><p class="section-overline">本机保存 · 无需登录</p><h1>我的故事书架</h1><p>收藏、最近阅读与提示词草稿都只保存在当前设备。</p></div><div class="shelf-actions"><button class="button button-outline-dark" type="button" data-action="clear-history">清空阅读记录</button><button class="button button-outline-dark" type="button" data-action="clear-favorites">清空收藏</button></div></div>' +
      '<div class="shelf-columns"><section><div class="section-heading"><div><p class="section-overline">画面收藏</p><h2>' + favoriteEntries.length + " 幅已收藏</h2></div></div>" + favoriteMarkup + '</section><section><div class="section-heading"><div><p class="section-overline">阅读记录</p><h2>最近看过的分镜</h2></div></div>' + recentMarkup + '</section></div><section class="shelf-projects"><div class="section-heading"><div><p class="section-overline">分镜创作</p><h2>保存的本地草稿</h2></div><a class="text-link" href="studio.html">前往创作实验室 ' + icon("arrow") + "</a></div><div id=\"shelf-drafts\"></div></section></section>";
  }
  function renderAbout() {
    return '<section class="about-page"><div class="page-heading"><div><p class="section-overline">原创内容说明与创作流程</p><h1>故事从人开始，<br>画面经过反复选择。</h1><p>《远雨来信》是一套包含三本独立绘本的AIGC插画与分镜作品。故事与角色为原创，插画由生成式图像工具逐幅生成，再按人物设定和主线顺序人工挑选、校对与编排。</p></div></div>' +
      '<div class="process-ribbon"><article><span>构思</span><h2>先写人物要面对的事</h2><p>分别为月面邮递员、记忆档案师、天空测绘员设计单独冲突和完整结局，不让三条故事依赖同一主线。</p></article><article><span>分镜</span><h2>每一格推动一个变化</h2><p>三本故事各自拆成十二格，明确地点、行动、情绪和下一步，使文字与画面能互相补充。</p></article><article><span>生成</span><h2>固定角色，再做场景</h2><p>为每位主角制作基准设定图，并在每个画面提示词中重复关键特征；逐幅生成插画，按连续性和叙事作用筛选。</p></article><article><span>人工编排</span><h2>把画面放回故事里</h2><p>人工编写文字、调整章节顺序、完善标题与画面说明，并检查图像是否对应情节，而不是只看单张效果。</p></article></div>' +
      '<div class="about-evidence"><div><p class="section-overline">作品清单</p><h2>可在本地打开的完整档案。</h2><ul><li>三本原创独立故事，各有12格主线。</li><li>36幅本地WebP插画，未加载外部图片、字体或脚本。</li><li>13个独立静态页面，含阅读器、图鉴、地图、人物、创作工具与书架。</li><li>收藏、阅读历史和创作草稿保存在浏览器本地。</li><li>创作工具生成提示词，不会伪装成联网图像生成服务。</li></ul></div><div class="credit-note"><h3>人工与AI的分工</h3><p>AI参与插画草图的生成；故事主线、角色资料、分镜文本、插画提示词、选图、页面交互与最终排列由创作者设计和整理。实际参赛提交时，可以把个人使用的模型名称、版本、生成轮次和人工修改记录补充到作品材料中。</p><p>本项目为纯静态网页。没有账号系统、云端存储或服务端推理。</p><a class="button button-dark" href="assets/ART-DIRECTION.md" download>下载插画创作清单 ' + icon("download") + "</a></div></div>" +
      '<div class="about-close"><img src="assets/whales-11-rain-on-the-plateau.webp" alt="" loading="lazy"><div><p class="section-overline">继续探索</p><h2>从哪本开始，都能读到自己的结尾。</h2><a class="button button-light" href="index.html">回到故事首页 ' + icon("arrow") + "</a></div></div></section>";
  }
  function renderPage() {
    const page = document.body.dataset.page;
    const id = document.body.dataset.story;
    let content = "";
    let active = page;
    if (page === "home") content = renderHome();
    else if (page === "story" && stories[id]) content = renderStory(id);
    else if (page === "reader" && stories[id]) { content = renderReader(id); active = "story"; }
    else if (page === "gallery") content = renderGallery();
    else if (page === "atlas") content = renderAtlasPage();
    else if (page === "characters") content = renderCharacters();
    else if (page === "studio") content = renderStudio();
    else if (page === "shelf") content = renderShelf();
    else if (page === "about") content = renderAbout();
    else content = renderHome();
    document.title = page === "story" && stories[id] ? stories[id].title + " · 远雨来信" : page === "reader" && stories[id] ? "正在阅读" + stories[id].shortTitle + " · 远雨来信" : "远雨来信 · " + ({ home: "故事选集", gallery: "插画图鉴", atlas: "世界地图", characters: "人物档案", studio: "分镜创作实验室", shelf: "我的故事书架", about: "创作档案" }[page] || "");
    const classes = page === "home" ? "home-main" : page + "-main";
    document.getElementById("app").innerHTML = shell(active, content, classes);
    if (page === "gallery") renderGalleryGrid();
    if (page === "studio") {
      const output = document.getElementById("prompt-output");
      if (output && !output.value) output.value = buildPromptFromForm();
      renderDrafts();
    }
    if (page === "shelf") renderDraftsTo("shelf-drafts");
    const search = document.getElementById("gallery-search");
    if (search && location.hash === "#search") search.focus();
    if (page === "reader" && safeGet("yuan-yu-reader-autoplay", "") === "1") scheduleAutoplay(id, Number(new URLSearchParams(location.search).get("scene") || 1) - 1);
  }
  function safeGet(key, fallback) {
    try { const value = localStorage.getItem(key); return value == null ? fallback : value; } catch (error) { return fallback; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (error) { return false; }
  }
  function updateHeaderCount() {
    const count = document.getElementById("header-favorite-count");
    if (count) count.textContent = store.favorites.length;
  }
  function renderDraftsTo(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const drafts = getProjects();
    if (!drafts.length) {
      target.innerHTML = '<p class="empty-state compact">这里还没有分镜草稿。去创作实验室编排一组提示词吧。</p>';
      return;
    }
    target.innerHTML = '<div class="saved-draft-list">' + drafts.slice(0, 8).map(function (draft, index) {
      return '<article><span class="draft-index">' + String(index + 1).padStart(2, "0") + '</span><div><b>' + esc(draft.title) + '</b><small>' + esc(draft.storyTitle) + " · " + new Date(draft.created).toLocaleDateString("zh-CN") + '</small></div><button type="button" data-action="delete-draft" data-draft-id="' + esc(draft.id) + '">移除</button><button type="button" data-action="copy-draft" data-draft-id="' + esc(draft.id) + '">复制提示词</button></article>';
    }).join("") + "</div>";
  }
  function navigateScene(storyId, index) {
    if (!stories[storyId]) return;
    if (index < 0) { showToast("已经是这一篇的第一格"); return; }
    if (index > 11) { location.href = storyHref(storyId); return; }
    location.href = readerHref(storyId, index);
  }
  function scheduleAutoplay(storyId, index) {
    window.clearTimeout(slideshowTimer);
    const button = document.querySelector("[data-action='autoplay']");
    if (button) {
      button.setAttribute("aria-pressed", "true");
      button.innerHTML = icon("pause") + "<span>暂停自动播放</span>";
    }
    if (index >= 11) {
      safeSet("yuan-yu-reader-autoplay", "");
      return;
    }
    slideshowTimer = window.setTimeout(function () {
      navigateScene(storyId, index + 1);
    }, 4600);
  }
  function setGalleryView() {
    const action = document.querySelector("[data-action='gallery-view']");
    if (action) action.textContent = galleryState.view === "grid" ? "列表视图" : "网格视图";
    renderGalleryGrid();
  }
  function openLightbox(storyId, index) {
    const sourcePage = document.body.dataset.page;
    lightboxItems = sourcePage === "reader" || sourcePage === "story" ? allEntries().filter(function (entry) { return entry.storyId === storyId; }) : galleryState.story === "all" ? allEntries() : allEntries().filter(function (entry) { return entry.storyId === galleryState.story; });
    if (!lightboxItems.length) lightboxItems = allEntries();
    lightboxIndex = Math.max(0, lightboxItems.findIndex(function (entry) { return entry.storyId === storyId && entry.index === index; }));
    showLightboxItem();
    const dialog = document.getElementById("art-lightbox");
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    else if (dialog) dialog.setAttribute("open", "");
  }
  function showLightboxItem() {
    const entry = lightboxItems[lightboxIndex];
    if (!entry) return;
    const image = document.getElementById("lightbox-image");
    const caption = document.getElementById("lightbox-caption");
    const download = document.getElementById("lightbox-download");
    const favorite = document.querySelector("[data-action='lightbox-favorite']");
    if (image) { image.src = entry.scene.image; image.alt = entry.scene.title + "，" + entry.scene.place; }
    if (caption) caption.textContent = entry.story.title + " · " + (lightboxIndex + 1) + " / " + lightboxItems.length + " · " + entry.scene.title;
    if (download) { download.href = entry.scene.image; download.download = entry.storyId + "-" + String(entry.index + 1).padStart(2, "0") + ".webp"; }
    if (favorite) { favorite.dataset.story = entry.storyId; favorite.dataset.index = entry.index; favorite.setAttribute("aria-pressed", String(isFavorite(entry.storyId, entry.index))); favorite.innerHTML = icon("bookmark") + "<span>" + (isFavorite(entry.storyId, entry.index) ? "取消收藏" : "收藏插画") + "</span>"; }
  }
  function moveLightbox(step) {
    if (!lightboxItems.length) return;
    lightboxIndex = (lightboxIndex + step + lightboxItems.length) % lightboxItems.length;
    showLightboxItem();
  }
  function closeLightbox() {
    const dialog = document.getElementById("art-lightbox");
    if (dialog && typeof dialog.close === "function" && dialog.open) dialog.close();
    else if (dialog) dialog.removeAttribute("open");
  }
  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(function () { showToast("已经复制到剪贴板"); }).catch(function () { fallbackCopy(value); });
    }
    fallbackCopy(value);
  }
  function fallbackCopy(value) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    showToast(copied ? "已经复制到剪贴板" : "复制受浏览器限制，请手动选中并复制");
  }
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function updateStudioSceneOptions() {
    const form = document.getElementById("studio-form");
    if (!form) return;
    const id = form.elements.story.value;
    const sceneSelect = form.elements.scene;
    const oldIndex = Math.min(11, Number(sceneSelect.value || 0));
    sceneSelect.innerHTML = stories[id].scenes.map(function (scene, index) { return '<option value="' + index + '">' + "第" + (index + 1) + "格 · " + esc(scene.title) + "</option>"; }).join("");
    sceneSelect.value = String(oldIndex);
  }
  function updateStudioPrompt() {
    const output = document.getElementById("prompt-output");
    if (output) output.value = buildPromptFromForm();
  }
  function goToSelectedAtlasStory(id) {
    if (!stories[id]) return;
    atlasStory = id;
    renderPage();
  }
  function currentReaderPosition() {
    const id = document.body.dataset.story;
    const index = Math.max(0, Math.min(11, Number(new URLSearchParams(location.search).get("scene") || (store.draft && store.draft.index + 1) || 1) - 1));
    return { storyId: id, index: index };
  }
  function saveStudioDraft() {
    const form = document.getElementById("studio-form");
    const output = document.getElementById("prompt-output");
    if (!form || !output) return;
    const id = form.elements.story.value;
    const index = Number(form.elements.scene.value);
    const projects = getProjects();
    const item = { id: "draft-" + Date.now(), storyId: id, storyTitle: stories[id].title, index: index, title: getScene(id, index).title, prompt: output.value, created: Date.now() };
    safeSet(PROJECTS_KEY, JSON.stringify([item].concat(projects).slice(0, 20)));
    renderDrafts();
    showToast("分镜草稿已保存在本机");
  }
  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "theme") {
      store.theme = store.theme === "night" ? "day" : "night";
      persist(); renderPage();
    } else if (action === "menu") {
      const nav = document.getElementById("site-nav");
      const open = target.getAttribute("aria-expanded") !== "true";
      target.setAttribute("aria-expanded", String(open));
      target.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
      document.body.classList.toggle("menu-open", open);
      if (nav) nav.classList.toggle("is-open", open);
    } else if (action === "read-scene") {
      navigateScene(target.dataset.story, Number(target.dataset.index));
    } else if (action === "previous" || action === "next") {
      const position = currentReaderPosition();
      if (action === "previous") navigateScene(position.storyId, position.index - 1);
      else navigateScene(position.storyId, position.index + 1);
    } else if (action === "favorite") {
      toggleFavorite(target.dataset.story, Number(target.dataset.index));
      renderPage(); updateHeaderCount(); showToast(isFavorite(target.dataset.story, Number(target.dataset.index)) ? "已加入收藏" : "已从收藏移除");
    } else if (action === "lightbox-open") {
      openLightbox(target.dataset.story, Number(target.dataset.index));
    } else if (action === "lightbox-close") closeLightbox();
    else if (action === "lightbox-prev") moveLightbox(-1);
    else if (action === "lightbox-next") moveLightbox(1);
    else if (action === "lightbox-favorite") {
      const entry = lightboxItems[lightboxIndex];
      if (entry) { toggleFavorite(entry.storyId, entry.index); showLightboxItem(); updateHeaderCount(); if (document.body.dataset.page === "gallery") renderGalleryGrid(); showToast(isFavorite(entry.storyId, entry.index) ? "已加入收藏" : "已从收藏移除"); }
    } else if (action === "lightbox-full") {
      const dialog = document.getElementById("art-lightbox");
      if (dialog && dialog.requestFullscreen) dialog.requestFullscreen().catch(function () {});
    } else if (action === "gallery-filter") {
      galleryState.story = target.dataset.filter; galleryState.favorites = false; renderGalleryGrid();
    } else if (action === "gallery-favorites") {
      galleryState.favorites = !galleryState.favorites; renderGalleryGrid();
    } else if (action === "gallery-view") {
      galleryState.view = galleryState.view === "grid" ? "list" : "grid"; setGalleryView();
    } else if (action === "gallery-reset") {
      galleryState = { query: "", story: "all", favorites: false, view: "grid", sort: "story" }; renderPage();
    } else if (action === "atlas-story") goToSelectedAtlasStory(target.dataset.story);
    else if (action === "atlas-stop") navigateScene(target.dataset.story, Number(target.dataset.index));
    else if (action === "speak") {
      if (!("speechSynthesis" in window)) showToast("当前浏览器没有提供语音朗读");
      else {
        if (speechSynthesis.speaking) speechSynthesis.cancel();
        else { const p = document.querySelector(".reader-story-text"); const heading = document.querySelector(".reader-copy h2"); const utterance = new SpeechSynthesisUtterance((heading ? heading.textContent + "。 " : "") + (p ? p.textContent : "")); utterance.lang = "zh-CN"; speechSynthesis.speak(utterance); }
      }
    } else if (action === "autoplay") {
      if (safeGet("yuan-yu-reader-autoplay", "") === "1") { safeSet("yuan-yu-reader-autoplay", ""); window.clearTimeout(slideshowTimer); target.setAttribute("aria-pressed", "false"); target.innerHTML = icon("play") + "<span>自动播放</span>"; }
      else { safeSet("yuan-yu-reader-autoplay", "1"); scheduleAutoplay(currentReaderPosition().storyId, currentReaderPosition().index); }
    } else if (action === "focus") {
      document.body.classList.toggle("is-focused");
      const exit = document.getElementById("focus-exit");
      if (exit) exit.hidden = !document.body.classList.contains("is-focused");
      if (document.body.classList.contains("is-focused")) window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "font-down" || action === "font-up") {
      const text = document.querySelector(".reader-story-text");
      if (text) { const current = Number(safeGet("yuan-yu-text-size", "18")); const next = Math.max(16, Math.min(24, current + (action === "font-up" ? 2 : -2))); safeSet("yuan-yu-text-size", String(next)); text.style.fontSize = next + "px"; }
    } else if (action === "share-scene") {
      const url = location.href.split("?")[0] + "?scene=" + (Number(target.dataset.index) + 1);
      copyText(url);
    } else if (action === "random-idea") {
      const form = document.getElementById("studio-form");
      const ideas = { moon: ["描绘一封信如何穿过月面静海", "让旧邮局的暖灯成为画面焦点", "表现中继天线接通前的寂静"], harbor: ["描绘雨声停下的那一秒", "让底片中的童年街道显出纵深", "突出修复桌上的铜铃与磁带"], whales: ["描绘幼鲸第一次听见同伴回应", "让风道的变化清晰可见", "表现云鲸越过高原时的辽阔感"] };
      if (form) { form.elements.subject.value = ideas[form.elements.story.value][Math.floor(Math.random() * 3)]; updateStudioPrompt(); }
    } else if (action === "use-idea") {
      const field = document.querySelector("#studio-form [name='subject']");
      if (field) { field.value = target.dataset.idea; updateStudioPrompt(); }
    } else if (action === "prompt-reset") {
      const form = document.getElementById("studio-form");
      if (form) { form.reset(); updateStudioSceneOptions(); updateStudioPrompt(); }
    } else if (action === "copy-prompt") {
      const output = document.getElementById("prompt-output"); if (output) copyText(output.value);
    } else if (action === "save-project") saveStudioDraft();
    else if (action === "export-prompt") {
      const output = document.getElementById("prompt-output"); if (output) downloadFile("storyboard-prompt.txt", output.value, "text/plain;charset=utf-8");
    } else if (action === "export-drafts") downloadFile("storyboard-drafts.json", JSON.stringify(getProjects(), null, 2), "application/json;charset=utf-8");
    else if (action === "delete-draft") {
      safeSet(PROJECTS_KEY, JSON.stringify(getProjects().filter(function (item) { return item.id !== target.dataset.draftId; })));
      renderDrafts(); renderDraftsTo("shelf-drafts"); showToast("草稿已移除");
    } else if (action === "copy-draft") {
      const draft = getProjects().find(function (item) { return item.id === target.dataset.draftId; }); if (draft) copyText(draft.prompt);
    } else if (action === "clear-history") {
      if (store.recent.length && window.confirm("清空这台设备上的阅读记录？")) { store.recent = []; store.draft = null; persist(); renderPage(); }
    } else if (action === "clear-favorites") {
      if (store.favorites.length && window.confirm("移除所有已收藏的分镜？")) { store.favorites = []; persist(); renderPage(); }
    }
  }
  function handleInput(event) {
    const target = event.target;
    if (target.id === "gallery-search") { galleryState.query = target.value; renderGalleryGrid(); }
    if (target.id === "studio-story") { updateStudioSceneOptions(); updateStudioPrompt(); }
    if (target.closest && target.closest("#studio-form") && target.id !== "studio-story") updateStudioPrompt();
    if (target.id === "gallery-sort") { galleryState.sort = target.value; renderGalleryGrid(); }
  }
  function handleKeydown(event) {
    if (event.key === "Escape" && document.body.classList.contains("is-focused")) {
      document.body.classList.remove("is-focused"); const exit = document.getElementById("focus-exit"); if (exit) exit.hidden = true;
    }
    const page = document.body.dataset.page;
    if (page === "reader" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest("input,textarea,select,button,a")) {
      const position = currentReaderPosition();
      if (event.key === "ArrowRight") navigateScene(position.storyId, position.index + 1);
      if (event.key === "ArrowLeft") navigateScene(position.storyId, position.index - 1);
      if (event.key.toLowerCase() === "f") { document.body.classList.toggle("is-focused"); const exit = document.getElementById("focus-exit"); if (exit) exit.hidden = !document.body.classList.contains("is-focused"); }
    }
    if (document.getElementById("art-lightbox") && document.getElementById("art-lightbox").open) {
      if (event.key === "ArrowRight") moveLightbox(1);
      if (event.key === "ArrowLeft") moveLightbox(-1);
    }
  }
  function init() {
    document.documentElement.dataset.theme = store.theme;
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleInput);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("click", function (event) {
      const dialog = event.target.closest("dialog.lightbox");
      if (dialog && event.target === dialog) closeLightbox();
    });
    window.addEventListener("beforeunload", function () { if ("speechSynthesis" in window) speechSynthesis.cancel(); });
    renderPage();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
