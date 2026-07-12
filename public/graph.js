// Minimal force-directed graph renderer, no dependencies. Reads node/edge
// data from a <script type="application/json"> sibling, simulates a
// spring/repulsion layout on <canvas>, and supports dragging nodes and
// clicking nodes that carry a `url` (opens it in a new tab).
(function () {
  const canvas = document.getElementById("skills-graph");
  if (!canvas) return;

  const dataEl = document.getElementById("skills-graph-data");
  const graph = JSON.parse(dataEl.textContent);
  if (!graph.nodes.length) return;

  const ctx = canvas.getContext("2d");
  const DPR = window.devicePixelRatio || 1;

  function cssWidth() {
    return canvas.getBoundingClientRect().width;
  }
  function cssHeight() {
    return canvas.getBoundingClientRect().height;
  }

  function resize() {
    const w = cssWidth();
    const h = cssHeight();
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // The root (GitHub account) node starts at dead center; everything else
  // starts scattered nearby and gets pulled into place by the simulation.
  const nodes = graph.nodes.map((n) => {
    const isRoot = n.type === "root";
    return {
      ...n,
      x: cssWidth() / 2 + (isRoot ? 0 : (Math.random() - 0.5) * 160),
      y: cssHeight() / 2 + (isRoot ? 0 : (Math.random() - 0.5) * 160),
      vx: 0,
      vy: 0,
    };
  });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges = graph.edges
    .map((e) => ({ source: nodeById.get(e.source), target: nodeById.get(e.target) }))
    .filter((e) => e.source && e.target);

  const RADIUS = { root: 22, category: 16, language: 10, project: 5 };
  const PALETTE = {
    light: {
      node: { root: "#0d1b2a", category: "#1a5fb4", language: "#5b9bd9", project: "#a9c4e0" },
      edge: "#d8d8d8",
      label: "#1a1a1a",
    },
    dark: {
      node: { root: "#e8e8e8", category: "#7aa9e0", language: "#5588c2", project: "#3a5a80" },
      edge: "#3a4048",
      label: "#e8e8e8",
    },
  };
  function currentPalette() {
    return document.documentElement.dataset.theme === "dark" ? PALETTE.dark : PALETTE.light;
  }
  const REST_LENGTH = 70;

  let dragNode = null;
  let pressNode = null;
  let pressPos = null;

  function step() {
    const cx = cssWidth() / 2;
    const cy = cssHeight() / 2;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const distSq = Math.max(dx * dx + dy * dy, 25);
        const force = 1400 / distSq;
        const dist = Math.sqrt(distSq);
        dx /= dist;
        dy /= dist;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      }
    }

    for (const e of edges) {
      let dx = e.target.x - e.source.x;
      let dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist - REST_LENGTH) * 0.02;
      dx /= dist;
      dy /= dist;
      e.source.vx += dx * force;
      e.source.vy += dy * force;
      e.target.vx -= dx * force;
      e.target.vy -= dy * force;
    }

    for (const n of nodes) {
      if (n === dragNode) continue;
      n.vx += (cx - n.x) * 0.001;
      n.vy += (cy - n.y) * 0.001;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  function draw() {
    const palette = currentPalette();
    ctx.clearRect(0, 0, cssWidth(), cssHeight());

    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 1;
    for (const e of edges) {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      ctx.stroke();
    }

    for (const n of nodes) {
      const r = RADIUS[n.type] || 6;
      ctx.beginPath();
      ctx.fillStyle = palette.node[n.type] || "#999";
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.label;
      ctx.font = n.type === "root" || n.type === "category" ? "bold 12px sans-serif" : "11px sans-serif";
      ctx.fillText(n.label, n.x + r + 4, n.y + 4);
    }
  }

  function loop() {
    step();
    draw();
    requestAnimationFrame(loop);
  }
  loop();

  function nodeAt(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = (RADIUS[n.type] || 6) + 4;
      if ((n.x - x) ** 2 + (n.y - y) ** 2 <= r * r) return n;
    }
    return null;
  }

  function pointerPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const point = evt.changedTouches ? evt.changedTouches[0] : evt.touches ? evt.touches[0] : evt;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  const CLICK_DRIFT_THRESHOLD = 6;

  function handlePressStart(x, y) {
    const node = nodeAt(x, y);
    pressNode = node;
    pressPos = { x, y };
    dragNode = node;
  }

  function handleRelease(x, y) {
    if (pressNode && pressPos) {
      const drifted = Math.hypot(x - pressPos.x, y - pressPos.y) > CLICK_DRIFT_THRESHOLD;
      if (!drifted && pressNode.url) {
        window.open(pressNode.url, "_blank", "noopener");
      }
    }
    dragNode = null;
    pressNode = null;
    pressPos = null;
  }

  canvas.addEventListener("mousedown", (evt) => {
    const { x, y } = pointerPos(evt);
    handlePressStart(x, y);
  });
  canvas.addEventListener("touchstart", (evt) => {
    const { x, y } = pointerPos(evt);
    handlePressStart(x, y);
    if (dragNode) evt.preventDefault();
  });

  window.addEventListener("mousemove", (evt) => {
    if (!dragNode) return;
    const { x, y } = pointerPos(evt);
    dragNode.x = x;
    dragNode.y = y;
    dragNode.vx = 0;
    dragNode.vy = 0;
  });
  window.addEventListener(
    "touchmove",
    (evt) => {
      if (!dragNode) return;
      const { x, y } = pointerPos(evt);
      dragNode.x = x;
      dragNode.y = y;
      dragNode.vx = 0;
      dragNode.vy = 0;
      evt.preventDefault();
    },
    { passive: false }
  );

  window.addEventListener("mouseup", (evt) => {
    const { x, y } = pointerPos(evt);
    handleRelease(x, y);
  });
  window.addEventListener("touchend", (evt) => {
    const { x, y } = pointerPos(evt);
    handleRelease(x, y);
  });

  // Hover feedback: pointer cursor over clickable (url-bearing) nodes,
  // grab cursor over draggable ones, default otherwise.
  canvas.addEventListener("mousemove", (evt) => {
    if (dragNode) {
      canvas.style.cursor = "grabbing";
      return;
    }
    const { x, y } = pointerPos(evt);
    const hovered = nodeAt(x, y);
    canvas.style.cursor = hovered ? (hovered.url ? "pointer" : "grab") : "default";
  });
})();
