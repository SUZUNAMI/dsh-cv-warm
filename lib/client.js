// dsh-cv-warm -- client bundle (hand-written __ModuleLoader__ factory).
//
// Two halves:
//   1. CSS: transcript markdown containers get content-visibility:auto, so offscreen
//      blocks skip layout and compositing (this is what makes session switches and
//      streaming cheap on transcripts with thousands of KaTeX formulas).
//   2. JS: an IntersectionObserver keeps a band around the viewport (default 200% of
//      the scrollport) switched to content-visibility:visible, so a block is rendered
//      BEFORE the user scrolls it into view instead of during the scroll frame.
//      Blocks leaving the band fall back to auto so nothing accumulates as visible.
//
// VERIFY: window.__cvWarm -> { installed: true, blocks, warmed }
// DISABLE: window.__cvWarm.off()

window.__ModuleLoader__.load({
	id: "dsh-cv-warm",
	factory: () => {
		var module = { exports: {} };
		var exports = module.exports;

		const name = "dsh-cv-warm";
		const inject = [];
		const STYLE_ID = "dsh-cv-warm-style";
		const ROOT_SELECTOR = "[data-conversation-scroll]";
		const BLOCK_SELECTOR = '[class*="markdown"]';
		const BAND = "200% 0px";

		let io = null;
		let mo = null;
		let root = null;
		let style = null;
		let warmed = 0;
		const observed = new WeakSet();

		function ensureStyle() {
			if (style !== null && style.isConnected) return;
			style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = [
				ROOT_SELECTOR + " " + BLOCK_SELECTOR + " {",
				"  content-visibility: auto;",
				"  contain-intrinsic-size: auto 800px;",
				"}",
				ROOT_SELECTOR + " " + BLOCK_SELECTOR + "[data-cv-warm] {",
				"  content-visibility: visible !important;",
				"}",
			].join("\n");
			document.head.appendChild(style);
		}

		function register(el) {
			if (observed.has(el)) return;
			observed.add(el);
			try { io.observe(el); } catch {}
		}

		function scan() {
			const next = document.querySelector(ROOT_SELECTOR);
			if (next !== root) {
				root = next;
				if (mo !== null) { try { mo.disconnect(); } catch {} mo = null; }
				if (root !== null && io !== null) {
					mo = new MutationObserver(() => queueScan());
					try { mo.observe(root, { childList: true, subtree: true }); } catch {}
				}
			}
			if (root === null) return;
			for (const el of root.querySelectorAll(BLOCK_SELECTOR)) register(el);
		}

		let queued = false;
		function queueScan() {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => { queued = false; scan(); });
		}

		function start() {
			ensureStyle();
			if (typeof IntersectionObserver === "function") {
				io = new IntersectionObserver((entries) => {
					for (const entry of entries) {
						const el = entry.target;
						if (!(el instanceof HTMLElement)) continue;
						if (entry.isIntersecting) {
							if (!el.hasAttribute("data-cv-warm")) {
								el.setAttribute("data-cv-warm", "");
								warmed += 1;
							}
						} else if (el.hasAttribute("data-cv-warm")) {
							el.removeAttribute("data-cv-warm");
						}
					}
				}, {
					root: null,
					rootMargin: BAND,
					threshold: 0,
				});
			}
			scan();
			// 首屏可能还没挂载完成，补几轮
			let tries = 0;
			const timer = setInterval(() => {
				tries += 1;
				scan();
				if (tries >= 20 || root !== null) clearInterval(timer);
			}, 500);
			window.__cvWarm = {
				installed: true,
				version: 1,
				get blocks() { return root === null ? 0 : root.querySelectorAll(BLOCK_SELECTOR).length; },
				get warmed() { return warmed; },
				run: scan,
				off() {
					if (io !== null) { try { io.disconnect(); } catch {} io = null; }
					if (mo !== null) { try { mo.disconnect(); } catch {} mo = null; }
					if (style !== null && style.isConnected) style.remove();
					delete window.__cvWarm;
				},
			};
			console.info("[" + name + "] installed: offscreen blocks skip layout, " + BAND + " band is pre-warmed");
		}

		function apply() { start(); }
		start();

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	},
});
