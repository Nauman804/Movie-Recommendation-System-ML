// API Configuration
const API_BASE = 'http://localhost:5000';

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('.section');
const movieInput = document.getElementById('movieInput');
const suggestions = document.getElementById('suggestions');
const searchBtn = document.querySelector('.search-btn');
const recommendResults = document.getElementById('recommend-results');
const noResults = document.getElementById('no-results');

// ============================================
// Enhanced 3D Background Canvas
// ============================================

function initializeBackgroundCanvas() {
    const canvas = document.getElementById('background-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId;
    const particles = [];
    const particleCount = 50;

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw(ctx) {
            ctx.fillStyle = `rgba(139, 92, 246, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((particle, index) => {
            particle.update();
            particle.draw(ctx);

            // Draw connections between nearby particles
            particles.forEach((otherParticle, otherIndex) => {
                if (index < otherIndex) {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 * (1 - distance / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                    }
                }
            });
        });

        animationId = requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ============================================
// Navigation
// ============================================

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Show active section
        const sectionId = link.getAttribute('data-section');
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        
        // Load stats if stats section is clicked
        if (sectionId === 'stats') {
            loadStats();
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// ============================================
// Mouse Position Tracking for 3D Effects
// ============================================

let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Update 3D card effects
    document.querySelectorAll('.movie-info-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = mouseX - rect.left;
        const y = mouseY - rect.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
    });
});

// ============================================
// Movie Search & Autocomplete
// ============================================

const popularMovies = [
    'Oppenheimer', 'Barbie', 'Killers of the Flower Moon', 'Poor Things',
    'Wonka', 'May December', 'Napoleon', 'Love Actually', 'Amadeus',
    'The Pianist', 'Schindler\'s List', 'Hacksaw Ridge', '12 Years a Slave',
    'The King\'s Speech', 'Hamilton', 'Braveheart', 'Raging Bull', 'Inception'
];

movieInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase().trim();
    
    if (value.length === 0) {
        suggestions.innerHTML = '';
        return;
    }
    
    const filtered = popularMovies.filter(movie => 
        movie.toLowerCase().includes(value)
    );
    
    if (filtered.length === 0) {
        suggestions.innerHTML = '';
        return;
    }
    
    suggestions.innerHTML = filtered
        .slice(0, 5)
        .map(movie => `
            <div class="suggestion-item" onclick="selectMovie('${movie}')">
                🎬 ${movie}
            </div>
        `)
        .join('');
});

movieInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        getRecommendations();
    }
});

function selectMovie(title) {
    movieInput.value = title;
    suggestions.innerHTML = '';
    getRecommendations();
}

// ============================================
// Get Recommendations with Enhanced Animations
// ============================================

async function getRecommendations() {
    const movieTitle = movieInput.value.trim();
    
    if (!movieTitle) {
        showToast('Please enter a movie title', 'error');
        return;
    }
    
    const btn = document.querySelector('.search-btn');
    btn.classList.add('loading');
    
    try {
        const response = await fetch(`${API_BASE}/recommend?movie=${encodeURIComponent(movieTitle)}&n=8`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showNoResults();
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return;
        }
        
        const data = await response.json();
        displayRecommendations(data);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error connecting to API. Make sure Flask server is running.', 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

function displayRecommendations(data) {
    // Hide no results message
    noResults.classList.add('hidden');
    
    // Get the query movie title (close match)
    const queryMovies = data.recommendations.length > 0 ? data.query_movie : '';
    
    // Find movie info - we need to fetch it from the search endpoint
    fetchMovieInfo(data.query_movie).then(movieInfo => {
        if (movieInfo) {
            document.getElementById('queryMovieTitle').textContent = movieInfo.title;
            document.getElementById('queryMovieGenre').textContent = movieInfo.genre;
            document.getElementById('queryMovieRating').textContent = movieInfo.rating.toFixed(1);
            document.getElementById('queryMovieVotes').textContent = formatNumber(movieInfo.votes);
        }
    });
    
    // Display recommendations
    const recList = document.getElementById('recommendations-list');
    if (data.recommendations && data.recommendations.length > 0) {
        recList.innerHTML = data.recommendations.map((movie, idx) => `
            <div class="recommendation-card">
                <div class="rec-rank">#${idx + 1}</div>
                <div class="rec-title">${movie.title}</div>
                <div class="rec-genre">${movie.genre}</div>
                <div class="rec-stats">
                    <div class="rec-rating">
                        <span>⭐ ${movie.rating.toFixed(1)}</span>
                        <span>${formatNumber(movie.votes)} votes</span>
                    </div>
                    <div class="rec-score">${(movie.similarity_score * 100).toFixed(0)}%</div>
                </div>
            </div>
        `).join('');
    } else {
        showNoResults();
        return;
    }
    
    recommendResults.classList.remove('hidden');
    
    // Scroll to results with smooth animation
    setTimeout(() => {
        recommendResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    showToast(`✨ Found ${data.recommendations.length} amazing recommendations!`);
}

async function fetchMovieInfo(movieTitle) {
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(movieTitle)}&limit=1`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return data.results[0];
        }
    } catch (error) {
        console.error('Error fetching movie info:', error);
    }
    return null;
}

function showNoResults() {
    recommendResults.classList.add('hidden');
    noResults.classList.remove('hidden');
    showToast('🔍 No movie found. Try another search!', 'error');
}

// ============================================
// Search by Genre
// ============================================

async function searchByGenre() {
    const genre = document.getElementById('genreFilter').value;
    const searchBtn = document.querySelectorAll('.search-btn')[1] || document.querySelector('.search-btn');
    
    if (searchBtn) {
        searchBtn.classList.add('loading');
    }
    
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(genre)}&by=genre&limit=20`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displaySearchResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error searching for movies', 'error');
    } finally {
        if (searchBtn) {
            searchBtn.classList.remove('loading');
        }
    }
}

function displaySearchResults(data) {
    const searchResults = document.getElementById('search-results');
    const searchList = document.getElementById('search-list');
    const searchCount = document.getElementById('search-count');
    const noSearchResults = document.getElementById('search-no-results');
    
    if (data.results && data.results.length > 0) {
        noSearchResults.classList.add('hidden');
        searchCount.textContent = `${data.total_results} movies found`;
        
        searchList.innerHTML = data.results.map(movie => `
            <div class="movie-card">
                <div class="movie-card-icon">🎬</div>
                <div class="movie-card-title">${movie.title}</div>
                <div class="movie-card-genre">${movie.genre}</div>
                <div class="movie-card-rating">
                    <span>⭐ ${movie.rating.toFixed(1)}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">${formatNumber(movie.votes)}</span>
                </div>
            </div>
        `).join('');
        
        searchResults.classList.remove('hidden');
    } else {
        noSearchResults.classList.remove('hidden');
        searchResults.classList.add('hidden');
    }
    
    setTimeout(() => {
        searchResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// ============================================
// Statistics
// ============================================

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displayStats(data);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading statistics', 'error');
    }
}

function displayStats(data) {
    document.getElementById('total-movies').textContent = formatNumber(data.total_movies);
    document.getElementById('avg-rating').textContent = data.avg_rating.toFixed(2);
    document.getElementById('avg-votes').textContent = formatNumber(Math.round(data.avg_votes));
    
    const ratingRange = `${data.rating_range.min.toFixed(1)} - ${data.rating_range.max.toFixed(1)}`;
    document.getElementById('rating-range').textContent = ratingRange;
}

// ============================================
// Utility Functions
// ============================================

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ============================================
// Scroll Animations
// ============================================

function observeElements() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = getRandomAnimation();
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.recommendation-card, .movie-card, .stat-card').forEach(el => {
        observer.observe(el);
    });
}

function getRandomAnimation() {
    const animations = [
        'scaleInStagger 0.6s ease-out forwards',
        'fadeIn 0.6s ease-out forwards'
    ];
    return animations[Math.floor(Math.random() * animations.length)];
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize background canvas with particles
    initializeBackgroundCanvas();
    
    // Check if API is available
    checkAPI();
    
    // Observe elements for scroll animations
    observeElements();
    
    // Add smooth scroll behavior to all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

async function checkAPI() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            console.log('✅ API is connected');
        }
    } catch (error) {
        showToast('⚠️ API not responding. Make sure Flask server is running on http://localhost:5000', 'error');
    }
}

// ============================================
// Close suggestions when clicking outside
// ============================================

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box-container')) {
        suggestions.innerHTML = '';
    }
});

// ============================================
// Enhanced 3D Hero - Three.js with Advanced Effect
// ============================================

(() => {
    const container = document.getElementById('hero-3d');
    const fallback = document.getElementById('fallback-illustration');
    if (!container) return;

    // WebGL / Three.js availability check
    let webglAvailable = true;
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!ctx) webglAvailable = false;
    } catch (e) {
        webglAvailable = false;
    }

    if (!webglAvailable || typeof THREE === 'undefined') {
        if (fallback) fallback.style.display = 'block';
        return;
    }
    if (fallback) fallback.style.display = 'none';

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(renderer.domElement);

    // Enhanced lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(5, 5, 5);
    const pointLight = new THREE.PointLight(0x8b5cf6, 1, 100);
    pointLight.position.set(-5, -5, 5);
    scene.add(amb, dir, pointLight);

    // Enhanced material with metalness
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.15,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.3
    });

    // Create TorusKnot geometry
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.35, 220, 32);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Add orbit controls for interactivity
    if (typeof THREE.OrbitControls !== 'undefined') {
        try {
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.autoRotate = true;
            controls.autoRotateSpeed = 3;
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enableZoom = false;
        } catch (e) {
            console.log('OrbitControls not available');
        }
    }

    // Advanced particles with glow effect
    const particlesGeometry = new THREE.BufferGeometry();
    const count = 1000;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ 
        color: 0x8b5cf6, 
        size: 0.05, 
        opacity: 0.8, 
        transparent: true,
        sizeAttenuation: true
    });
    const points = new THREE.Points(particlesGeometry, pMat);
    scene.add(points);

    // Resize handling
    function onResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Animation loop
    const speedMultiplier = 1.2;
    let last = performance.now();

    function animate(now) {
        const dt = Math.min((now - last) / 1000, 0.016);
        last = now;

        // Mesh rotation with mouse interaction
        mesh.rotation.x += dt * 0.4 * speedMultiplier + mouseX * 0.3;
        mesh.rotation.y += dt * 0.6 * speedMultiplier + mouseY * 0.3;

        // Particle motion
        points.rotation.y += dt * 0.05 * speedMultiplier;

        // Material emissive intensity pulsing
        material.emissiveIntensity = 0.3 + Math.sin(now * 0.001) * 0.2;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    last = performance.now();
    requestAnimationFrame(animate);
})();
