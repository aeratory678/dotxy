// --- Interactive Dynamic Falling Circles Music Visualizer ---
const canvas = document.getElementById('fractal');
const ctx = canvas.getContext('2d');
let width, height;
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Audio UI
const audioUpload = document.getElementById('audio-upload');
const audioPlayer = document.getElementById('audio-player');
const audioProgress = document.getElementById('audio-progress');
const audioProgressContainer = document.getElementById('audio-progress-container');
const audioPlayPause = document.getElementById('audio-playpause');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
let audioCtx, analyser, dataArray, source;
let audioLoaded = false;
let audioDuration = 0;
let sourceCreated = false;

// Handle audio upload
audioUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('audio-filename').textContent = file.name;
    audioPlayer.src = URL.createObjectURL(file);
    audioPlayer.load();
    audioPlayer.onloadedmetadata = () => {
        audioDuration = audioPlayer.duration;
        audioProgress.style.width = '0%';
        audioPlayer.play();
        // Create MediaElementSourceNode only once
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (!sourceCreated) {
            source = audioCtx.createMediaElementSource(audioPlayer);
            sourceCreated = true;
        }
    };
    audioLoaded = true;
    playIcon.style.display = '';
    pauseIcon.style.display = 'none';
});

audioPlayPause.addEventListener('click', () => {
    if (!audioLoaded) return;
    if (audioPlayer.paused) {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        audioPlayer.play();
        playIcon.style.display = 'none';
        pauseIcon.style.display = '';
    } else {
        audioPlayer.pause();
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
    }
});

audioPlayer.addEventListener('play', () => {
    setupAudioAnalyser();
    playIcon.style.display = 'none';
    pauseIcon.style.display = '';
});
audioPlayer.addEventListener('pause', () => {
    playIcon.style.display = '';
    pauseIcon.style.display = 'none';
});

audioPlayer.addEventListener('timeupdate', () => {
    if (audioDuration > 0) {
        const percent = (audioPlayer.currentTime / audioDuration) * 100;
        audioProgress.style.width = percent + '%';
    }
});

audioProgressContainer.addEventListener('click', e => {
    if (!audioLoaded || !audioPlayer.duration) return;
    const rect = audioProgressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
});

function setupAudioAnalyser() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        if (source) {
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
        }
    }
}

function getAudioStats() {
    let avg = 0, max = 0, bass = 0, lowMid = 0, highMid = 0, treble = 0;
    if (analyser && audioPlayer.paused === false) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < dataArray.length; i++) {
            avg += dataArray[i];
            if (dataArray[i] > max) max = dataArray[i];
            if (i < dataArray.length / 8) bass += dataArray[i];
            else if (i < dataArray.length / 4) lowMid += dataArray[i];
            else if (i < dataArray.length / 2) highMid += dataArray[i];
            else if (i > (3 * dataArray.length) / 4) treble += dataArray[i];
        }
        avg /= dataArray.length;
        bass /= dataArray.length / 8;
        lowMid /= dataArray.length / 8;
        highMid /= dataArray.length / 4;
        treble /= dataArray.length / 4;
        return {
            avg: avg / 255,
            max: max / 255,
            bass: bass / 255,
            lowMid: lowMid / 255,
            highMid: highMid / 255,
            treble: treble / 255
        };
    }
    return { avg: 0.5, max: 0.5, bass: 0.5, lowMid: 0.5, highMid: 0.5, treble: 0.5 };
}

// --- Interactive Falling Circles Animation ---
const circles = [];
function spawnCircle(stats, x = null, y = null) {
    const radius = 8 + 60 * stats.bass * Math.random();
    const cx = x !== null ? x : Math.random() * (width - radius * 2) + radius;
    const cy = y !== null ? y : -radius;
    const speed = 2 + 8 * stats.avg * Math.random();
    const hue = Math.floor(360 * Math.random());
    const color = `hsl(${hue}, 80%, ${40 + 60 * stats.avg}%)`;
    const pulse = 1 + stats.max * 2.5;
    const drift = (Math.random() - 0.5) * 2 * (0.5 + stats.treble);
    circles.push({ x: cx, y: cy, radius, speed, color, vy: speed, bounce: 0, pulse, alpha: 0.8, drift });
}

canvas.addEventListener('click', e => {
    const stats = getAudioStats();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = 0; i < 3 + Math.floor(5 * stats.max); i++) {
        spawnCircle(stats, x, y);
    }
});

function updateCircles(stats) {
    for (const c of circles) {
        c.vy += 0.2 + c.pulse * 0.1; // gravity + pulse
        c.y += c.vy;
        c.x += c.drift;
        // Pulse effect
        c.radius *= 0.98;
        if (stats.max > 0.7) c.radius += 8 * Math.random();
        // Bounce at bottom
        if (c.y + c.radius > height) {
            c.y = height - c.radius;
            c.vy *= -0.6 * (0.8 + 0.4 * stats.bass); // lose energy, react to bass
            c.bounce++;
            if (Math.abs(c.vy) < 1) c.vy = 0;
        }
        // Fade out after bouncing
        if (c.bounce > 1) c.alpha *= 0.97;
    }
    // Remove circles that have faded out or stopped
    for (let i = circles.length - 1; i >= 0; i--) {
        if (circles[i].bounce > 2 && (Math.abs(circles[i].vy) < 0.5 || circles[i].alpha < 0.1)) circles.splice(i, 1);
    }
}

function drawCircles() {
    for (const c of circles) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, 2 * Math.PI);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = c.alpha;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 16 * c.pulse;
        ctx.fill();
        ctx.restore();
    }
}

function drawVisualizerDots(stats) {
    const centerX = width / 2;
    const centerY = height / 2;
    const spacing = 70;
    const dotData = [
        { value: stats.bass, color: '#ff5252' },
        { value: stats.lowMid, color: '#ffd600' },
        { value: stats.highMid, color: '#40c4ff' },
        { value: stats.treble, color: '#7c4dff' }
    ];
    for (let i = 0; i < 4; i++) {
        const { value, color } = dotData[i];
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX + (i - 1.5) * spacing, centerY, 28 + 38 * value, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = color;
        ctx.shadowBlur = 24 * value;
        ctx.fill();
        ctx.restore();
    }
}

function animate(time) {
    ctx.clearRect(0, 0, width, height);
    const stats = getAudioStats();
    // Spawn circles based on audio level and max frequency
    if (audioPlayer && !audioPlayer.paused && Math.random() < 0.18 + 0.7 * stats.max) {
        spawnCircle(stats);
    }
    updateCircles(stats);
    drawCircles();
    // Draw 4 visualizer dots in the center above the falling circles
    drawVisualizerDots(stats);
    requestAnimationFrame(animate);
}
animate(0);