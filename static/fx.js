// Animations and easter eggs for licia13.github.io
;(() => {
  if (window.__ltfx) return
  window.__ltfx = true

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
  const root = document.documentElement
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim()

  const store = {
    get(k) {
      try {
        return JSON.parse(localStorage.getItem(k))
      } catch {
        return null
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v))
      } catch {}
    },
  }

  // ---------- toast + egg tracker ----------
  const EGGS = {
    konami: "Launch sequence",
    swarm: "Swarm formation",
    ciao: "Ciao!",
    swimrun: "Island to island",
    flood: "Early warning",
    autopilot: "Autopilot",
    takeoff: "Console pilot",
  }
  const TOTAL = Object.keys(EGGS).length
  const found = new Set((store.get("lt-eggs") || []).filter((k) => k in EGGS))

  const toastBox = document.createElement("div")
  toastBox.className = "lt-toasts"
  root.appendChild(toastBox)

  function toast(text, ms = 3200) {
    const t = document.createElement("div")
    t.className = "lt-toast"
    t.textContent = text
    toastBox.appendChild(t)
    requestAnimationFrame(() => t.classList.add("on"))
    setTimeout(() => {
      t.classList.remove("on")
      setTimeout(() => t.remove(), 500)
    }, ms)
  }

  function egg(id) {
    const isNew = !found.has(id)
    found.add(id)
    store.set("lt-eggs", [...found])
    toast(`${isNew ? "Easter egg found" : "Found again"}: ${EGGS[id]} · ${found.size}/${TOTAL}`)
    if (isNew && found.size === TOTAL) {
      setTimeout(() => {
        toast("All 7 found. You are officially part of the swarm. Tell me: tauriellolicia@gmail.com", 6000)
        confetti(["#276EF1", "#05944F", "#FFC043", "#E11900"], 260)
      }, 2600)
    }
  }

  // ---------- particle overlay ----------
  const pc = document.createElement("canvas")
  pc.className = "lt-particles"
  root.appendChild(pc)
  const px = pc.getContext("2d")
  let parts = []
  let partsRunning = false

  function sizeCanvas(c) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = innerWidth * dpr
    c.height = innerHeight * dpr
    c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function addParticle(p) {
    parts.push(p)
    if (!partsRunning) {
      partsRunning = true
      requestAnimationFrame(stepParticles)
    }
  }

  function stepParticles() {
    px.clearRect(0, 0, innerWidth, innerHeight)
    parts = parts.filter((p) => p.life > 0)
    for (const p of parts) {
      p.vy += p.g
      p.vx *= p.drag
      p.vy *= p.drag
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.life -= 1
      px.globalAlpha = Math.min(1, p.life / 30)
      px.fillStyle = p.color
      if (p.shape === "rect") {
        px.save()
        px.translate(p.x, p.y)
        px.rotate(p.rot)
        px.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        px.restore()
      } else {
        px.beginPath()
        px.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        px.fill()
      }
    }
    px.globalAlpha = 1
    if (parts.length) requestAnimationFrame(stepParticles)
    else partsRunning = false
  }

  function confetti(colors, n = 180, x = innerWidth / 2, y = innerHeight * 0.35) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 4 + Math.random() * 9
      addParticle({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 4,
        g: 0.18,
        drag: 0.985,
        size: 7 + Math.random() * 7,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.3,
        life: 110 + Math.random() * 60,
        color: colors[i % colors.length],
        shape: "rect",
      })
    }
  }

  function smoke(x, y) {
    for (let i = 0; i < 3; i++) {
      addParticle({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.2 - 1,
        vy: 1 + Math.random() * 1.5,
        g: -0.02,
        drag: 0.97,
        size: 4 + Math.random() * 8,
        rot: 0,
        vr: 0,
        life: 50 + Math.random() * 30,
        color: Math.random() < 0.3 ? "#FFC043" : "rgba(160,160,160,0.6)",
        shape: "circle",
      })
    }
  }

  // ---------- drone swarm background (boids) ----------
  const sc = document.createElement("canvas")
  sc.className = "lt-swarm"
  root.appendChild(sc)
  const sx = sc.getContext("2d")
  const mouse = { x: -1e4, y: -1e4, t: 0 }
  let boids = []
  let formation = false
  let color = "#276EF1"
  let frame = 0

  function baseCount() {
    const home = document.body.dataset.slug === "index"
    const small = innerWidth < 700
    return Math.round((home ? 90 : 40) * (small ? 0.5 : 1))
  }

  function spawn(x = Math.random() * innerWidth, y = Math.random() * innerHeight) {
    const a = Math.random() * Math.PI * 2
    return { x, y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, t: null }
  }

  function fitSwarm() {
    const n = formation ? boids.length : baseCount()
    while (boids.length < n) boids.push(spawn())
    if (boids.length > n) boids.length = n
  }

  function stepSwarm() {
    if (document.hidden) return requestAnimationFrame(stepSwarm)
    if (frame++ % 60 === 0) color = cssVar("--secondary") || color
    sx.clearRect(0, 0, innerWidth, innerHeight)
    const mouseLive = performance.now() - mouse.t < 1500
    for (const b of boids) {
      let ax = 0,
        ay = 0
      if (b.t) {
        // fly to formation slot
        const dx = b.t.x - b.x,
          dy = b.t.y - b.y
        ax += dx * 0.02 - b.vx * 0.12
        ay += dy * 0.02 - b.vy * 0.12
      } else {
        let cx = 0,
          cy = 0,
          avx = 0,
          avy = 0,
          sepx = 0,
          sepy = 0,
          n = 0
        for (const o of boids) {
          if (o === b) continue
          const dx = o.x - b.x,
            dy = o.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 3600) {
            n++
            cx += o.x
            cy += o.y
            avx += o.vx
            avy += o.vy
            if (d2 < 400) {
              sepx -= dx / (d2 + 1)
              sepy -= dy / (d2 + 1)
            }
          }
        }
        if (n) {
          ax += (cx / n - b.x) * 0.0006 + (avx / n - b.vx) * 0.03
          ay += (cy / n - b.y) * 0.0006 + (avy / n - b.vy) * 0.03
        }
        ax += sepx * 1.2
        ay += sepy * 1.2
        // gesture control: the swarm follows your cursor
        if (mouseLive) {
          const dx = mouse.x - b.x,
            dy = mouse.y - b.y
          const d = Math.hypot(dx, dy)
          if (d > 50 && d < 420) {
            ax += (dx / d) * 0.05
            ay += (dy / d) * 0.05
          }
        }
      }
      b.vx += ax
      b.vy += ay
      const sp = Math.hypot(b.vx, b.vy)
      const max = b.t ? 9 : 2.4
      if (sp > max) {
        b.vx = (b.vx / sp) * max
        b.vy = (b.vy / sp) * max
      } else if (!b.t && sp < 0.8) {
        b.vx *= 1.1
        b.vy *= 1.1
      }
      b.x += b.vx
      b.y += b.vy
      if (!b.t) {
        if (b.x < -10) b.x = innerWidth + 10
        if (b.x > innerWidth + 10) b.x = -10
        if (b.y < -10) b.y = innerHeight + 10
        if (b.y > innerHeight + 10) b.y = -10
      }
      // tiny quadcopter: body + 4 rotors
      const h = Math.atan2(b.vy, b.vx)
      sx.save()
      sx.translate(b.x, b.y)
      sx.rotate(h + Math.PI / 4)
      sx.fillStyle = color
      sx.fillRect(-1.5, -1.5, 3, 3)
      sx.globalAlpha = 0.7
      for (const [rx, ry] of [
        [-4, -4],
        [4, -4],
        [-4, 4],
        [4, 4],
      ]) {
        sx.beginPath()
        sx.arc(rx, ry, 2, 0, Math.PI * 2)
        sx.fill()
      }
      sx.restore()
    }
    drawFlyers()
    requestAnimationFrame(stepSwarm)
  }

  // ---------- other things in the sky: airliners, paper planes, satellites ----------
  let flyers = []
  let nextFlyer = performance.now() + 2500
  const AIRLINER = [
    [16, 0], [13, -1.8], [4, -1.8], [-3, -13], [-6.5, -13], [-2, -1.8], [-11, -1.8], [-15, -6],
    [-17, -6], [-15.5, 0], [-17, 6], [-15, 6], [-11, 1.8], [-2, 1.8], [-6.5, 13], [-3, 13],
    [4, 1.8], [13, 1.8],
  ]

  function spawnFlyer() {
    const r = Math.random()
    const ltr = Math.random() < 0.5
    const W = innerWidth,
      H = innerHeight
    if (r < 0.5) {
      // airliner at cruise, straight line with a contrail
      const y0 = H * (0.08 + Math.random() * 0.6)
      const y1 = y0 + (Math.random() - 0.5) * H * 0.3
      flyers.push({
        kind: "airliner",
        x: ltr ? -40 : W + 40,
        y: y0,
        h: Math.atan2(y1 - y0, ltr ? W : -W),
        v: 1.3 + Math.random() * 0.6,
        size: 0.9 + Math.random() * 0.5,
        trail: [],
      })
    } else if (r < 0.8) {
      // paper plane that wobbles and sometimes loops
      flyers.push({
        kind: "paper",
        x: ltr ? -30 : W + 30,
        y: H * (0.2 + Math.random() * 0.6),
        base: ltr ? 0 : Math.PI,
        h: ltr ? 0 : Math.PI,
        v: 2.2,
        t: 0,
        loopAt: 120 + Math.random() * 200,
        loop: 0,
        trail: [],
      })
    } else {
      // satellite crossing slowly on an arc, blinking
      flyers.push({
        kind: "satellite",
        t: 0,
        ltr,
        dur: 1400,
        x: 0,
        y: 0,
        cy: H * (0.25 + Math.random() * 0.3),
        trail: [],
      })
    }
  }

  function drawFlyers() {
    const now = performance.now()
    if (now > nextFlyer && flyers.length < 3 && !formation) {
      spawnFlyer()
      nextFlyer = now + 5000 + Math.random() * 9000
    }
    const ink = cssVar("--darkgray") || "#4e4e4e"
    const W = innerWidth,
      H = innerHeight
    for (const f of flyers) {
      if (f.kind === "airliner") {
        f.x += Math.cos(f.h) * f.v
        f.y += Math.sin(f.h) * f.v
      } else if (f.kind === "paper") {
        f.t++
        if (f.t > f.loopAt && f.loop === 0) f.loop = 1
        if (f.loop > 0 && f.loop < 90) {
          f.loop++
          f.h -= (Math.PI * 2) / 90
        } else {
          f.h = f.base + Math.sin(f.t / 25) * 0.25
        }
        f.x += Math.cos(f.h) * f.v
        f.y += Math.sin(f.h) * f.v
      } else {
        f.t++
        const k = f.t / f.dur
        f.x = f.ltr ? -30 + (W + 60) * k : W + 30 - (W + 60) * k
        f.y = f.cy + Math.pow((k - 0.5) * 2, 2) * H * 0.18
        f.h = 0
      }
      f.trail.push([f.x, f.y])
      if (f.trail.length > (f.kind === "airliner" ? 140 : 50)) f.trail.shift()

      // trail
      sx.save()
      sx.strokeStyle = ink
      sx.lineCap = "round"
      if (f.kind === "airliner") {
        // two contrails from the engines
        for (const off of [-5, 5]) {
          sx.beginPath()
          f.trail.forEach(([x, y], i) => {
            const px = x - Math.sin(f.h) * off * f.size,
              py = y + Math.cos(f.h) * off * f.size
            i ? sx.lineTo(px, py) : sx.moveTo(px, py)
          })
          sx.globalAlpha = 0.35
          sx.lineWidth = 1.5
          sx.stroke()
        }
      } else {
        sx.setLineDash(f.kind === "paper" ? [3, 5] : [1, 6])
        sx.beginPath()
        f.trail.forEach(([x, y], i) => (i ? sx.lineTo(x, y) : sx.moveTo(x, y)))
        sx.globalAlpha = 0.5
        sx.lineWidth = 1.2
        sx.stroke()
      }
      sx.restore()

      // body
      sx.save()
      sx.translate(f.x, f.y)
      sx.rotate(f.h)
      sx.fillStyle = ink
      sx.strokeStyle = ink
      if (f.kind === "airliner") {
        sx.scale(f.size, f.size)
        sx.beginPath()
        AIRLINER.forEach(([x, y], i) => (i ? sx.lineTo(x, y) : sx.moveTo(x, y)))
        sx.closePath()
        sx.fill()
      } else if (f.kind === "paper") {
        sx.beginPath()
        sx.moveTo(12, 0)
        sx.lineTo(-9, -8)
        sx.lineTo(-4, 0)
        sx.lineTo(-9, 8)
        sx.closePath()
        sx.globalAlpha = 0.85
        sx.fill()
        sx.beginPath()
        sx.moveTo(12, 0)
        sx.lineTo(-4, 0)
        sx.strokeStyle = cssVar("--light") || "#fff"
        sx.stroke()
      } else {
        sx.fillRect(-3, -3, 6, 6)
        sx.fillRect(-15, -2, 10, 4)
        sx.fillRect(5, -2, 10, 4)
        sx.fillRect(-0.5, -8, 1, 5)
        if (Math.floor(f.t / 30) % 2) {
          sx.fillStyle = "#E11900"
          sx.beginPath()
          sx.arc(0, -9, 1.8, 0, Math.PI * 2)
          sx.fill()
        }
      }
      sx.restore()
    }
    flyers = flyers.filter(
      (f) =>
        (f.kind === "satellite" && f.t < f.dur) ||
        (f.kind !== "satellite" && f.x > -80 && f.x < W + 80 && f.y > -80 && f.y < H + 80),
    )
  }

  function formLetters(text) {
    const oc = document.createElement("canvas")
    const w = Math.min(innerWidth * 0.8, 900)
    oc.width = w
    oc.height = w * 0.45
    const o = oc.getContext("2d")
    o.fillStyle = "#000"
    o.font = `900 ${oc.height * 0.9}px Figtree, sans-serif`
    o.textAlign = "center"
    o.textBaseline = "middle"
    o.fillText(text, oc.width / 2, oc.height / 2)
    const data = o.getImageData(0, 0, oc.width, oc.height).data
    const pts = []
    const step = Math.max(7, Math.round(w / 90))
    for (let y = 0; y < oc.height; y += step)
      for (let x = 0; x < oc.width; x += step)
        if (data[(y * oc.width + x) * 4 + 3] > 128)
          pts.push({ x: x + (innerWidth - oc.width) / 2, y: y + (innerHeight - oc.height) / 2 })
    formation = true
    sc.classList.add("formation")
    while (boids.length < pts.length) boids.push(spawn(Math.random() < 0.5 ? -20 : innerWidth + 20))
    pts.sort(() => Math.random() - 0.5)
    boids.forEach((b, i) => (b.t = pts[i] || null))
    setTimeout(() => {
      boids.forEach((b) => {
        b.t = null
        b.vx = (Math.random() - 0.5) * 12
        b.vy = (Math.random() - 0.5) * 12
      })
      formation = false
      sc.classList.remove("formation")
      setTimeout(fitSwarm, 2500)
    }, 5000)
  }

  function resize() {
    sizeCanvas(sc)
    sizeCanvas(pc)
  }
  addEventListener("resize", resize)
  resize()
  fitSwarm()
  if (!reduce) requestAnimationFrame(stepSwarm)
  else sc.style.display = "none"

  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
    mouse.t = performance.now()
  })
  addEventListener("pointerdown", (e) => {
    // scatter the swarm
    for (const b of boids) {
      const dx = b.x - e.clientX,
        dy = b.y - e.clientY
      const d = Math.hypot(dx, dy)
      if (d < 220 && !b.t) {
        b.vx += (dx / (d + 1)) * 8
        b.vy += (dy / (d + 1)) * 8
      }
    }
  })

  // ---------- egg: konami code, rocket launch ----------
  function launchRocket() {
    const r = document.createElement("div")
    r.className = "lt-rocket"
    r.innerHTML = `<svg viewBox="0 0 24 52" width="26" height="56" aria-hidden="true"><path d="M12 1 C19 9 19 22 17 34 H7 C5 22 5 9 12 1 Z" fill="#e8e8e8" stroke="#333" stroke-width="1.2"/><circle cx="12" cy="16" r="3.2" fill="#276EF1" stroke="#333"/><path d="M7 27 L2 38 L7 35 Z M17 27 L22 38 L17 35 Z" fill="#E11900" stroke="#333" stroke-width="1"/><path d="M9 35 Q12 50 15 35 Z" fill="#FFC043"/></svg>`
    root.appendChild(r)
    root.classList.add("lt-shake")
    setTimeout(() => root.classList.remove("lt-shake"), 600)
    const start = performance.now()
    const dur = 2600
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur)
      const e = k * k
      const x = innerWidth * (0.08 + 0.9 * e)
      const y = innerHeight * (1.05 - 1.3 * e)
      r.style.transform = `translate(${x}px, ${y}px) rotate(45deg)`
      smoke(x + 8, y + 40)
      if (k < 1) requestAnimationFrame(tick)
      else r.remove()
    }
    requestAnimationFrame(tick)
  }

  // ---------- egg: swimrun, island to island ----------
  const ISLANDS = [
    [0, 0.22],
    [0.38, 0.6],
    [0.78, 1],
  ]
  const RUNNER_SVG = `<svg viewBox="0 0 32 40" width="34" height="42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="20" cy="6" r="4" fill="currentColor" stroke="none"/><path d="M18 12 L14 24 L22 32 M14 24 L8 36 M17 15 L25 19 M17 15 L9 18"/></svg>`
  const SWIMMER_SVG = `<svg viewBox="0 0 44 24" width="46" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="37" cy="10" r="4" fill="currentColor" stroke="none"/><path d="M31 12 L10 13 L2 10 M10 13 L3 16 M28 11 Q30 2 38 3"/></svg>`
  function swimrun() {
    const scene = document.createElement("div")
    scene.className = "lt-swimrun"
    scene.innerHTML = `
      <div class="lt-sea"></div>
      <svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
        ${ISLANDS.map(([a, b]) => {
          const x0 = a * 1000,
            x1 = b * 1000,
            m = (x0 + x1) / 2
          return `<path d="M${x0} 120 Q${x0 + 20} 70 ${m - 60} 60 Q${m} 30 ${m + 60} 55 Q${x1 - 20} 70 ${x1} 120 Z"/>`
        }).join("")}
      </svg>
      <div class="lt-runner"></div>
      <div class="lt-km">run</div>`
    root.appendChild(scene)
    requestAnimationFrame(() => scene.classList.add("on"))
    const runner = scene.querySelector(".lt-runner")
    const label = scene.querySelector(".lt-km")
    const start = performance.now()
    const dur = 7000
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur)
      const x = -60 + (innerWidth + 120) * k
      const f = (x + 20) / innerWidth
      const onLand = ISLANDS.some(([a, b]) => f >= a && f <= b) || f < 0 || f > 1
      const pose = onLand ? "run" : "swim"
      if (runner.dataset.pose !== pose) {
        runner.dataset.pose = pose
        runner.innerHTML = onLand ? RUNNER_SVG : SWIMMER_SVG
      }
      const bob = onLand ? Math.abs(Math.sin(k * 70)) * -8 : Math.sin(k * 40) * 3 + 26
      runner.style.transform = `translateX(${x}px) translateY(${bob}px)`
      label.style.transform = `translateX(${Math.min(Math.max(x, 0), innerWidth - label.offsetWidth - 16)}px)`
      label.textContent = onLand ? "run" : "swim"
      if (k < 1) requestAnimationFrame(tick)
      else {
        label.textContent = "ÖTILLÖ Swimrun Gothenburg · 2024 & 2026"
        setTimeout(() => {
          scene.classList.remove("on")
          setTimeout(() => scene.remove(), 800)
        }, 1800)
      }
    }
    requestAnimationFrame(tick)
  }

  // ---------- egg: flood early warning ----------
  function flood() {
    const w = document.createElement("div")
    w.className = "lt-flood"
    w.innerHTML = `
      <div class="lt-water"><svg viewBox="0 0 1200 40" preserveAspectRatio="none"><path d="M0 20 Q150 0 300 20 T600 20 T900 20 T1200 20 V40 H0 Z"/></svg></div>
      <div class="lt-radio"><span><svg viewBox="0 0 48 40" width="64" height="54" aria-hidden="true"><path d="M8 12 L34 2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="3" y="12" width="42" height="26" rx="5" fill="currentColor"/><circle cx="16" cy="25" r="7" fill="var(--light)"/><rect x="28" y="19" width="12" height="3" rx="1.5" fill="var(--light)"/><rect x="28" y="26" width="12" height="3" rx="1.5" fill="var(--light)"/></svg></span><i></i><i></i><i></i>
        <p>Flood alert: broadcast on community radio.<br><small>SiagaFlood, 2026: reaching people SMS can't.</small></p></div>`
    root.appendChild(w)
    requestAnimationFrame(() => w.classList.add("on"))
    setTimeout(() => {
      w.classList.remove("on")
      setTimeout(() => w.remove(), 1500)
    }, 4800)
  }

  // ---------- egg: autopilot (click the site title 5 times) ----------
  let apOn = false
  let apTimer
  let apMove
  function autopilot() {
    if (apOn) return
    apOn = true
    const ap = document.createElement("div")
    ap.className = "lt-ap"
    ap.innerHTML = `
      <div class="lt-ap-banner">A/P ENGAGED · CMD A</div>
      <svg class="lt-adi" viewBox="-100 -100 200 200">
        <defs><clipPath id="lt-adi-clip"><circle r="92"/></clipPath></defs>
        <g clip-path="url(#lt-adi-clip)"><g class="lt-horizon">
          <rect x="-300" y="-300" width="600" height="300" fill="#3b82c4"/>
          <rect x="-300" y="0" width="600" height="300" fill="#8a5a2b"/>
          <line x1="-300" y1="0" x2="300" y2="0" stroke="#fff" stroke-width="2"/>
          ${[-20, -10, 10, 20].map((p) => `<line x1="-${p % 20 ? 15 : 25}" y1="${p * 2}" x2="${p % 20 ? 15 : 25}" y2="${p * 2}" stroke="#fff" stroke-width="1.5"/>`).join("")}
        </g></g>
        <circle r="92" fill="none" stroke="#222" stroke-width="10"/>
        <path d="M-55 0 H-18 L-10 8 M55 0 H18 L10 8" stroke="#FFC043" stroke-width="5" fill="none"/>
        <circle r="3" fill="#FFC043"/>
      </svg>
      <div class="lt-ap-hint">Move the mouse to fly · Esc to disconnect</div>`
    root.appendChild(ap)
    requestAnimationFrame(() => ap.classList.add("on"))
    const horizon = ap.querySelector(".lt-horizon")
    apMove = (e) => {
      const bank = (e.clientX / innerWidth - 0.5) * 50
      const pitch = (e.clientY / innerHeight - 0.5) * 50
      horizon.setAttribute("transform", `rotate(${-bank}) translate(0 ${pitch})`)
      document.body.style.transform = `rotate(${bank * 0.08}deg)`
    }
    addEventListener("pointermove", apMove)
    apTimer = setTimeout(() => disconnect(ap), 15000)
    ap.disconnect = () => disconnect(ap)
    autopilot.current = ap
  }
  function disconnect(ap) {
    if (!apOn) return
    apOn = false
    clearTimeout(apTimer)
    removeEventListener("pointermove", apMove)
    document.body.style.transform = ""
    const banner = ap.querySelector(".lt-ap-banner")
    banner.textContent = "A/P DISCONNECT"
    banner.classList.add("warn")
    setTimeout(() => {
      ap.classList.remove("on")
      setTimeout(() => ap.remove(), 600)
    }, 1800)
  }

  let titleClicks = []
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest(".page-title")) return
      const now = performance.now()
      titleClicks = titleClicks.filter((t) => now - t < 3000)
      titleClicks.push(now)
      if (titleClicks.length >= 5) {
        titleClicks = []
        autopilot()
        egg("autopilot")
      }
    },
    true,
  )

  // ---------- keyboard eggs ----------
  const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"]
  let keys = []
  let typed = ""
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase()
    if (k === "escape" && apOn && autopilot.current) autopilot.current.disconnect()
    const el = document.activeElement
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
    keys = [...keys, k].slice(-KONAMI.length)
    if (keys.join() === KONAMI.join()) {
      keys = []
      launchRocket()
      egg("konami")
      setTimeout(() => toast("Skyward Experimental Rocketry, Politecnico di Milano · 2017–2019"), 1400)
    }
    if (k.length !== 1) return
    typed = (typed + k).slice(-12)
    if (typed.endsWith("swarm")) {
      formLetters("LT")
      egg("swarm")
    } else if (typed.endsWith("ciao")) {
      ciao()
      egg("ciao")
    } else if (typed.endsWith("swimrun")) {
      swimrun()
      egg("swimrun")
    } else if (typed.endsWith("flood")) {
      flood()
      egg("flood")
    }
  })

  function ciao() {
    confetti(["#009246", "#FFFFFF", "#CE2B37"], 220)
    const b = document.createElement("div")
    b.className = "lt-ciao"
    b.textContent = "Ciao!"
    root.appendChild(b)
    setTimeout(() => b.remove(), 2200)
  }

  // ---------- console egg ----------
  window.takeoff = () => {
    launchRocket()
    egg("takeoff")
    return "Cleared for takeoff."
  }
  console.log(
    `%c
      o---o
      | o |    hi, curious one.
      o---o    this site hides 7 easter eggs.
               you just found the console, so here's one: type takeoff()
               hints: a famous cheat code · a word that flies together ·
               a greeting from Italy · a race from island to island · rising water · a title that likes clicks
`,
    "color:#276EF1;font-family:monospace",
  )

  // ---------- per-page effects (run on every navigation) ----------
  const SCRAMBLE = "!<>-_\\/[]{}—=+*^?#01"
  function scramble(el) {
    if (reduce || !el || el.dataset.scrambled) return
    el.dataset.scrambled = "1"
    const final = el.textContent
    const start = performance.now()
    const dur = 700
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur)
      const n = Math.floor(final.length * k)
      el.textContent =
        final.slice(0, n) +
        [...final.slice(n)].map((c) => (c === " " ? " " : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0])).join("")
      if (k < 1) requestAnimationFrame(tick)
      else el.textContent = final
    }
    requestAnimationFrame(tick)
  }

  function rotator(el) {
    if (el.dataset.running) return
    el.dataset.running = "1"
    const words = el.dataset.words.split("|")
    let i = 0
    let shown = words[0]
    el.textContent = shown
    if (reduce) return
    const loop = async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      while (el.isConnected) {
        await wait(1800)
        while (shown.length) {
          shown = shown.slice(0, -1)
          el.textContent = shown
          await wait(35)
        }
        i = (i + 1) % words.length
        for (const c of words[i]) {
          shown += c
          el.textContent = shown
          await wait(70)
        }
      }
    }
    loop()
  }

  let io
  function reveal() {
    if (reduce) return
    io?.disconnect()
    io = new IntersectionObserver(
      (entries) => {
        let i = 0
        for (const en of entries) {
          if (!en.isIntersecting) continue
          en.target.style.transitionDelay = `${(i++ % 8) * 70}ms`
          en.target.classList.add("lt-in")
          io.unobserve(en.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    )
    const article = document.querySelector("article")
    if (!article) return
    const body = article.querySelector(".markdown-preview-view, .markdown-rendered") || article
    const els = body.querySelectorAll(":scope > *, :scope > ul > li")
    for (const el of els) {
      el.classList.add("lt-reveal")
      io.observe(el)
    }
    // never leave text hidden if the observer misses something
    setTimeout(() => els.forEach((el) => el.classList.add("lt-in")), 2500)
  }

  function tilt() {
    for (const card of document.querySelectorAll("article ul:not(.contains-task-list) > li")) {
      if (card.dataset.tilt) continue
      card.dataset.tilt = "1"
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        card.style.setProperty("--rx", `${-y * 6}deg`)
        card.style.setProperty("--ry", `${x * 6}deg`)
      })
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg")
        card.style.setProperty("--ry", "0deg")
      })
    }
  }

  const bar = document.createElement("div")
  bar.className = "lt-progress"
  root.appendChild(bar)
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
  }
  addEventListener("scroll", onScroll, { passive: true })

  function perPage() {
    scramble(document.querySelector("h1.article-title"))
    document.querySelectorAll(".lt-rotator[data-words]").forEach(rotator)
    reveal()
    if (!reduce) tilt()
    fitSwarm()
    onScroll()
  }
  document.addEventListener("nav", perPage)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", perPage)
  else perPage()
})()
