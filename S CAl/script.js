const bootMessages = [

"Initializing HK TECH OS...",
"Loading Scientific Engine...",
"Checking Memory Modules...",
"Starting AI Core...",
"Loading Calculator Interface...",
"Finalizing System..."

];
     
     
     
     (function () {
        "use strict";

        /* ────────────────────────────────────────────────
   STATE
   ────────────────────────────────────────────────
   We implement a proper stack-based calculator
   (no eval, no string tricks).

   Core flow for binary ops:
     1. User types number → goes into `entry` string
     2. User presses op (+,-,*,/) → snapshot entry
        into `lhs`, store op, set waitRight=true
     3. User types next number
     4. User presses = or another op → compute lhs OP rhs,
        display result, become new lhs if chaining

   Parentheses: each "(" pushes {lhs, op} onto parenStack,
   resets lhs/op. ")" pops and folds the result back.

   Scientific fns: applied immediately to entry/display.
──────────────────────────────────────────────── */

        const dispEl = document.getElementById("mdisp");
        const exprEl = document.getElementById("eline");
        const mchipEl = document.getElementById("mchip");
        const achipEl = document.getElementById("achip");
        const shiftEl = document.getElementById("shiftBtn");

        let entry = "0"; // current number being typed (string)
        let lhs = null; // left-hand operand (number)
        let pendingOp = null; // pending operator id string
        let waitRight = false; // true = next digit starts fresh right-side number
        let afterEq = false; // true = just evaluated with =
        let memory = 0;
        let lastAns = 0;
        let angleMode = "DEG";
        let shiftOn = false;
        let parenStack = []; // [{lhs, pendingOp}]
        let exprStr = ""; // expression line text

        /* ── format a number for display ── */
        function fmt(n) {
          if (typeof n !== "number" || isNaN(n)) return "Error";
          if (!isFinite(n)) return n > 0 ? "∞" : "-∞";
          let abs = Math.abs(n);
          // use exponential for very large or very small
          if (abs !== 0 && (abs >= 1e14 || abs < 1e-9))
            return parseFloat(n.toPrecision(10)).toExponential();
          // strip floating point noise
          return parseFloat(n.toPrecision(12)).toString();
        }

        /* ── show main display ── */
        function setDisp(val, isErr) {
          let s = typeof val === "number" ? fmt(val) : String(val);
          entry = s;
          dispEl.textContent = s;
          dispEl.classList.toggle("err", !!isErr);
          if (isErr) setTimeout(() => dispEl.classList.remove("err"), 600);
        }

        /* ── show expression line ── */
        function setExpr(s) {
          exprEl.textContent = exprStr = s || "";
        }

        /* ── current numeric value of entry ── */
        function numEntry() {
          let n = parseFloat(entry);
          return isNaN(n) ? 0 : n;
        }

        /* ── apply binary op ── */
        const OPS = {
          add: (a, b) => a + b,
          sub: (a, b) => a - b,
          mul: (a, b) => a * b,
          div: (a, b) => (b === 0 ? null : a / b),
          mod: (a, b) => (b === 0 ? null : a % b),
          pow: (a, b) => Math.pow(a, b),
          yroot: (a, b) => {
            // "a ʸ√x b" means: b-th root of a
            // Usage: enter the number first, press ʸ√x, enter root degree, press =
            // so a=original number, b=root degree → a^(1/b)
            if (b === 0) return null;
            return Math.pow(a, 1 / b);
          },
        };
        const OPSYM = {
          add: "+",
          sub: "−",
          mul: "×",
          div: "÷",
          mod: "mod",
          pow: "^",
          yroot: "ʸ√",
        };

        function applyOp(a, op, b) {
          if (!OPS[op]) return b;
          return OPS[op](a, b);
        }

        /* ── error ── */
        function showErr(msg) {
          setDisp(msg || "Error", true);
          lhs = null;
          pendingOp = null;
          waitRight = false;
          afterEq = false;
          parenStack = [];
          setExpr("");
        }

        /* ═══════════════════════════════════════════════
   DIGIT / DOT PRESS
═══════════════════════════════════════════════ */
        function pressDigit(ch) {
          if (waitRight || afterEq) {
            // start fresh right-side number
            entry = ch === "." ? "0." : ch;
            waitRight = false;
            afterEq = false;
          } else {
            if (ch === "." && entry.includes(".")) return; // no double dot
            if (entry === "0" && ch !== ".")
              entry = ch; // replace leading zero
            else if (entry === "-0" && ch !== ".") entry = "-" + ch;
            else entry += ch;
          }
          dispEl.textContent = entry;
          dispEl.classList.remove("err");
        }

        /* ═══════════════════════════════════════════════
   OPERATOR PRESS  (+  −  ×  ÷  mod  ^  ʸ√x)
═══════════════════════════════════════════════ */
        function pressOp(op) {
          let rhs = numEntry();

          if (pendingOp !== null && !waitRight) {
            // we have lhs OP and now another OP pressed → evaluate first
            let result = applyOp(lhs, pendingOp, rhs);
            if (result === null) {
              showErr("÷ by 0");
              return;
            }
            lhs = result;
            setDisp(result);
            setExpr(fmt(result) + " " + OPSYM[op]);
          } else if (pendingOp !== null && waitRight) {
            // operator changed before typing right side → just replace operator, keep lhs
            pendingOp = op;
            setExpr(fmt(lhs) + " " + OPSYM[op]);
            return; // don't change waitRight
          } else {
            // no pending op yet
            lhs = rhs;
            setExpr(fmt(rhs) + " " + OPSYM[op]);
          }

          pendingOp = op;
          waitRight = true;
          afterEq = false;
        }

        /* ═══════════════════════════════════════════════
   EQUALS
═══════════════════════════════════════════════ */
        function pressEq() {
          let rhs = numEntry();

          if (pendingOp === null && parenStack.length === 0) {
            // nothing to compute — just record ans
            lastAns = rhs;
            setExpr(fmt(rhs) + " =");
            afterEq = true;
            return;
          }

          if (pendingOp !== null) {
            let fullExpr = exprStr + " " + fmt(rhs);
            let result = applyOp(lhs, pendingOp, rhs);
            if (result === null) {
              showErr("÷ by 0");
              return;
            }

            // fold any unclosed parens
            while (parenStack.length > 0) {
              let f = parenStack.pop();
              if (f.pendingOp !== null && f.lhs !== null) {
                result = applyOp(f.lhs, f.pendingOp, result);
                if (result === null) {
                  showErr("÷ by 0");
                  return;
                }
              }
            }

            setExpr(fullExpr.trim() + " =");
            setDisp(result);
            lastAns = result;
            lhs = null;
            pendingOp = null;
            waitRight = false;
            afterEq = true;
          } else {
            // parens open but no pending op
            setExpr(fmt(rhs) + " =");
            lastAns = rhs;
            afterEq = true;
            parenStack = [];
          }
        }

        /* ═══════════════════════════════════════════════
   OPEN PAREN  (
═══════════════════════════════════════════════ */
        function pressOparen() {
          // save current computation context
          parenStack.push({ lhs: lhs, pendingOp: pendingOp });
          lhs = null;
          pendingOp = null;
          waitRight = true; // next number starts fresh inside the paren
          afterEq = false;
          entry = "0";
          dispEl.textContent = "0";
          // append '(' to expression
          let prev = exprStr.trim();
          setExpr((prev ? prev + " " : "") + "(");
        }

        /* ═══════════════════════════════════════════════
   CLOSE PAREN  )
═══════════════════════════════════════════════ */
        function pressCparen() {
          if (parenStack.length === 0) return;

          let inner = numEntry();

          // evaluate any pending op inside the parens
          if (pendingOp !== null) {
            let result = applyOp(lhs, pendingOp, inner);
            if (result === null) {
              showErr("÷ by 0");
              return;
            }
            inner = result;
          }

          // restore outer context
          let frame = parenStack.pop();
          lhs = frame.lhs;
          pendingOp = frame.pendingOp;
          waitRight = false;
          afterEq = false;
          entry = fmt(inner);
          setDisp(inner);
          setExpr(exprStr.replace(/\(\s*$/, "( ") + fmt(inner) + " )");
        }

        /* ═══════════════════════════════════════════════
   SCIENTIFIC FUNCTIONS (immediate, on current value)
═══════════════════════════════════════════════ */
        function toRad(v) {
          if (angleMode === "RAD") return v;
          if (angleMode === "GRAD") return (v * Math.PI) / 200;
          return (v * Math.PI) / 180;
        }
        function fromRad(v) {
          if (angleMode === "RAD") return v;
          if (angleMode === "GRAD") return (v * 200) / Math.PI;
          return (v * 180) / Math.PI;
        }
        function factorial(n) {
          n = Math.round(n);
          if (n < 0) return NaN;
          if (n > 170) return Infinity;
          let r = 1;
          for (let i = 2; i <= n; i++) r *= i;
          return r;
        }

        function sciFunc(fn) {
          let v = numEntry();
          let r;
          switch (fn) {
            case "sin":
              r = Math.sin(toRad(v));
              break;
            case "cos":
              r = Math.cos(toRad(v));
              break;
            case "tan": {
              // tan is undefined at 90°, 270°, etc.
              let raw = Math.tan(toRad(v));
              r = Math.abs(raw) > 1e13 ? NaN : raw;
              break;
            }
            case "asin":
              r = v < -1 || v > 1 ? NaN : fromRad(Math.asin(v));
              break;
            case "acos":
              r = v < -1 || v > 1 ? NaN : fromRad(Math.acos(v));
              break;
            case "atan":
              r = fromRad(Math.atan(v));
              break;
            case "log":
              r = v <= 0 ? NaN : Math.log10(v);
              break;
            case "ln":
              r = v <= 0 ? NaN : Math.log(v);
              break;
            case "exp10":
              r = Math.pow(10, v);
              break;
            case "exp":
              r = Math.exp(v);
              break;
            case "sqrt":
              r = v < 0 ? NaN : Math.sqrt(v);
              break;
            case "cbrt":
              r = Math.cbrt(v);
              break;
            case "sq":
              r = v * v;
              break;
            case "cube":
              r = v * v * v;
              break;
            case "inv":
              r = v === 0 ? NaN : 1 / v;
              break;
            case "abs":
              r = Math.abs(v);
              break;
            case "fact":
              r = factorial(v);
              break;
            default:
              r = v;
          }
          if (!isFinite(r) || isNaN(r)) {
            showErr("Math Error");
            return;
          }
          setDisp(r);
          lastAns = r;
          waitRight = false;
          afterEq = true; // treat result as a value; next digit starts fresh
        }

        /* ═══════════════════════════════════════════════
   NEGATE  (+/−)
═══════════════════════════════════════════════ */
        function pressNeg() {
          if (entry === "0" || entry === "Error" || entry === "Math Error")
            return;
          if (waitRight) {
            // we just pressed an operator; negate starts a fresh "-0" right side
            entry = "-0";
            waitRight = false;
            dispEl.textContent = entry;
            return;
          }
          // toggle minus on current entry
          if (entry.startsWith("-")) entry = entry.slice(1);
          else entry = "-" + entry;
          dispEl.textContent = entry;
        }

        /* ═══════════════════════════════════════════════
   PERCENT  (%)
   Converts current entry to % of lhs if an op is pending,
   otherwise divides by 100.
═══════════════════════════════════════════════ */
        function pressPct() {
          let n = numEntry();
          let res =
            lhs !== null && pendingOp !== null ? (lhs * n) / 100 : n / 100;
          setDisp(res);
          waitRight = false;
          afterEq = true;
        }

        /* ═══════════════════════════════════════════════
   EE  (scientific notation entry)
   Appends 'e+' so user can type the exponent.
═══════════════════════════════════════════════ */
        function pressEE() {
          if (waitRight || afterEq) {
            entry = "1";
            waitRight = false;
            afterEq = false;
          }
          if (entry.includes("e")) return; // already has exponent
          entry += "e+";
          dispEl.textContent = entry;
          // the next digit typed will replace the trailing '+', handled by pressDigit
        }

        /* ═══════════════════════════════════════════════
   SHIFT LABELS
═══════════════════════════════════════════════ */
        const SHIFT_LABELS = {
          bsin: ["sin", "sin⁻¹"],
          bcos: ["cos", "cos⁻¹"],
          btan: ["tan", "tan⁻¹"],
          blog: ["log", "10ˣ"],
          bln: ["ln", "eˣ"],
          bsqrt: ["√", "x²"],
          bsq: ["x²", "√"],
          bpow: ["xʸ", "xʸ"],
          binv: ["1/x", "n!"],
        };
        const SHIFT_REMAP = {
          sin: "asin",
          cos: "acos",
          tan: "atan",
          log: "exp10",
          ln: "exp",
          sqrt: "sq",
          sq: "sqrt",
          inv: "fact",
        };
        function applyShiftUI() {
          for (let [id, [n, a]] of Object.entries(SHIFT_LABELS)) {
            let el = document.getElementById(id);
            if (el) el.textContent = shiftOn ? a : n;
          }
          shiftEl.classList.toggle("on", shiftOn);
        }

        /* ═══════════════════════════════════════════════
   MASTER HANDLER
═══════════════════════════════════════════════ */
        function handle(a) {
          // apply 2nd shift rewrite before anything
          if (shiftOn && SHIFT_REMAP[a]) {
            a = SHIFT_REMAP[a];
            shiftOn = false;
            applyShiftUI();
          }

          // digits
          if (/^[0-9]$/.test(a)) {
            pressDigit(a);
            return;
          }
          if (a === "dot") {
            pressDigit(".");
            return;
          }

          // binary operators
          if (["add", "sub", "mul", "div", "mod", "pow"].includes(a)) {
            pressOp(a);
            return;
          }

          // ʸ√x — treated as a binary operator:
          // enter number, press ʸ√x, enter root degree, press =
          // e.g. enter 8, press ʸ√x, enter 3, press = → cube root of 8 = 2
          if (a === "yroot") {
            pressOp("yroot");
            return;
          }

          // equals
          if (a === "eq") {
            pressEq();
            return;
          }

          // parens
          if (a === "oparen") {
            pressOparen();
            return;
          }
          if (a === "cparen") {
            pressCparen();
            return;
          }

          // clear
          if (a === "clear") {
            entry = "0";
            lhs = null;
            pendingOp = null;
            waitRight = false;
            afterEq = false;
            parenStack = [];
            setExpr("");
            setDisp(0);
            return;
          }

          // CE — clear only current entry, keep pending op & lhs
          if (a === "ce") {
            entry = "0";
            waitRight = false;
            afterEq = false;
            dispEl.textContent = "0";
            dispEl.classList.remove("err");
            return;
          }

          // backspace
          if (a === "back") {
            if (waitRight || afterEq) {
              // already at a "ready for next input" state — just clear entry
              entry = "0";
              waitRight = false;
              afterEq = false;
              dispEl.textContent = "0";
              return;
            }
            if (entry.length > 1) entry = entry.slice(0, -1);
            else entry = "0";
            dispEl.textContent = entry;
            return;
          }

          // negate
          if (a === "neg") {
            pressNeg();
            return;
          }

          // percent
          if (a === "pct") {
            pressPct();
            return;
          }

          // EE
          if (a === "ee") {
            pressEE();
            return;
          }

          // constants — set entry, mark as "result-like" so next op picks them up
          if (a === "pi") {
            entry = fmt(Math.PI);
            dispEl.textContent = entry;
            waitRight = false;
            afterEq = true;
            return;
          }
          if (a === "econ") {
            entry = fmt(Math.E);
            dispEl.textContent = entry;
            waitRight = false;
            afterEq = true;
            return;
          }
          if (a === "rand") {
            let r = Math.random();
            entry = fmt(r);
            dispEl.textContent = entry;
            waitRight = false;
            afterEq = true;
            return;
          }
          if (a === "ans") {
            entry = fmt(lastAns);
            dispEl.textContent = entry;
            waitRight = false;
            afterEq = true;
            return;
          }

          // scientific functions
          const SCI = [
            "sin",
            "cos",
            "tan",
            "asin",
            "acos",
            "atan",
            "log",
            "ln",
            "exp10",
            "exp",
            "sqrt",
            "cbrt",
            "sq",
            "cube",
            "inv",
            "abs",
            "fact",
          ];
          if (SCI.includes(a)) {
            sciFunc(a);
            return;
          }

          // memory
          if (a === "mc") {
            memory = 0;
            mchipEl.classList.remove("on");
            return;
          }
          if (a === "mr") {
            entry = fmt(memory);
            dispEl.textContent = entry;
            waitRight = false;
            afterEq = true;
            return;
          }
          if (a === "ms") {
            memory = numEntry();
            mchipEl.classList.add("on");
            return;
          }
          if (a === "mplus") {
            memory += numEntry();
            mchipEl.classList.add("on");
            return;
          }
          if (a === "mminus") {
            memory -= numEntry();
            mchipEl.classList.add("on");
            return;
          }

          // shift toggle
          if (a === "shift") {
            shiftOn = !shiftOn;
            applyShiftUI();
            return;
          }
        }

        /* ── ripple ── */
        function ripple(btn, e) {
          let rc = btn.getBoundingClientRect(),
            sz = Math.max(rc.width, rc.height);
          let sp = document.createElement("span");
          sp.className = "rip";
          sp.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX - rc.left - sz / 2}px;top:${e.clientY - rc.top - sz / 2}px`;
          btn.appendChild(sp);
          sp.addEventListener("animationend", () => sp.remove());
        }

        /* ── bind clicks ── */
        document.getElementById("barea").addEventListener("click", (e) => {
          let btn = e.target.closest(".btn");
          if (!btn || !btn.dataset.a) return;
          ripple(btn, e);
          handle(btn.dataset.a);
        });

        /* ── angle toggle ── */
        achipEl.addEventListener("click", () => {
          const m = ["DEG", "RAD", "GRAD"];
          angleMode = m[(m.indexOf(angleMode) + 1) % 3];
          achipEl.textContent = angleMode;
        });

        /* ── keyboard ── */
        document.addEventListener("keydown", (e) => {
          const map = {
            0: "0",
            1: "1",
            2: "2",
            3: "3",
            4: "4",
            5: "5",
            6: "6",
            7: "7",
            8: "8",
            9: "9",
            ".": "dot",
            "+": "add",
            "-": "sub",
            "*": "mul",
            "/": "div",
            Enter: "eq",
            "=": "eq",
            Backspace: "back",
            Escape: "clear",
            "(": "oparen",
            ")": "cparen",
            "%": "pct",
            "^": "pow",
          };
          if (map[e.key]) {
            e.preventDefault();
            handle(map[e.key]);
          }
        });

        /* ── init ── */
        setDisp(0);
      })();


      Shery.mouseFollower("body")
      Shery.makeMagnet(".brand");



      // loader


//       window.addEventListener("load", ()=>{

//     const tl = gsap.timeline();

//     // Fill loading bar
//     tl.to(".progress",{
//         width:"100%",
//         duration:1.5,
//         ease:"power2.out"
//     });

//     // Fade loader away
//     tl.to("#loader",{
//         opacity:0,
//         duration:0.6
//     });

//     // Remove loader
//     tl.set("#loader",{
//         display:"none"
//     });

//     // Reveal website
//     tl.to("#main",{
//         opacity:1,
//         duration:0.5
//     });

//     // Animate calculator
//     tl.from(".calc",{
//         y:80,
//         scale:0.95,
//         opacity:0,
//         duration:1,
//         ease:"power3.out"
//     });

// });



// window.addEventListener("load",()=>{

// const lines=document.querySelectorAll(".line");

// const percent=document.querySelector(".percent");

// let tl=gsap.timeline();

// bootMessages.forEach((text,index)=>{

//     tl.to(lines[index],{

//         duration:.35,

//         onStart(){

//             lines[index].textContent="> "+text;

//         }

//     });

// });

// tl.to(".loadingFill",{

//     width:"100%",

//     duration:2,

//     ease:"power2.out",

//     onUpdate(){

//         let p=Math.round(gsap.getProperty(".loadingFill","width")/
//         document.querySelector(".loadingBar").offsetWidth*100);

//         percent.innerHTML=p+"%";

//     }

// });

// tl.to("#loader",{

//     opacity:0,

//     duration:.8

// });

// tl.set("#loader",{

//     display:"none"

// });

// tl.to("#main",{

//     opacity:1,

//     duration:.4

// });

// tl.from(".calc",{

//     y:120,

//     scale:.9,

//     opacity:0,

//     duration:1.2,

//     ease:"power4.out"

// });

// });



window.addEventListener("load", () => {

    const fill = document.querySelector(".loadingFill");
    const percent = document.querySelector(".percent");
    const lines = document.querySelectorAll(".line");

    const bootMessages = [
        "Initializing HK TECH OS...",
        "Loading Scientific Engine...",
        "Checking Memory Modules...",
        "Starting AI Core...",
        "Loading Calculator Interface...",
        "Finalizing System..."
    ];

    let tl = gsap.timeline();


    bootMessages.forEach((msg, index) => {

        tl.to(lines[index], {
            duration:0.3,
            onStart(){
                lines[index].textContent = "> " + msg;
            }
        });

    });


    tl.to(fill, {
        width:"100%",
        duration:3,
        ease:"power2.inOut",

        onUpdate:function(){

            let value = Math.round(this.progress()*100);

            percent.textContent = value + "%";

        }

    });


    tl.to("#loader",{
        opacity:0,
        duration:0.8
    });


    tl.set("#loader",{
        display:"none"
    });


    tl.to("#main",{
        opacity:1,
        duration:0.5
    });


    tl.from(".calc",{
        y:100,
        scale:0.9,
        opacity:0,
        duration:1,
        ease:"power4.out"
    });

});