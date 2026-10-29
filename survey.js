(function () {
  var form = document.getElementById("survey-form");
  var submitBtn = document.getElementById("submit-btn");
  var statusEl = document.getElementById("status");
  var warningEl = document.getElementById("pii-warning");
  var doneEl = document.getElementById("done");
  var messageEl = document.getElementById("message");
  var openedAt = Date.now();

  if (!form) return;

  var config = window.SURVEY_CONFIG || {};
  var endpoint = (config.appsScriptUrl || "").trim();
  var isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.protocol === "file:";

  if (!endpoint && !isLocal) {
    showStatus("这份问卷还没接上收集箱，暂时不能提交。", "err");
    submitBtn.disabled = true;
  }

  if (!endpoint && isLocal) {
    showStatus("本地预览：提交只会留在这台电脑，不会寄到任何地方。", "ok");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    warningEl.classList.add("hidden");
    statusEl.classList.add("hidden");

    if (form.website.value) {
      succeed();
      return;
    }

    if (Date.now() - openedAt < 1600) {
      showStatus("请再看一眼再提交。", "err");
      return;
    }

    var category = readRadio("category");
    var impact = readRadio("impact");
    var message = (messageEl.value || "").replace(/^\s+|\s+$/g, "");

    if (!category) {
      showStatus("请先选一个类型。", "err");
      return;
    }
    if (message.length < 10) {
      showStatus("请至少写 10 个字，不然别人很难看懂。", "err");
      return;
    }
    if (message.length > 4000) {
      showStatus("请控制在 4000 字以内。", "err");
      return;
    }

    var hints = findPiiHints(message);
    if (hints.length && form.dataset.piiOk !== "1") {
      warningEl.textContent =
        "这段话里可能有能认出你的信息（" +
        hints.join("、") +
        "）。匿名意见箱不会署名，但正文里的名字、工号、邮箱会让人看出来。确认仍要提交的话，再按一次。";
      warningEl.classList.remove("hidden");
      form.dataset.piiOk = "1";
      return;
    }

    var payload = {
      token: config.submitToken || "",
      category: category,
      impact: impact || "",
      message: message,
      website: "",
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "投入中…";

    send(payload)
      .then(succeed)
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "匿名投入";
        showStatus("这次没投进去，请稍后再试。", "err");
      });
  });

  messageEl.addEventListener("input", function () {
    form.dataset.piiOk = "";
  });

  function send(payload) {
    if (!endpoint) {
      return saveLocal(payload);
    }

    var body = new URLSearchParams(payload);
    return fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      body: body,
      referrerPolicy: "no-referrer",
    }).then(function () {
      return undefined;
    });
  }

  function saveLocal(payload) {
    var key = "anonymous-survey-local";
    var rows = [];
    try {
      rows = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (err) {
      rows = [];
    }
    rows.push({
      id: String(Date.now()) + "-" + Math.random().toString(16).slice(2),
      day: new Date().toISOString().slice(0, 10),
      category: payload.category,
      impact: payload.impact,
      message: payload.message,
    });
    localStorage.setItem(key, JSON.stringify(rows));
    return Promise.resolve();
  }

  function succeed() {
    form.classList.add("hidden");
    warningEl.classList.add("hidden");
    statusEl.classList.add("hidden");
    doneEl.classList.remove("hidden");
  }

  function showStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "status " + kind;
    statusEl.classList.remove("hidden");
  }

  function readRadio(name) {
    var node = form.querySelector('input[name="' + name + '"]:checked');
    return node ? node.value : "";
  }

  function findPiiHints(text) {
    var hints = [];
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) hints.push("邮箱");
    if (/1[3-9]\d{9}/.test(text) || /(?:\+?52)\s*\d{10}/.test(text)) {
      hints.push("电话");
    }
    if (/工号|员工号|employee\s*id/i.test(text)) hints.push("工号");
    if (/我是\s*[\u4e00-\u9fa5]{2,4}|我叫\s*[\u4e00-\u9fa5]{2,4}/.test(text)) {
      hints.push("姓名");
    }
    if (/微信号|whats?app|telegram/i.test(text)) hints.push("联系方式");
    return hints;
  }
})();
