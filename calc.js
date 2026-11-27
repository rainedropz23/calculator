(function () {
  var display = document.getElementById("display");
  var state = { expr: "", error: false, done: false };
  var MAX_LEN = 24;
  var OPS = /[+−×\/]$/;

  function fmt(n) {
    n = parseFloat(n.toPrecision(12));
    if (Object.is(n, -0)) n = 0;
    var s = String(n);
    if (/e/i.test(s)) s = n.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
    return s.replace("-", "−");
  }

  function evaluate(s) {
    var t = [], i = 0, p = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[\d.]/.test(c)) {
        var j = i;
        while (j < s.length && /[\d.]/.test(s[j])) j++;
        var n = s.slice(i, j);
        if (!/^(\d+\.?\d*|\.\d+)$/.test(n)) throw new Error("syntax");
        t.push(parseFloat(n));
        i = j;
      } else if ("+−×/".indexOf(c) !== -1) {
        t.push(c); i++;
      } else throw new Error("syntax");
    }
    function parseU() {
      if (t[p] === "−") { p++; return -parseU(); }
      var x = t[p++];
      if (typeof x !== "number") throw new Error("syntax");
      return x;
    }
    function parseT() {
      var v = parseU();
      while (t[p] === "×" || t[p] === "/") {
        var o = t[p++], r = parseU();
        if (o === "/") { if (r === 0) throw new Error("div0"); v = v / r; }
        else v = v * r;
      }
      return v;
    }
    function parseE() {
      var v = parseT();
      while (t[p] === "+" || t[p] === "−") {
        var o = t[p++], r = parseT();
        v = o === "+" ? v + r : v - r;
      }
      return v;
    }
    var result = parseE();
    if (p !== t.length || !isFinite(result)) throw new Error("syntax");
    return result;
  }

  function render() {
    var text = state.error ? "Syntax Error" : (state.expr || "0");
    var span = document.createElement("span");
    span.textContent = text;
    display.textContent = "";
    display.appendChild(span);
    display.className = "display" + (state.error ? " err" : "");
    var size = state.error ? 26 : 40;
    var avail = display.clientWidth - 36;
    display.style.fontSize = size + "px";
    while (span.offsetWidth > avail && size > 10) {
      size--;
      display.style.fontSize = size + "px";
    }
  }

  function reset() { state.expr = ""; state.error = false; state.done = false; }

  function digit(d) {
    if (state.error) reset();
    if (state.done) { state.expr = ""; state.done = false; }
    var tr = state.expr.match(/[\d.]*$/)[0];
    if (tr === "0") {
      if (d === "0") return;
      state.expr = state.expr.slice(0, -1) + d;
    } else {
      if (state.expr.length >= MAX_LEN) return;
      state.expr += d;
    }
  }

  function dot() {
    if (state.error) reset();
    if (state.done) { state.expr = ""; state.done = false; }
    var tr = state.expr.match(/[\d.]*$/)[0];
    if (tr.indexOf(".") !== -1 || state.expr.length >= MAX_LEN - 1) return;
    state.expr += tr === "" ? "0." : ".";
  }

  function operator(o) {
    if (state.error) return;
    state.done = false;
    if (state.expr === "") { if (o === "−") state.expr = "−"; return; }
    while (OPS.test(state.expr)) state.expr = state.expr.slice(0, -1);
    if (state.expr === "") return;
    if (state.expr.length >= MAX_LEN) return;
    state.expr += o;
  }

  function sign() {
    if (state.error) reset();
    state.done = false;
    var s = state.expr;
    var idx = s.length - s.match(/[\d.]*$/)[0].length;
    var prev = s[idx - 1];
    if (prev === undefined) s = "−" + s;
    else if (prev === "+") s = s.slice(0, idx - 1) + "−" + s.slice(idx);
    else if (prev === "−") {
      var unary = idx - 1 === 0 || "×/".indexOf(s[idx - 2]) !== -1;
      s = unary ? s.slice(0, idx - 1) + s.slice(idx)
                : s.slice(0, idx - 1) + "+" + s.slice(idx);
    } else s = s.slice(0, idx) + "−" + s.slice(idx);
    if (s.length <= MAX_LEN) state.expr = s;
  }

  function back() {
    if (state.error) { reset(); return; }
    state.done = false;
    state.expr = state.expr.slice(0, -1);
  }

  function equals() {
    if (state.error || state.expr === "") return;
    try {
      state.expr = fmt(evaluate(state.expr));
      state.done = true;
    } catch (e) {
      state.expr = ""; state.error = true; state.done = false;
    }
  }

  function act(a, v) {
    if (a === "num") digit(v);
    else if (a === "dot") dot();
    else if (a === "op") operator(v);
    else if (a === "sign") sign();
    else if (a === "back") back();
    else if (a === "clear") reset();
    else if (a === "eq") equals();
    render();
  }

  document.getElementById("keys").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) act(b.dataset.a, b.dataset.v);
  });

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (/^\d$/.test(k)) act("num", k);
    else if (k === ".") act("dot");
    else if (k === "+") act("op", "+");
    else if (k === "-") act("op", "−");
    else if (k === "*" || k === "x" || k === "X") act("op", "×");
    else if (k === "/") { e.preventDefault(); act("op", "/"); }
    else if (k === "Enter" || k === "=") { e.preventDefault(); act("eq"); }
    else if (k === "Backspace") act("back");
    else if (k === "Escape" || k === "Delete") act("clear");
  });

  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();