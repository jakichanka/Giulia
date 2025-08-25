(function () {
  const qs = new URLSearchParams(window.location.search);
  const groom = (qs.get('m') || 'Илья').trim();
  const bride = (qs.get('w') || 'Екатерина').trim();
  const expire = (qs.get('date') || '').trim();

  // Render names
  const coupleTitle = document.getElementById('coupleTitle');
  coupleTitle.textContent = `${groom} и ${bride},`;

  // Deadline line
  const deadlineLine = document.getElementById('deadlineLine');
  const deadlineDateEl = document.getElementById('deadlineDate');
  if (expire) {
    const dt = parseInputDate(expire);
    if (dt) {
      const formatted = formatHumanDate(dt);
      deadlineDateEl.textContent = formatted;
      deadlineLine.hidden = false;
    }
  }

  // Prefill modal inputs
  document.getElementById('groomInput').value = groom;
  document.getElementById('brideInput').value = bride;

  // Buttons: only online now

  const modal = document.getElementById('formModal');
  const onlineBtn = document.getElementById('onlineBtn');
  const closeModal = document.getElementById('closeModal');
  const lockX = () => {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
  };
  onlineBtn.addEventListener('click', () => { modal.showModal(); lockX(); });
  closeModal.addEventListener('click', () => { modal.close(); lockX(); });

  // Submit form: simulate sending by saving file and closing
  document.getElementById('questionnaireForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const obj = Object.fromEntries(data.entries());
    // Generate PDF and send
    generateAndSendPdf(obj, groom, bride)
      .then(() => { modal.close(); alert('Анкета отправлена!'); })
      .catch((err) => { console.error(err); alert('Не удалось отправить. Попробуйте позже.'); });
  });

  // Hearts wow effect
  seedHearts();
  runConfetti();

  // Utilities
  function buildQuestionnaireText(obj) {
    return [
      `Анкета подготовки к свадьбе`,
      `============================`,
      `Имя жениха: ${obj.groom || ''}`,
      `Имя невесты: ${obj.bride || ''}`,
      `Дата свадьбы: ${obj.wedding_date || ''}`,
      `Время церемонии: ${obj.ceremony_time || ''}`,
      `Площадка / адрес: ${obj.venue || ''}`,
      `Количество гостей: ${obj.guests || ''}`,
      `Контакт для связи: ${obj.contact || ''}`,
      `Музыкальные предпочтения: ${obj.music || ''}`,
      `Самое важное в этом дне:`,
      `${obj.priorities || ''}`,
      `Комментарии и пожелания:`,
      `${obj.notes || ''}`,
      `\nСпасибо!`
    ].join('\n');
  }

  async function generateAndSendPdf(obj, groomDefault, brideDefault) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const maxWidth = 515; // A4 width (595pt) - margins
    const title = 'Анкета подготовки к свадьбе';
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, margin, margin);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    const lines = [
      `Имя жениха: ${obj.groom || groomDefault || ''}`,
      `Имя невесты: ${obj.bride || brideDefault || ''}`,
      `Дата свадьбы: ${obj.wedding_date || ''}`,
      `Время церемонии: ${obj.ceremony_time || ''}`,
      `Площадка / адрес: ${obj.venue || ''}`,
      `Количество гостей: ${obj.guests || ''}`,
      `Контакт для связи: ${obj.contact || ''}`,
      `Музыкальные предпочтения: ${obj.music || ''}`,
      `Самое важное в этом дне:`,
      `${obj.priorities || ''}`,
      `Комментарии и пожелания:`,
      `${obj.notes || ''}`,
    ];

    let cursorY = margin + 24;
    for (const row of lines) {
      const splitted = doc.splitTextToSize(row, maxWidth);
      for (const ln of splitted) {
        if (cursorY > 800) { doc.addPage(); cursorY = margin; }
        doc.text(ln, margin, cursorY);
        cursorY += 18;
      }
      cursorY += 6;
    }

    const blob = doc.output('blob');
    const arrayBuffer = await blob.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const fileName = `Анкета_${obj.groom || groomDefault}_${obj.bride || brideDefault}.pdf`;

    const res = await fetch('/.netlify/functions/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64, fileName, groom: obj.groom || groomDefault || '', bride: obj.bride || brideDefault || '' })
    });
    if (!res.ok) throw new Error('Send failed');
  }

  function parseInputDate(s) {
    // Normalize and accept multiple common formats. Resolve to LOCAL end-of-day.
    const v = (s || '').trim();
    // YYYY-MM-DD or YYYY-M-D
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return endOfDayLocal(new Date(y, mo, d));
    }
    // DD.MM.YYYY or D.M.YYYY
    m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const y = Number(m[3]);
      return endOfDayLocal(new Date(y, mo, d));
    }
    // DD/MM/YYYY or DD-MM-YYYY
    m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const y = Number(m[3]);
      return endOfDayLocal(new Date(y, mo, d));
    }
    // Russian month name: "28 августа 2025"
    const rus = v.toLowerCase().match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})$/i);
    if (rus) {
      const d = Number(rus[1]);
      const monthToken = rus[2];
      const y = Number(rus[3]);
      const months = [
        'январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл',
        'август', 'сентябр', 'октябр', 'ноябр', 'декабр'
      ];
      const idx = months.findIndex((p) => monthToken.startsWith(p));
      if (idx >= 0) return endOfDayLocal(new Date(y, idx, d));
    }
    // Fallback: Date parser. If it contains explicit time, keep it; otherwise normalize to end-of-day local.
    const n = new Date(v);
    if (!isNaN(n.getTime())) {
      const hasTime = /\d{1,2}:\d{2}/.test(v);
      if (hasTime) return n;
      return endOfDayLocal(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
    }
    return null;
  }

  function endOfDayLocal(dt) {
    dt.setHours(23, 59, 59, 999);
    return dt;
  }

  function formatHumanDate(date) {
    const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
    return formatter.format(date);
  }

  

  function seedHearts() {
    const container = document.getElementById('hearts-layer');
    const heartsCount = Math.min(26, Math.max(12, Math.floor(window.innerWidth / 50)));
    for (let i = 0; i < heartsCount; i++) {
      const el = document.createElement('div');
      el.className = 'heart';
      const size = 10 + Math.random() * 24; // px
      const left = Math.random() * 100; // vw
      const delay = Math.random() * 6; // s
      const duration = 10 + Math.random() * 16; // s
      const hue = 330 + Math.random() * 20;
      el.style.setProperty('--size', `${size}px`);
      el.style.left = `${left}vw`;
      el.style.bottom = `${-20 - Math.random() * 40}px`;
      el.style.animationDuration = `${duration}s`;
      el.style.animationDelay = `${delay}s`;
      el.style.filter = `drop-shadow(0 6px 10px hsla(${hue},60%,60%,.22))`;
      container.appendChild(el);
    }
  }

  // Confetti burst (one-time on load)
  function runConfetti() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = Math.floor(window.innerWidth * dpr);
    let height = Math.floor(window.innerHeight * dpr);
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '5';
    document.body.appendChild(canvas);

    const colors = ['#ff7aa2', '#ffc371', '#ffd26f', '#ffffff', '#c84b7b', '#a83f69'];
    const count = Math.min(240, Math.max(120, Math.floor(window.innerWidth / 4)));
    const cx = width / 2;
    const cy = Math.max(height * 0.28, height * 0.22);
    const particles = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (220 + Math.random() * 380) * dpr; // px/s
      const size = 5 + Math.random() * 10;
      const w = size * (0.6 + Math.random() * 0.8);
      const h = size * (1.0 + Math.random() * 1.6);
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ax: 0,
        ay: 900 * dpr, // gravity px/s^2
        rot: Math.random() * Math.PI,
        rotVel: (-2 + Math.random() * 4), // rad/s
        w, h,
        color: colors[(Math.random() * colors.length) | 0],
        life: 0,
        ttl: 2.6 + Math.random() * 1.0 // seconds
      });
    }

    let lastTs = performance.now();
    let rafId = 0;
    function frame(ts) {
      const dt = Math.min(0.033, (ts - lastTs) / 1000);
      lastTs = ts;
      ctx.clearRect(0, 0, width, height);

      let alive = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += dt;
        if (p.life > p.ttl) continue;
        alive++;
        // integrate
        p.vx *= 0.995; // light drag
        p.vy = p.vy * 0.995 + p.ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.rotVel * dt;

        // draw
        const alpha = Math.max(0, 1 - Math.max(0, p.life - p.ttl * 0.7) / (p.ttl * 0.3));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (alive > 0) {
        rafId = requestAnimationFrame(frame);
      } else {
        cleanup();
      }
    }

    function cleanup() {
      cancelAnimationFrame(rafId);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    // Just in case of rapid resizes during the short lifetime
    const onResize = () => {
      width = Math.floor(window.innerWidth * dpr);
      height = Math.floor(window.innerHeight * dpr);
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', onResize, { passive: true });
    setTimeout(() => window.removeEventListener('resize', onResize), 4500);

    requestAnimationFrame(frame);
  }
})();


