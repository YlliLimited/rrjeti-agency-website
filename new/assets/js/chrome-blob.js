/* =========================================================
   Liquid chrome (three.js from jsDelivr via the import map).
   - loads only after the page has finished loading and the
     browser is idle, so it never slows the first paint
   - skipped on phones, slow connections, data saver and
     reduced motion: the CSS .chrome shape shows instead
   - custom "photo studio" environment = crisp black/white
     chrome reflections with a teal and blue rim light
   ========================================================= */
const host = document.querySelector('[data-chrome]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const slow = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
const small = window.matchMedia('(max-width: 760px)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

if (host && !reduce && !slow && !small && webglOK()) {
  const start = () => (window.requestIdleCallback || (cb => setTimeout(cb, 400)))(() => init().catch(() => {}), { timeout: 2500 });
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
}

async function init() {
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  /* ---- studio environment: dark room + soft-box strips ---- */
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y*0.5+0.5; vec3 top = vec3(0.52,0.55,0.58); vec3 mid = vec3(0.02,0.022,0.026); vec3 bot = vec3(0.2,0.23,0.25); vec3 c = h>0.5 ? mix(mid, top, smoothstep(0.5,1.0,h)) : mix(bot, mid, smoothstep(0.0,0.5,h)); gl_FragColor = vec4(c,1.0); }'
    })
  ));
  const panel = (w, h, color, intensity, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); env.add(m);
  };
  panel(14, 0.9, 0xffffff, 5, [0, 7, -2], [Math.PI / 2, 0, 0]);       // overhead strip
  panel(1.2, 10, 0xffffff, 3.2, [-8, 1, 2], [0, Math.PI / 2, 0]);      // left soft-box
  panel(0.7, 10, 0xffffff, 2.6, [8, 0, -1], [0, -Math.PI / 2, 0]);     // right strip
  panel(6, 3, 0x1FAAAA, 2.2, [-3, -5, 4], [-Math.PI / 3, 0, 0]);    // teal floor bounce
  panel(4, 2, 0x3E6BFF, 1.6, [5, -3, 5], [-Math.PI / 4, -0.6, 0]);   // blue kicker
  panel(2, 2, 0xffffff, 1.4, [0, 0, 9], [0, Math.PI, 0]);            // front fill
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(env, 0.02).texture;

  const scene = new THREE.Scene();
  scene.environment = envTex;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.035,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.35,
    iridescence: 0.12, iridescenceIOR: 1.4
  });

  const geo = new THREE.SphereGeometry(1.22, 192, 192);
  const base = geo.attributes.position.array.slice();
  const blob = new THREE.Mesh(geo, chrome); scene.add(blob);

  const geo2 = new THREE.SphereGeometry(0.4, 96, 96);
  const base2 = geo2.attributes.position.array.slice();
  const drop = new THREE.Mesh(geo2, chrome); drop.position.set(1.5, -1.08, 0.4); scene.add(drop);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.1, 64, 200), chrome);
  ring.position.set(-1.4, 1.05, 0.2); scene.add(ring);

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 48, 48), chrome);
  bead.position.set(-1.15, -1.28, 0.8); scene.add(bead);

  // smooth, low-frequency "liquid" motion (no lumpy noise)
  function displace(g, src, t, amp, f) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = src[i], y = src[i + 1], z = src[i + 2];
      const n = Math.sin(x * f + t) * Math.cos(y * f * 0.9 + t * 0.8) * 0.6
              + Math.sin(z * f * 1.1 - t * 0.7 + x * 0.6) * 0.4;
      const s = 1 + amp * n;
      p[i] = x * s; p[i + 1] = y * s * 0.94; p[i + 2] = z * s;
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
  }

  let mx = 0, my = 0, tx = 0, ty = 0, sy = 0;
  window.addEventListener('pointermove', e => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  window.addEventListener('scroll', () => { sy = window.scrollY; }, { passive: true });

  function resize() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  host.appendChild(renderer.domElement);
  new ResizeObserver(resize).observe(host); resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  const clock = new THREE.Clock();
  (function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    const sp = Math.min(sy / 700, 1);
    displace(geo, base, t * 0.7, 0.11, 1.35);
    displace(geo2, base2, t * 1.0, 0.08, 2.4);
    blob.rotation.y = t * 0.12 + mx * 0.8 + sp * 1.2;
    blob.rotation.x = -0.25 + my * 0.6;
    blob.position.y = sp * 0.35;
    drop.position.y = -1.08 + Math.sin(t * 0.9) * 0.12 - sp * 0.4;
    drop.rotation.y = -t * 0.3;
    ring.rotation.x = 0.9 + Math.sin(t * 0.5) * 0.25 + my * 0.4 + sp * 0.8;
    ring.rotation.y = t * 0.35 + mx * 0.6;
    ring.position.y = 1.05 + Math.sin(t * 0.7 + 1) * 0.1 + sp * 0.5;
    bead.position.y = -1.28 + Math.sin(t * 1.2 + 2) * 0.08;
    renderer.render(scene, camera);
  })();
  requestAnimationFrame(() => host.classList.add('webgl'));
}
